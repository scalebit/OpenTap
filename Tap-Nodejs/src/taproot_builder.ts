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
import { broadcast, waitUntilUTXO, pushBlock, pushTrans, getUTXOfromTx } from "./RPC.js";
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
import { p2pk } from "bitcoinjs-lib/src/payments/p2pk.js";
import { toXOnly } from "./utils.js";

// const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const network = networks.regtest;
const LEAF_VERSION_TAPSCRIPT = 192;

export function multisig_taptree(all_key: any[], threshold: number) {
    // all_key length must > 2

}

export function asm_csv(rel_time: number, pubKey: any) {
    const leafScriptAsm = `${bitcoin.script.number.encode(rel_time).toString('hex')}` + ` OP_CHECKSEQUENCEVERIFY OP_DROP ${pubKey} OP_CHECKSIG`;
    console.log("csvbuilder:" + leafScriptAsm)
    const leafScript = bitcoin.script.fromASM(leafScriptAsm);
    return leafScript
}

export function asm_builder(all_key: any[], threshold: number) {
    let leafScriptAsm: string = `${all_key[0]} OP_CHECKSIG`;
    for (var i = 1; i < all_key.length; i++) {
        leafScriptAsm = leafScriptAsm + ` ` + `${all_key[i]} OP_CHECKSIGADD`
    }
    leafScriptAsm = (leafScriptAsm + ` ` + `${bitcoin.script.number.encode(threshold).toString('hex')}` + ` OP_GREATERTHANOREQUAL`).toString()
    console.log("asmbuilder:" + leafScriptAsm)
    const leafScript = bitcoin.script.fromASM(leafScriptAsm);
    return leafScript;
}

function get_threshold_by_op(threshold: number) {
    let flag = threshold
    let asm = ``;
    if (flag <= 16) {
        asm = `OP_${threshold}`;
    }
    else {
        asm = `OP_16`;
        flag = flag - 16
        while (flag > 16) {
            asm = asm + ` OP_${16} OP_ADD`
            flag = flag - 16
        }
        asm = asm + ` OP_${flag % 16} OP_ADD`
    }
    return asm
}

// export function asm_builder_multi_leaf(key: Signer, all_key: any[], threshold: number) {
//     let leafScriptAsm: string = `${toXOnly(key.publicKey).toString('hex')} OP_CHECKSIG`;
//     for (var i = 0; i < all_key.length; i++) {
//         leafScriptAsm = leafScriptAsm + ` ` + `${all_key[i]} OP_CHECKSIGADD`
//     }
//     leafScriptAsm = (leafScriptAsm + ` ` + `${bitcoin.script.number.encode(threshold).toString('hex')}` + ` OP_GREATERTHANOREQUAL`).toString()
//     console.log("asmbuilder:" + leafScriptAsm)
//     const leafScript = bitcoin.script.fromASM(leafScriptAsm);
//     return leafScript;
// }

