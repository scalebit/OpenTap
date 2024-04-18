import {
    initEccLib,
    networks,
    script,
    Signer,
    payments,
    crypto,
    Psbt,
    Transaction,
    address
} from "bitcoinjs-lib";
import * as bitcoin from 'bitcoinjs-lib';
import { broadcast, waitUntilUTXO, pushBlock, pushTrans, getUTXOfromTx, broadcastraw, getALLUTXOfromTx } from "./RPC.js";
import { ECPairFactory, ECPairAPI, TinySecp256k1Interface, ECPairInterface } from 'ecpair';
import { Hex, Taptree } from "bitcoinjs-lib/src/types";
import { witnessStackToScriptWitness } from "./witness_stack_to_script_witness.js";
import { test1, test2, get_agg_keypair, get_agg_pub, get_agg_sign, get_option } from "./musig_process.js"
import * as tinysecp from 'tiny-secp256k1'
import { buffer } from "stream/consumers";
import { Buff } from '@cmdcode/buff'
import { sha256 } from "bitcoinjs-lib/src/crypto.js";
import { sign } from "crypto";
import { schnorr } from '@noble/curves/secp256k1'
import { assert } from "console";
import { regtest } from "bitcoinjs-lib/src/networks.js";
import { toXOnly, tweakSigner, tapTweakHash, IUTXO, Config } from "./utils.js"
import { p2pk } from "bitcoinjs-lib/src/payments/p2pk.js";
import { asm_builder, asm_csv, multisig_taptree } from "./taproot_builder.js"
import { get_taproot_bridge, pay_sig, pay_csv, get_taproot_bridge_multi_leaf, pay_sig_multi_leaf } from "./bridge_builder.js"
import { threadId } from "worker_threads";
import * as fs from 'fs';
import { strictEqual } from "assert";
import { Key } from "readline";

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

    // await start_p2pktr(keypair);
    await start_musig_txbuilder()

    // Create a Taproot Bridge
    // await bridge_ceate_and_dump()

    // Musig pay
    // await bridge_unlock_with_dump(1)

    // Escape hatch
    // await bridge_unlock_with_dump(2)

}

async function test_case() {
    // Random Pair
    // const keypair = ECPair.makeRandom({ network });

    // Stable Pair
    const keypair = ECPair.fromWIF("cPBwBXauJpeC2Q2CB99xtzrtA1fRDAyqApySv2QvhYCbmMsTGYy7", network);
    console.log("private key:", keypair.toWIF());

    // Test bridge
    await bridge_workflow(keypair);
    await bridge_unit(keypair);

    // Musig utils
    test1();
    test2();

    // Basic taproot tx
    await start_p2pktr(keypair);

    // Musig tx
    await start_musig(keypair);

    // Tapleaf tx
    await start_taptree(keypair);
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

    // const p2pktr_addr = "bcrt1pfu8cy8p9txxl66rmpc56784aq3tvdddayvzqgktx7gvkl45aqs9q6xsq3f";
    // console.log('public key:', p2pktr.pubkey);

    console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`)

    let temp_trans = await pushTrans(p2pktr_addr)
    console.log("the new txid is:", temp_trans)

    await pushBlock(p2pktr_addr)

    // OP1 Wait for UTXO
    // const utxos = await waitUntilUTXO(p2pktr_addr)

    // OP 2 We directly use RawTransaction instead
    const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: p2pktr.output! },
        tapInternalKey: toXOnly(keypair.publicKey)
    });

    // utxos.value

    psbt.addOutput({
        address: "bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", // main wallet address 
        value: utxos.value - 150
    });

    // Auto-Sign
    psbt.signInput(0, tweakedSigner);

    // Comp-Sign
    // const psbtInput = psbt.data.inputs[0];
    // // Construct the transaction
    // const transaction = new Transaction();
    // transaction.version = 1; // Set the version number of the transaction
    // // // Add the input to the transaction
    // // transaction.addInput(psbtInput.hash, psbtInput.index, psbtInput.sequence);
    // // // Add the witness UTXO to the input
    // // transaction.setInputScript(0, psbtInput.witnessUtxo.script);
    // // // Calculate the sighash for the input
    // const hashType = Transaction.SIGHASH_ALL;
    // const signatureHash = transaction.hashForSignature(0, p2pktr.pubkey!, hashType);
    // console.log(signatureHash)
    // // Sign the signature hash

    // let msg = psbt.gettaproothash(0, toXOnly(keypair.publicKey))
    // const sign = tweakedSigner.sign(msg);
    // // Get the DER-encoded signature
    // // const derSignature = signature.toDER();
    // let tapKeySig = Buffer.from(sign)
    // psbt.updateInput(0, { tapKeySig })

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
async function start_musig(keypair: Signer) {
    try {
        // Encode an example string as bytes.
        let wallets = get_agg_keypair(5)
        let options = get_option(wallets)
        let pub = get_agg_pub(wallets, options)

        console.log('Testing schnorr tx.')

        // Generate an address from the tweaked public key
        const p2pktr = payments.p2tr({
            internalPubkey: Buffer.from(pub),
            network
        });

        // const p2pktr = payments.p2tr({
        //     pubkey: Buffer.from(pub),
        //     network
        // });

        const p2pktr_addr = p2pktr.address ?? "";
        console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`)

        // push trans but not confirm
        let temp_trans = await pushTrans(p2pktr_addr)
        console.log("the new txid is:", temp_trans)

        // await pushBlock(p2pktr_addr)

        // get UTXO
        const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr)
        console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

        const psbt = new Psbt({ network });

        psbt.addInput({
            hash: utxos.txid,
            index: utxos.vout,
            witnessUtxo: { value: utxos.value, script: p2pktr.output! },
            tapInternalKey: Buffer.from(pub),
        });

        // utxos.value
        psbt.addOutput({
            address: "bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", // main wallet address 
            value: utxos.value - 150
        });

        // Workground (does not work either)
        let transaction = new Transaction;
        transaction.addInput(Buffer.from(utxos.txid, 'hex').reverse(), utxos.vout)
        transaction.addOutput(p2pktr.output!, utxos.value - 150)
        let signatureHash = transaction.hashForWitnessV1(0, [p2pktr.output!], [utxos.value - 150], Transaction.SIGHASH_ALL);

        // let msg = signatureHash;
        let msg = psbt.gettaproothash(0, Buffer.from(pub))
        let sign = get_agg_sign(wallets, options, Buff.from(msg));

        let tapKeySig = Buffer.from(sign)
        psbt.updateInput(0, { tapKeySig })
        console.log(psbt.data.inputs)
        psbt.finalizeAllInputs();
        console.log(psbt.data.inputs)

        // const isValid2 = schnorr.verify(Buffer.from(sign), Buffer.from(msg), Buffer.from(pub))
        // if (isValid2) { console.log('The signature should validate using another library.') }

        const tx = psbt.extractTransaction();
        console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
        console.log("Txid is:", tx.getId());

        // ERROR: Borad cast will failed
        const txHex = await broadcast(tx.toHex());
        console.log(`Success! TxHex is ${txHex}`);

        // generate new block to lookup
        await pushBlock(p2pktr_addr)

    } catch (error) {
        console.error('The error occur in:', error);
    }
}

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

// async function start_tap_txbuilder(keypair: Signer) {
//     // let wallets = get_agg_keypair(5);
//     // let options = get_option(wallets);
//     // let pub = get_agg_pub(wallets, options);

//     const tweakedSigner = tweakSigner(keypair, { network });
//     // Generate an address from the tweaked public key
//     const p2pktr = payments.p2tr({
//         pubkey: toXOnly(tweakedSigner.publicKey),
//         network
//     });

//     const p2pktr_addr = p2pktr.address ?? "";
//     console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`);

//     // Push transaction but not confirm
//     let temp_trans = await pushTrans(p2pktr_addr);
//     console.log("the new txid is:", temp_trans);

//     // Get UTXO
//     const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr);
//     console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

//     // Building a new transaction
//     let transaction = new Transaction(); // Assuming you have defined network
//     transaction.addInput(Buffer.from(utxos.txid, 'hex').reverse(), utxos.vout);

//     const scriptPubKey = bitcoin.address.toOutputScript("bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", network);
//     transaction.addOutput(scriptPubKey, utxos.value - 200);

//     const prevOutScript = bitcoin.address.toOutputScript(p2pktr_addr, network);

//     let signatureHash = transaction.hashForWitnessV1(0, [prevOutScript], [utxos.value], Transaction.SIGHASH_DEFAULT);
//     let tapKeySig = Buffer.from(sign); // Ensure the signature is in the correct format

//     transaction.ins[0].witness = [tapKeySig];

//     // Check if the signature is valid.
//     const isValid2 = schnorr.verify(sign, signatureHash, pub)
//     if (isValid2) { console.log('The signature should validate using another library.') }
//     // Both of this two passed.
//     const isValid1 = tinysecp.verifySchnorr(signatureHash, pub, sign);
//     if (isValid1) { console.log('The test demo should produce a valid signature.') }

//     // transaction.version = 2
//     console.log(transaction)

//     // Broadcasting the transaction
//     const txHex = transaction.toHex();
//     console.log(`Broadcasting Transaction Hex: ${txHex}`);
//     const broadcastResult = await broadcastraw(txHex);
//     console.log(`Success! Broadcast result: ${broadcastResult}`);

//     // Generate new block to confirm
//     await pushBlock(p2pktr_addr);
// }

// TapTree test
async function start_taptree(keypair: Signer) {

    console.log(`Running "Taptree example"`);
    // Create a tap tree with two spend paths
    // One path should allow spending using secret
    // The other path should pay to another pubkey

    // Make random key for hash_lock
    // const hash_lock_keypair = ECPair.makeRandom({ network });

    // Stable Pair
    // It means the hash locker pk is equal to p2TR pk
    const hash_lock_keypair = ECPair.fromWIF("cPBwBXauJpeC2Q2CB99xtzrtA1fRDAyqApySv2QvhYCbmMsTGYy7", network);

    const secret_bytes = Buffer.from('SECRET');
    const hash = crypto.hash160(secret_bytes);
    // Construct script to pay to hash_lock_keypair if the correct preimage/secret is provided
    const hash_script_asm = `OP_HASH160 ${hash.toString('hex')} OP_EQUALVERIFY ${toXOnly(hash_lock_keypair.publicKey).toString('hex')} OP_CHECKSIG`;
    const hash_lock_script = script.fromASM(hash_script_asm);

    const p2pk_script_asm = `${toXOnly(keypair.publicKey).toString('hex')} OP_CHECKSIG`;
    const p2pk_script = script.fromASM(p2pk_script_asm);

    const scriptTree: Taptree = [
        {
            output: hash_lock_script
        },
        {
            output: p2pk_script
        }
    ];

    const hash_lock_redeem = {
        output: hash_lock_script,
        redeemVersion: 192,
    };
    const p2pk_redeem = {
        output: p2pk_script,
        redeemVersion: 192
    }

    const script_p2tr = payments.p2tr({
        internalPubkey: toXOnly(keypair.publicKey),
        scriptTree,
        network
    });
    const script_addr = script_p2tr.address ?? '';

    const p2pk_p2tr = payments.p2tr({
        internalPubkey: toXOnly(keypair.publicKey),
        scriptTree,
        redeem: p2pk_redeem,
        network
    });

    const hash_lock_p2tr = payments.p2tr({
        internalPubkey: toXOnly(keypair.publicKey),
        scriptTree,
        redeem: hash_lock_redeem,
        network
    });

    console.log(`Waiting till UTXO is detected at this Address: ${script_addr}`);
    let utxos = await waitUntilUTXO(script_addr)
    console.log(`Trying the P2PK path with UTXO ${utxos[0].txid}:${utxos[0].vout}`);

    const p2pk_psbt = new Psbt({ network });
    p2pk_psbt.addInput({
        hash: utxos[0].txid,
        index: utxos[0].vout,
        witnessUtxo: { value: utxos[0].value, script: p2pk_p2tr.output! },
        tapLeafScript: [
            {
                leafVersion: p2pk_redeem.redeemVersion,
                script: p2pk_redeem.output,
                controlBlock: p2pk_p2tr.witness![p2pk_p2tr.witness!.length - 1]
            }
        ]
    });

    p2pk_psbt.addOutput({
        address: "mohjSavDdQYHRYXcS3uS6ttaHP8amyvX78", // faucet address
        value: utxos[0].value - 150
    });

    p2pk_psbt.signInput(0, keypair);
    p2pk_psbt.finalizeAllInputs();

    let tx = p2pk_psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    let txid = await broadcast(tx.toHex());
    console.log(`Success! Txid is ${txid}`);

    console.log(`Waiting till UTXO is detected at this Address: ${script_addr}`);
    utxos = await waitUntilUTXO(script_addr)
    console.log(`Trying the Hash lock spend path with UTXO ${utxos[0].txid}:${utxos[0].vout}`);

    const tapLeafScript = {
        leafVersion: hash_lock_redeem.redeemVersion,
        script: hash_lock_redeem.output,
        controlBlock: hash_lock_p2tr.witness![hash_lock_p2tr.witness!.length - 1]
    };

    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: utxos[0].txid,
        index: utxos[0].vout,
        witnessUtxo: { value: utxos[0].value, script: hash_lock_p2tr.output! },
        tapLeafScript: [
            tapLeafScript
        ]
    });

    psbt.addOutput({
        address: "mohjSavDdQYHRYXcS3uS6ttaHP8amyvX78", // faucet address
        value: utxos[0].value - 150
    });

    psbt.signInput(0, hash_lock_keypair);

    // We have to construct our witness script in a custom finalizer

    const customFinalizer = (_inputIndex: number, input: any) => {
        const scriptSolution = [
            input.tapScriptSig[0].signature,
            secret_bytes
        ];
        const witness = scriptSolution
            .concat(tapLeafScript.script)
            .concat(tapLeafScript.controlBlock);

        return {
            finalScriptWitness: witnessStackToScriptWitness(witness)
        }
    }

    psbt.finalizeInput(0, customFinalizer);

    tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    txid = await broadcast(tx.toHex());
    console.log(`Success! Txid is ${txid}`);

    // Spend from this address without using the script tree

    // console.log(`Waiting till UTXO is detected at this Address: ${script_addr}`);
    // utxos = await waitUntilUTXO(script_addr)
    // console.log(`Trying the Hash lock spend path with UTXO ${utxos[0].txid}:${utxos[0].vout}`);

    // const key_spend_psbt = new Psbt({ network });
    // key_spend_psbt.addInput({
    //     hash: utxos[0].txid,
    //     index: utxos[0].vout,
    //     witnessUtxo: { value: utxos[0].value, script: script_p2tr.output! },
    //     tapInternalKey: toXOnly(keypair.publicKey),
    //     tapMerkleRoot: script_p2tr.hash
    // });
    // key_spend_psbt.addOutput({
    //     address: "mohjSavDdQYHRYXcS3uS6ttaHP8amyvX78", // faucet address
    //     value: utxos[0].value - 150
    // });
    // // We need to create a signer tweaked by script tree's merkle root
    // const tweakedSigner = tweakSigner(keypair, { tweakHash: script_p2tr.hash });
    // key_spend_psbt.signInput(0, tweakedSigner);
    // key_spend_psbt.finalizeAllInputs();

    // tx = key_spend_psbt.extractTransaction();
    // console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    // txid = await broadcast(tx.toHex());
    // console.log(`Success! Txid is ${txid}`);
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

    // const leafScriptAsm1 = `${leafPubkeys[0]} OP_CHECKSIG ${leafPubkeys[1]} OP_CHECKSIGADD ${leafPubkeys[2]} OP_CHECKSIGADD OP_3 OP_NUMEQUAL`;
    // console.log("normal:" + leafScriptAsm1)
    // const leafScript1 = bitcoin.script.fromASM(leafScriptAsm1);
    // console.log("normal:" + leafScript1)

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

    // const p2pktr_addr = "bcrt1pfu8cy8p9txxl66rmpc56784aq3tvdddayvzqgktx7gvkl45aqs9q6xsq3f";
    // console.log('public key:', p2pktr.pubkey);

    console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`)

    let temp_trans = await pushTrans(p2pktr_addr)
    console.log("the new txid is:", temp_trans)

    // await pushBlock(p2pktr_addr)

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

    // finalize and send out tx
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

async function bridge_ceate_and_dump() {
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



