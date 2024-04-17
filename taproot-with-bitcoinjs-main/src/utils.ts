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
import * as tinysecp from 'tiny-secp256k1'
import { buffer } from "stream/consumers";
import { Buff } from '@cmdcode/buff'
import { sha256 } from "bitcoinjs-lib/src/crypto.js";
import { Sign, sign } from "crypto";
import { schnorr } from '@noble/curves/secp256k1'
import { assert } from "console";
import { regtest } from "bitcoinjs-lib/src/networks.js";
import { p2pk } from "bitcoinjs-lib/src/payments/p2pk.js";
import { asm_builder, asm_csv, multisig_taptree } from "./taproot_builder.js"
import { signer } from "@cmdcode/crypto-tools";

initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const network = networks.regtest;
const LEAF_VERSION_TAPSCRIPT = 192;

export function tweakSigner(signer: Signer, opts: any = {}): Signer {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let privateKey: Uint8Array | undefined = signer.privateKey!;
    if (!privateKey) {
        throw new Error('Private key is required for tweaking signer!');
    }
    if (signer.publicKey[0] === 3) {
        privateKey = tinysecp.privateNegate(privateKey);
    }

    const tweakedPrivateKey = tinysecp.privateAdd(
        privateKey,
        tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash),
    );
    if (!tweakedPrivateKey) {
        throw new Error('Invalid tweaked private key!');
    }

    // To import private key
    // console.log()

    return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
        network: opts.network,
    })

}

export function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer {
    return crypto.taggedHash(
        'TapTweak',
        Buffer.concat(h ? [pubKey, h] : [pubKey]),
    );
}

export function toXOnly(pubkey: Buffer): Buffer {
    return pubkey.subarray(1, 33)
}

export function createKeySpendOutput(publicKey: any) {
    // x-only pubkey (remove 1 byte y parity)
    const myXOnlyPubkey = publicKey.slice(1, 33);
    const commitHash = bitcoin.crypto.taggedHash('TapTweak', myXOnlyPubkey);
    const tweakResult = tinysecp.xOnlyPointAddTweak(myXOnlyPubkey, commitHash);
    if (tweakResult === null) throw new Error('Invalid Tweak');
    const { xOnlyPubkey: tweaked } = tweakResult;
    // scriptPubkey
    return Buffer.concat([
        // witness v1, PUSH_DATA 32 bytes
        Buffer.from([0x51, 0x20]),
        // x-only tweaked pubkey
        tweaked,
    ]);
}

export interface IUTXO {
    txid: string;
    vout: number;
    status: {
        confirmed: boolean;
        block_height: number;
        block_hash: string;
        block_time: number;
    };
    value: number;
}

export interface Config {
    internalKey: Signer,
    Threshold: number,
    KeyNum: number,
    Locktime: number
}
