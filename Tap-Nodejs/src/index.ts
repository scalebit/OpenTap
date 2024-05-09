import {
    initEccLib,
    networks,
    script,
    Signer,
    payments,
    crypto,
    Psbt,
    Transaction,
} from "bitcoinjs-lib";
import * as bitcoin from 'bitcoinjs-lib';
import { broadcast, waitUntilUTXO, pushBlock, pushTrans, getUTXOfromTx, broadcastraw, getALLUTXOfromTx } from "./taproot/bitcoin_rpc.js";
import { ECPairFactory, ECPairAPI, TinySecp256k1Interface, ECPairInterface } from 'ecpair';
import { Taptree } from "bitcoinjs-lib/src/types";
import { test1, test2, get_agg_keypair, get_agg_pub, get_agg_sign, get_option } from "./bridge/musig_process.js"
import * as tinysecp from 'tiny-secp256k1'
import { Buff } from '@cmdcode/buff'
import { schnorr } from '@noble/curves/secp256k1'
import { regtest } from "bitcoinjs-lib/src/networks.js";
import { toXOnly, tweakSigner, IUTXO, Config } from "./taproot/utils.js"
import { asm_builder, asm_csv, } from "./taproot/taproot_builder.js"
import { get_taproot_bridge, pay_sig, pay_csv, get_taproot_bridge_multi_leaf, pay_sig_multi_leaf } from "./bridge/bridge_builder.js"
import * as fs from 'fs';

// const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const network = networks.regtest;
const LEAF_VERSION_TAPSCRIPT = 192;

async function start() {
    // Stable Pair
    const keypair = ECPair.fromWIF("cPBwBXauJpeC2Q2CB99xtzrtA1fRDAyqApySv2QvhYCbmMsTGYy7", network)

    // Classic Multisig
    // await bridge_unit(keypair)

    // Privacy Multisig
    // await bridge_unit_mulit_leaf(keypair, 1)

    // Workflow
    // await bridge_workflow(keypair)

    // Musig
    // await start_musig_txbuilder()

    // Create a Taproot Bridge
    // await bridge_create_and_dump()

    // Multisig pay
    // await bridge_unlock_with_dump(1)

    // Escape hatch
    // await bridge_unlock_with_dump(2)
}

// Basic test
async function start_p2pktr(keypair: Signer) {
    console.log(`Running "Pay to Pubkey with taproot example"`);

    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });
    // Generate an address from the tweaked public key
    const p2pktr = payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });
    const p2pktr_addr = p2pktr.address ?? "";
    
    console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`)

    let temp_trans = await pushTrans(p2pktr_addr)
    console.log("the new txid is:", temp_trans)

    await pushBlock(p2pktr_addr)

    const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: p2pktr.output! },
        tapInternalKey: toXOnly(keypair.publicKey)
    });

    psbt.addOutput({
        address: "bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", // main wallet address 
        value: utxos.value - 150
    });

    // Auto-Sign
    psbt.signInput(0, tweakedSigner);

    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(tx)

    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    // generate new block to lookup
    await pushBlock(p2pktr_addr)
}

// Musig test
async function start_musig_txbuilder() {
    let wallets = get_agg_keypair(5);
    let options = get_option(wallets);
    let pub = get_agg_pub(wallets, options);

    console.log('Testing schnorr tx.');

    // Generate an address from the tweaked public key
    const p2pktr = payments.p2tr({
        pubkey: Buffer.from(pub, 'hex'),
        network
    });

    const p2pktr_addr = p2pktr.address ?? "";
    console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`);

    // Push transaction but not confirm
    let temp_trans = await pushTrans(p2pktr_addr);
    console.log("the new txid is:", temp_trans);

    // Get UTXO
    const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr);
    const all_utxos = await getALLUTXOfromTx(temp_trans, p2pktr_addr);
    // console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    // Building a new transaction
    let transaction = new Transaction(); // Assuming you have defined network
    transaction.addInput(Buffer.from(utxos.txid, 'hex').reverse(), utxos.vout);

    const scriptPubKey = bitcoin.address.toOutputScript("bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", network);
    transaction.addOutput(scriptPubKey, utxos.value - 200);

    let prevOutScript: any[] = []
    let prevValue: any[] = []
    for (var i = 0; i < all_utxos.length; i++) {
        prevOutScript.push(bitcoin.address.toOutputScript(all_utxos[i].address, network));
        prevValue.push(all_utxos[i].value)
    }

    let p1 = bitcoin.address.toOutputScript(all_utxos[0].address, network)
    let p2 = bitcoin.address.toOutputScript(all_utxos[1].address, network)

    let v1 = all_utxos[0].value
    let v2 = all_utxos[1].value

    // const prevOutScript = ;
    // const prevOutScript2 = bitcoin.address.toOutputScript(p2pktr_addr, network);

    let signatureHash = transaction.hashForWitnessV1(0, [p2], [v2], Transaction.SIGHASH_DEFAULT);
    let sign: Buff = get_agg_sign(wallets, options, signatureHash);

    let tapKeySig = Buffer.from(sign); // Ensure the signature is in the correct format

    transaction.ins[0].witness = [tapKeySig];

    // Check if the signature is valid.
    const isValid2 = schnorr.verify(sign, signatureHash, pub)
    if (isValid2) { console.log('The signature should validate using another library.') }
    // Both of this two passed.
    const isValid1 = tinysecp.verifySchnorr(signatureHash, pub, sign);
    if (isValid1) { console.log('The test demo should produce a valid signature.') }

    // transaction.version = 2
    console.log(transaction)

    // Broadcasting the transaction
    const txHex = transaction.toHex();
    console.log(`Broadcasting Transaction Hex: ${txHex}`);
    const broadcastResult = await broadcastraw(txHex);
    console.log(`Success! Broadcast result: ${broadcastResult}`);

    // Generate new block to confirm
    await pushBlock(p2pktr_addr);
}

async function bridge_workflow(keypair: Signer) {
    const internalKey = keypair;
    const Threshold = 25;
    const KeyNum = 25;
    const Locktime = 5;
    const Tappath: number = 1;

    // All input have to be signed
    // So generated some random private key to sign
    const leafKeys = [];
    const leafKeys_useless = [];
    const leafPubkeys = [];
    const leafPubkeys_useless = [];

    for (let i = 0; i < KeyNum; i++) {
        const leafKey = ECPair.makeRandom({ network });
        leafKeys.push(leafKey);
        leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));

        const leafKey_useless = ECPair.makeRandom({ network });
        leafKeys_useless.push(leafKey);
        leafPubkeys_useless.push(toXOnly(leafKey_useless.publicKey).toString('hex'));
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
        network: regtest,
    });

    const p2csvtr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(internalKey.publicKey),
        scriptTree,
        redeem: redeem_csv,
        network: regtest,
    });

    const p2pktr_addr = p2pktr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`)

    let temp_trans = await pushTrans(p2pktr_addr)
    console.log("the new txid is:", temp_trans)

    const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new bitcoin.Psbt({ network: regtest });

    /////////////////////////////////
    //Path 1: update multi-sig unlock
    /////////////////////////////////
    if (Tappath == 1) {
        psbt.addInput({
            hash: utxos.txid,
            index: utxos.vout,
            witnessUtxo: { value: utxos.value, script: p2pktr.output! },
        });

        psbt.updateInput(0, {
            tapLeafScript: [
                {
                    leafVersion: redeem.redeemVersion,
                    script: redeem.output,
                    controlBlock: p2pktr.witness![p2pktr.witness!.length - 1],
                },
            ],
        });

        psbt.addOutput({ value: utxos.value - 150, address: p2pktr.address! });

        // Threshold signers
        for (var i = 0; i < Threshold; i++) {
            psbt.signInput(0, leafKeys[i]);
        }
        // Uselss signers
        for (var i = Threshold; i < leafKeys.length; i++) {
            psbt.signInput(0, leafKeys_useless[i]);
        }
    }
    ///////////////////////////

    //////////////////////////
    //Path2: update csv unlock
    //////////////////////////
    if (Tappath == 2) {
        psbt.addInput({
            hash: utxos.txid,
            index: utxos.vout,
            sequence: Locktime,
            witnessUtxo: { value: utxos.value, script: p2csvtr.output! },
        });

        psbt.updateInput(0, {
            tapLeafScript: [
                {
                    leafVersion: redeem_csv.redeemVersion,
                    script: redeem_csv.output,
                    controlBlock: p2csvtr.witness![p2csvtr.witness!.length - 1],
                },
            ],
        });

        psbt.addOutput({ value: utxos.value - 150, address: p2csvtr.address! });

        // Only one signers
        psbt.signInput(0, keypair);
    }
    ///////////////////////////

    // Finalize and send out tx
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    if (Tappath == 2) {
        for (var i = 0; i < Locktime; i++) {
            await pushBlock(p2pktr_addr)
        }
    }

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    let tx_verify = await getUTXOfromTx(tx.getId(), p2pktr_addr)
    console.log(`Get UTXO ${tx_verify}`);
}

async function bridge_unit(keypair: Signer) {

    const internalKey = keypair;
    const Threshold = 25;
    const KeyNum = 25;
    const Locktime = 5;
    const Tappath: number = 1;

    // All input have to be signed
    // So generated some random private key to sign
    const leafKeys = [];
    const leafPubkeys = [];
    for (let i = 0; i < KeyNum; i++) {
        const leafKey: Signer = ECPair.makeRandom({ network });
        leafKeys.push(leafKey);
        leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
    }

    const [p2pktr, p2csvtr, utxos] = await get_taproot_bridge(keypair, leafKeys, KeyNum, Threshold, Locktime, network);

    /////////////////////////////////
    //Path 1: update multi-sig unlock
    /////////////////////////////////
    if (Tappath == 1) {
        await pay_sig(network, utxos, p2pktr, leafKeys, Threshold)
    }

    //////////////////////////
    //Path2: update csv unlock
    //////////////////////////
    if (Tappath == 2) {
        await pay_csv(network, utxos, p2csvtr, internalKey, Locktime)
    }
}

async function bridge_unit_mulit_leaf(keypair: Signer, unlocker: number) {
    const key_first = ECPair.makeRandom({ network })
    const internalKey = keypair;
    const Threshold = 3;
    const KeyNum = 4;
    const Locktime = 5;
    const Tappath: number = 1;

    // All input have to be signed
    // So generated some random private key to sign
    const leafKeys = [];
    const leafPubkeys = [];
    for (let i = 0; i < KeyNum; i++) {
        const leafKey: Signer = ECPair.makeRandom({ network });
        leafKeys.push(leafKey);
        leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
    }

    const [p2pktr, p2csvtr, utxos, combinations] = await get_taproot_bridge_multi_leaf(keypair, leafKeys, KeyNum, Threshold, Locktime, network, key_first);
    const p2tr: bitcoin.Payment[] = p2pktr as bitcoin.Payment[]

    // Use combinations to get the keypair
    let comb_keypair: Signer[] = []
    let t_combinations: string[] = combinations as string[]
    for (let i = 0; i < t_combinations[unlocker].length; i++) {
        for (let j = 0; j < leafKeys.length; j++) {
            if (leafPubkeys[j] == t_combinations[unlocker][i]) {
                comb_keypair.push(leafKeys[j])
            }
        }
    }

    /////////////////////////////////
    //Path 1: update multi-sig unlock
    /////////////////////////////////
    if (Tappath == 1) {
        await pay_sig_multi_leaf(network, utxos, p2tr, comb_keypair, Threshold, unlocker)
    }

    //////////////////////////
    //Path2: update csv unlock
    //////////////////////////
    if (Tappath == 2) {
        await pay_csv(network, utxos, p2csvtr, internalKey, Locktime)
    }
}

async function bridge_create_and_dump() {
    const config: Config = {
        internalKey: ECPair.makeRandom({ network }).toWIF(),
        Threshold: 2,
        KeyNum: 2,
        Locktime: 5
    }

    // All input have to be signed
    // So generated some random private key to sign
    const leafKeys = [];
    const leafWIFKeys = [];
    const leafPubkeys = [];
    for (let i = 0; i < config.KeyNum; i++) {
        const leafKey: ECPairInterface = ECPair.makeRandom({ network });
        leafKeys.push(leafKey);
        leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
        leafWIFKeys.push(leafKey.toWIF())
    }
    const key = ECPair.fromWIF(config.internalKey.toString(), network)

    const [p2pktr, p2csvtr, utxos] = await get_taproot_bridge(key, leafKeys, config.KeyNum, config.Threshold, config.Locktime, network);

    fs.writeFileSync('./dump/config.json', JSON.stringify(config))
    fs.writeFileSync('./dump/leafWIFKeys.json', JSON.stringify(leafWIFKeys))
    fs.writeFileSync('./dump/p2pktr.json', JSON.stringify(p2pktr))
    fs.writeFileSync('./dump/p2csvtr.json', JSON.stringify(p2csvtr))
    fs.writeFileSync('./dump/utxos.json', JSON.stringify(utxos))

    await pushBlock("bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w")

}

async function bridge_unlock_with_dump(path: number) {

    const config: Config = JSON.parse(fs.readFileSync("./dump/config.json", "utf8"), (k, v) => {
        if (
            v !== null && typeof v === 'object' && 'type' in v && v.type === 'Buffer' && 'data' in v && Array.isArray(v.data)) {
            return Buffer.from(v.data);
        }
        return v;
    });
    const leafWIFKeys: string[] = JSON.parse(fs.readFileSync("./dump/leafWIFKeys.json", "utf8"));
    const p2pktr: payments.Payment = JSON.parse(fs.readFileSync("./dump/p2pktr.json", "utf8"), (k, v) => {
        if (
            v !== null && typeof v === 'object' && 'type' in v && v.type === 'Buffer' && 'data' in v && Array.isArray(v.data)) {
            return Buffer.from(v.data);
        }
        return v;
    });
    const p2csvtr: payments.Payment = JSON.parse(fs.readFileSync("./dump/p2csvtr.json", "utf8"), (k, v) => {
        if (
            v !== null && typeof v === 'object' && 'type' in v && v.type === 'Buffer' && 'data' in v && Array.isArray(v.data)) {
            return Buffer.from(v.data);
        }
        return v;
    });
    const utxos: IUTXO = JSON.parse(fs.readFileSync("./dump/utxos.json", "utf8"), (k, v) => {
        if (
            v !== null && typeof v === 'object' && 'type' in v && v.type === 'Buffer' && 'data' in v && Array.isArray(v.data)) {
            return Buffer.from(v.data);
        }
        return v;
    });

    let leafKeys: ECPairInterface[] = []
    for (var i = 0; i < leafWIFKeys.length; i++) {
        leafKeys.push(ECPair.fromWIF(leafWIFKeys[i].toString(), network))
    }
    let key = ECPair.fromWIF(config.internalKey.toString(), network)

    /////////////////////////////////
    //Path 1: update multi-sig unlock
    /////////////////////////////////
    if (path == 1) {
        await pay_sig(network, utxos, p2pktr, leafKeys, config.Threshold)
    }

    // //////////////////////////
    // //Path2: update csv unlock
    // //////////////////////////
    if (path == 2) {
        await pay_csv(network, utxos, p2csvtr, key, config.Locktime)
    }
}

start().then(() => process.exit());



