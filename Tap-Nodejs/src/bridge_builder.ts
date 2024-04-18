import {
    initEccLib,
    Signer,
} from "bitcoinjs-lib";
import * as bitcoin from 'bitcoinjs-lib';
import { broadcast, pushBlock, pushTrans, getUTXOfromTx } from "./RPC.js";
import { ECPairFactory, ECPairAPI } from 'ecpair';
import { Taptree } from "bitcoinjs-lib/src/types";
import { asm_builder, asm_csv } from "./taproot_builder.js"
import { toXOnly } from "./utils.js"
import * as tinysecp from 'tiny-secp256k1'


initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const LEAF_VERSION_TAPSCRIPT = 192;

export async function get_taproot_bridge(keypair: Signer, keys: any[], keynum: number, threshold: number, locktime: number, network: bitcoin.Network) {
    const internalKey = keypair;
    const Threshold = threshold;
    const KeyNum = keynum;
    const Locktime = locktime;

    // All input have to be signed
    // So generated some random private key to sign
    const leafKeys = [];
    const leafPubkeys = [];
    for (let i = 0; i < KeyNum; i++) {
        const leafKey: Signer = keys[i];
        leafKeys.push(leafKey);
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

export async function pay_sig(network: any, utxos: any, p2pktr: any, keys: Signer[], threshold: number) {

    const leafKeys_useless = [];
    for (let i = 0; i < threshold; i++) {
        leafKeys_useless.push(ECPair.makeRandom({ network }));
    }

    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: p2pktr.output! },
    });

    console.log(p2pktr)
    console.log(p2pktr.witness)
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
        for (var i = keys.length; i < threshold; i++) {
            psbt.signInput(0, leafKeys_useless[i]);
        }
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    console.log("Broadcasting Transaction:", tx.getId());
    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    await pushBlock(p2pktr.address!)
}

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

    // Assume we have waited and unlock
    for (var i = 0; i < Locktime; i++) {
        await pushBlock(p2csvtr.address!)
    }

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    let tx_verify = await getUTXOfromTx(tx.getId(), p2csvtr.address!)
    console.log(`Get UTXO ${tx_verify}`);

    await pushBlock(p2csvtr.address!)
}

// Under testing
export async function get_taproot_bridge_multi_leaf(keypair: Signer, keys: any[], keynum: number, threshold: number, locktime: number, network: bitcoin.Network, key_first: Signer) {
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

export async function pay_sig_multi_leaf(network: any, utxos: any, p2pktr: any[], keys: Signer[], threshold: number, locker: number) {

    const leafKeys_useless = [];
    for (let i = 0; i < threshold; i++) {
        leafKeys_useless.push(ECPair.makeRandom({ network }));
    }

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
    // Uselss signers
    if (keys.length < threshold) {
        for (var i = keys.length; i < threshold; i++) {
            psbt.signInput(0, leafKeys_useless[i]);
        }
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    console.log("Broadcasting Transaction:", tx.getId());
    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    await pushBlock(p2pktr[locker].address!)
}

// Helper function to generate all m-of-m combinations
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

// Build a Taptree from given combinations
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