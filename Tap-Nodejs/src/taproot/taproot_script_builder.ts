import {
    initEccLib,
    networks,
    payments,
} from "bitcoinjs-lib";
import * as bitcoin from 'bitcoinjs-lib';
import { Taptree } from "bitcoinjs-lib/src/types";
import { ECPairFactory, ECPairAPI, ECPairInterface } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1'
import { toXOnly, tweakSigner } from "./utils.js";
import { regtest } from "bitcoinjs-lib/src/networks.js";

initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const network = networks.regtest;
const network_array = [networks.bitcoin, networks.testnet, networks.regtest];
const LEAF_VERSION_TAPSCRIPT = 192;

export function get_orgin_taproot_account() {
    const keypair = ECPair.makeRandom({ network });
    // Tweak the original keypair
    const tp_signer = tweakSigner(keypair, { network });
    // Generate an address from the tweaked public key
    const tp_account = payments.p2tr({
        pubkey: toXOnly(tp_signer.publicKey),
        network
    });
    return { tp_account, tp_signer }
}

export function taproot_address_from_asm(asm: Buffer, keypair: bitcoin.Signer): { p2tr: bitcoin.payments.Payment, redeem: any } {
    const scriptTree: Taptree = [
        {
            output: asm
        },
        {
            output: bitcoin.script.fromASM(keypair.publicKey.toString('hex') + ' OP_CHECKSIG')
        }
    ];

    const redeem = {
        output: asm,
        redeemVersion: LEAF_VERSION_TAPSCRIPT,
    };

    const p2tr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(keypair.publicKey),
        scriptTree,
        redeem,
        network,
    });

    return {
        p2tr,
        redeem
    };
}

export function taproot_address_wallet(asm: Buffer, pk: string[], name: string, threshold: number): { p2tr: bitcoin.payments.Payment, redeem: any } {
    const scriptTree: Taptree =
    {
        output: asm
    };

    const redeem = {
        output: asm,
        redeemVersion: LEAF_VERSION_TAPSCRIPT,
    };

    const pubkeys: Buffer[] = pk.map(str => Buffer.from(str, 'hex'));
    const keypair = ECPair.makeRandom({ network })

    const p2tr = bitcoin.payments.p2tr({
        name,
        internalPubkey: toXOnly(keypair.publicKey),
        scriptTree,
        redeem,
        network,
        pubkeys,
        m: threshold
    });

    return {
        p2tr,
        redeem
    };
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
