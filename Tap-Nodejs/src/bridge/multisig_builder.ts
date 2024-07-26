import {
    initEccLib,
    Signer,
} from "bitcoinjs-lib";
import * as bitcoin from 'bitcoinjs-lib';
import { broadcast, pushBlock, pushTrans, getUTXOfromTx } from "../rpc/bitcoin_rpc.js";
import { ECPairFactory, ECPairAPI } from 'ecpair';
import { Taptree } from "bitcoinjs-lib/src/types";
import { asm_builder, asm_csv } from "../taproot/taproot_script_builder.js"
import { IUTXO, toXOnly } from "../taproot/utils.js"
import * as tinysecp from 'tiny-secp256k1'


initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const LEAF_VERSION_TAPSCRIPT = 192;

/**
 * Get a mutli-sig taproot account
 *
 * @param {Signer} keypair - The keypair used as internal pubkeys
 * @param {Signer[]} keys - The keypair used to sign the transaction
 * @param {number} keynum - number of required keys
 * @param {number} threshold - The threshold of the wallet
 * @param {number} locktime - The relatively locking time/block
 * @param {string} network - The network used for taproot address
 * @returns {p2tr_scripts, p2csvtr, utxos} - return the multi-sig redeem script, CSV redeem script, UTXOs
 */
export async function get_taproot_bridge(keypair: Signer, keys: any[], keynum: number, threshold: number, locktime: number, network: bitcoin.Network) {
    const internalKey = keypair;
    const Threshold = threshold;
    const KeyNum = keynum;
    const Locktime = locktime;

    // All input have to be signed
    // So generated some random private key to sign
    const leafKeys = [];
    const leafPubkeys = [];
    const pubkeys = [];
    for (let i = 0; i < KeyNum; i++) {
        const leafKey: Signer = keys[i];
        leafKeys.push(leafKey);
        pubkeys.push(toXOnly(leafKey.publicKey))
        leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
    }

    const leafScript = asm_builder(leafPubkeys, Threshold);
    const csvScript = asm_csv(Locktime, toXOnly(keypair.publicKey).toString('hex'))

    const scriptTree: Taptree = [
        {
            output: bitcoin.script.fromASM(
                '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0 OP_CHECKSIG',
            ),
        },
        [
            {
                output: csvScript,
            },
            {
                output: leafScript,
            },
        ],
    ];

    const redeem = {
        output: leafScript,
        redeemVersion: LEAF_VERSION_TAPSCRIPT,
    };
    const redeem_csv = {
        output: csvScript,
        redeemVersion: LEAF_VERSION_TAPSCRIPT,
    };

    const p2pktr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(internalKey.publicKey),
        scriptTree,
        redeem,
        network,
        pubkeys,
        m: KeyNum,
        n: Threshold
    });

    const p2csvtr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(internalKey.publicKey),
        scriptTree,
        redeem: redeem_csv,
        network,
    });

    const p2pktr_addr = p2pktr.address ?? "";
    console.log(`Add 0.2 bitcoin to this Address: ${p2pktr_addr}`)

    let temp_trans = await pushTrans(p2pktr_addr)
    console.log("The new txid is:", temp_trans)

    const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr)
    console.log(`The UTXO is ${utxos.txid}:${utxos.vout}`);

    return [p2pktr, p2csvtr, utxos];
}

/**
 * Pay/Unlock a mutli-sig taproot account
 *
 * @param {string} network - The network used for taproot address
 * @param {IUTXO} utxo - The utxo used as input
 * @param {any} p2pktr - The taproot account
 * @param {Signer[]} keys - The keypair used to sign the transaction
 * @param {number} threshold - The threshold of the wallet
 * @param {Buffer[]} pubkeys - The pubkeys that create the taproot account (don't need privat key)
 * @returns { string } - return the txid.
 */
export async function pay_sig(network: any, utxos: any, p2pktr: any, keys: Signer[], threshold: number, pubkeys: Buffer[]) {

    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: p2pktr.output! },
    });

    psbt.updateInput(0, {
        tapLeafScript: [
            {
                leafVersion: p2pktr.redeem.redeemVersion,
                script: p2pktr.redeem.output,
                controlBlock: p2pktr.witness![p2pktr.witness!.length - 1],
            },
        ],
    });

    // transactionbuilder should not used
    // psbt.extractTransaction().dump()

    psbt.addOutput({ value: utxos.value - 150, address: p2pktr.address! });

    // Threshold signers
    for (var i = 0; i < keys.length; i++) {
        psbt.signInput(0, keys[i]);
    }
    // Uselss signers
    if (keys.length < threshold) {
        for (let i = 0; i < psbt.data.inputs.length; i++) {
            for (let j = keys.length; j < threshold; j++) {
                psbt.data.inputs[i].tapScriptSig?.push({
                    leafHash: psbt.data.inputs[i].tapScriptSig![0].leafHash,
                    pubkey: toXOnly(pubkeys[j]),
                    signature: Buffer.from("")
                });
            }
        }
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    console.log("Broadcasting Transaction:", tx.getId());
    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    // await pushBlock(p2pktr.address!)

    return tx.getId();
}

/**
 * Pay/Unlock a CSV leafscript of a taproot account
 *
 * @param {string} network - The network used for taproot address
 * @param {IUTXO[]} utxos - The utxos used as input
 * @param {any} p2csvtr - The taproot account
 * @param {Signer} keypair - The keypair used to sign the transaction
 * @param {number} Locktime - The relatively locking time/block
 * @returns {string} - return the txid
 */
export async function pay_csv(network: any, utxos: any, p2csvtr: any, keypair: Signer, Locktime: number) {
    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        sequence: Locktime,
        witnessUtxo: { value: utxos.value, script: p2csvtr.output! },
    });

    psbt.updateInput(0, {
        tapLeafScript: [
            {
                leafVersion: p2csvtr.redeem.redeemVersion,
                script: p2csvtr.redeem.output,
                controlBlock: p2csvtr.witness![p2csvtr.witness!.length - 1],
            },
        ],
    });

    psbt.addOutput({ value: utxos.value - 150, address: p2csvtr.address! });

    // Only one signers
    psbt.signInput(0, keypair);

    // finalize and send out tx
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    // Assume we have waited and unlock!
    // for (var i = 0; i < Locktime; i++) {
    //     await pushBlock(p2csvtr.address!)
    // }

    // const txHex = await broadcast(tx.toHex());
    // console.log(`Success! TxHex is ${txHex}`);

    // let tx_verify = await getUTXOfromTx(tx.getId(), p2csvtr.address!)
    // console.log(`Get UTXO ${tx_verify}`);

    // await pushBlock(p2csvtr.address!)

    return tx.getId();
}

/**
 * Get a mutli-sig leafscript of a taproot account
 *
 * @param {Signer} keypair - The keypair used as internal pubkeys
 * @param {Signer[]} keys - The keypair used to sign the transaction
 * @param {number} keynum - number of required keys
 * @param {number} threshold - The threshold of the wallet
 * @param {number} locktime - The relatively locking time/block
 * @param {string} network - The network used for taproot address
 * @returns {p2tr_scripts, p2csvtr, utxos, combinations} - return the multi-sig redeem script, CSV redeem script, UTXOs and the combinations
 */
export async function get_taproot_bridge_multi_leaf(keypair: Signer, keys: any[], keynum: number, threshold: number, locktime: number, network: bitcoin.Network) {
    const internalKey = keypair;
    const KeyNum = keynum;

    // All input have to be signed
    // So generated some random private key to sign
    const leafKeys = [];
    const leafPubkeys = [];
    for (let i = 0; i < KeyNum; i++) {
        const leafKey: Signer = keys[i];
        leafKeys.push(leafKey);
        leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
    }

    // Generate leaf keys and public keys in X-only format
    // There is a wired type-conversion problem to prevent this easy way
    // const leafPubkeys = keys.map(key => toXOnly(key.publicKey).toString('hex'));
    // Generate all possible m-of-m combinations of the public keys
    // toXOnly(key_first.publicKey).toString('hex')
    const combinations = getCombinations(leafPubkeys, threshold);

    console.log(combinations)

    // Build Taptree from combinations
    const scriptTree = buildTaptree(combinations, threshold);

    // Add the CSV script as a leaf
    const csvScript = asm_csv(locktime, toXOnly(keypair.publicKey).toString('hex'));
    const csvLeaf = { output: csvScript };

    // Final Taptree with CSV script included
    const finalTree: Taptree = [scriptTree, csvLeaf];

    const redeemScripts = combinations.map(combination => {
        return {
            output: asm_builder(combination, threshold),
            redeemVersion: LEAF_VERSION_TAPSCRIPT,
        };
    });

    const p2tr_scripts = redeemScripts.map(redeem => {
        return bitcoin.payments.p2tr({
            internalPubkey: toXOnly(internalKey.publicKey),
            scriptTree: finalTree,
            redeem,
            network,
        });
    });

    const redeem_csv = {
        output: csvScript,
        redeemVersion: LEAF_VERSION_TAPSCRIPT,
    };

    const p2csvtr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(internalKey.publicKey),
        scriptTree: finalTree,
        redeem: redeem_csv,
        network,
    });

    const p2pktr_addr = p2csvtr.address ?? "";
    console.log(`Add 0.2 bitcoin to this Address: ${p2pktr_addr}`)

    let temp_trans = await pushTrans(p2pktr_addr)
    console.log("The new txid is:", temp_trans)

    const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr)
    console.log(`The UTXO is ${utxos.txid}:${utxos.vout}`);

    return [p2tr_scripts, p2csvtr, utxos, combinations];
}

/**
 * Pay/Unlock a mutli-sig leafscript of a taproot account
 *
 * @param {string} network - The network used for taproot address
 * @param {IUTXO[]} utxos - The utxos used as input
 * @param {any[]} p2pktr - The taproot account
 * @param {Signer[]} keys - The keypair used to sign the transaction
 * @param {number} locker - The locking index of the taproot redeem leafscript
 * @returns { string } - return the txid.
 */
export async function pay_sig_multi_leaf(network: any, utxos: any, p2pktr: any[], keys: Signer[], locker: number) {

    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: p2pktr[locker].output! },
    });

    psbt.updateInput(0, {
        tapLeafScript: [
            {
                leafVersion: p2pktr[locker].redeem.redeemVersion,
                script: p2pktr[locker].redeem.output,
                controlBlock: p2pktr[locker].witness![p2pktr[locker].witness.length - 1],
            },
        ],
    });

    // transactionbuilder should not used
    // psbt.extractTransaction().dump()

    psbt.addOutput({ value: utxos.value - 150, address: p2pktr[locker].address! });

    console.log(toXOnly(keys[0].publicKey).toString('hex'))

    // Threshold signers
    for (var i = 0; i < keys.length; i++) {
        psbt.signInput(0, keys[i]);
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    console.log("Broadcasting Transaction:", tx.getId());
    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    // await pushBlock(p2pktr[locker].address!)

    return tx.getId();
}

/**
 * Helper function to generate all m-of-m combinations
 *
 * @param {any[]} arr - The keypair used in the generation
 * @param {number} threshold - The threshold of the wallet
 * @returns { any[] } - return pubkeys.
 */
function getCombinations(arr: any[], threshold: number) {
    const combinations: any[] = [];
    function combine(start: number, choose_: number, chosen: any[]) {
        if (choose_ == 0) {
            combinations.push(chosen);
            return;
        }
        for (let i = start; i <= arr.length - choose_; i++) {
            combine(i + 1, choose_ - 1, chosen.concat([arr[i]]));
        }
    }
    combine(0, threshold, []);
    return combinations;
}

/**
 * Build a Taptree from given combinations
 *
 * @param {any[]} combinations - The keypair used in the generation
 * @param {number} threshold - The threshold of the wallet
 * @returns { Taptree } - return the taptree.
 */
function buildTaptree(combinations: any[], threshold: number) {
    const leaves = combinations.map((combination: any[]) => {
        return { output: asm_builder(combination, threshold) };
    });

    function buildTree(leaves: Taptree[]): Taptree {
        if (leaves.length === 1) {
            return leaves[0]; // Single leaf, just return it
        }
        const newLeaves: Taptree[] = [];
        for (let i = 0; i < leaves.length; i += 2) {
            if (i + 1 < leaves.length) {
                newLeaves.push([leaves[i], leaves[i + 1]]);
            } else {
                newLeaves.push(leaves[i]); // Odd number of leaves, push the last one as is
            }
        }
        return buildTree(newLeaves); // Recursively build up the tree
    }

    return buildTree(leaves);
}