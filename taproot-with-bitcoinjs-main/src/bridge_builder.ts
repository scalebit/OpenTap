import {
    initEccLib,
    networks,
    script,
    Signer,
    payments,
    crypto,
    Psbt,
    Transaction
} from "bitcoinjs-lib";
import * as bitcoin from 'bitcoinjs-lib';
import { broadcast, waitUntilUTXO, pushBlock, pushTrans, getUTXOfromTx } from "./blockstream_utils.js";
import { ECPairFactory, ECPairAPI, TinySecp256k1Interface, ECPairInterface } from 'ecpair';
import { Hex, Taptree } from "bitcoinjs-lib/src/types";
import { witnessStackToScriptWitness } from "./witness_stack_to_script_witness.js";
import { get_agg_keypair, get_agg_pub, get_agg_sign, get_option } from "./musig_process.js"
import { asm_builder, asm_csv, multisig_taptree } from "./taproot_builder.js"
import { toXOnly, tweakSigner, tapTweakHash } from "./utils.js"
import * as tinysecp from 'tiny-secp256k1'
import { buffer } from "stream/consumers";
import { Buff } from '@cmdcode/buff'
import { sha256 } from "bitcoinjs-lib/src/crypto.js";
import { Sign, sign } from "crypto";
import { schnorr } from '@noble/curves/secp256k1'
import { assert } from "console";
import { regtest } from "bitcoinjs-lib/src/networks.js";
import { p2pk } from "bitcoinjs-lib/src/payments/p2pk.js";

import { signer } from "@cmdcode/crypto-tools";
import { NetworkInterfaceBase } from "os";

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

    psbt.updateInput(0, {
        tapLeafScript: [
            {
                leafVersion: p2pktr.redeem.redeemVersion,
                script: p2pktr.redeem.output,
                controlBlock: p2pktr.witness![p2pktr.witness!.length - 1],
            },
        ],
    });

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

export async function pay_htlc(network: any, utxos: any, p2csvtr: any, keypair: Signer, Locktime: number) {
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