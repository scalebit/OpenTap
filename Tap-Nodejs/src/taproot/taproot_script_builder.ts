import {
    initEccLib,
    networks,
    payments,
} from "bitcoinjs-lib";
import * as bitcoin from 'bitcoinjs-lib';
import { Taptree } from "bitcoinjs-lib/src/types";
import { ECPairFactory, ECPairAPI, ECPairInterface } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1'
import { choose_network, toXOnly, tweakSigner } from "./utils.js";
import { regtest } from "bitcoinjs-lib/src/networks.js";

initEccLib(tinysecp as any);
const network_ = "regtest"
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const LEAF_VERSION_TAPSCRIPT = 192;

/**
 * create a random multi-sig taproot account
 *
 * @param {any} keypair - The internal pubkey of taproot address
 * @param {number} threshold - The threshold of account
 * @param {number} keynum - The num of pubkey in account
 * @param {string} network - The network of taprrot address
 * @returns { { leafScript, leafKeys_WIF, p2tr, redeem } } - return the pubkey, privatekey, taproot account and redeem script.
 */
export function taproot_multisig_raw_account(keypair: any, threshold: number, keynum: number, network: string) {
    const leafKeys = [];
    const leafKeys_WIF = [];
    const leafPubkeys = [];

    for (let i = 0; i < keynum; i++) {
        const leafKey = ECPair.makeRandom({ network: choose_network(network) });
        leafKeys_WIF.push(leafKey.toWIF())
        leafKeys.push(leafKey);
        leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
    }

    const leafScript = asm_builder(leafPubkeys, threshold);

    const { p2tr, redeem } = taproot_address_from_asm(leafScript, keypair, network)

    return { leafScript, leafKeys_WIF, p2tr, redeem }
}

/**
 * Generate an simple taproot address from the tweaked public key
 *
 * @param {any} keypair - The internal pubkey of taproot address
 * @param {string} network - The network of taprrot address
 * @returns { tp_account, tp_signer } - return the taproot account and redeem script.
 */
export function get_taproot_account(keypair: any, network: string) {
    const tp_signer = keypair;
    const tp_account = payments.p2tr({
        pubkey: toXOnly(tp_signer.publicKey),
        network: choose_network(network)
    });
    return { tp_account, tp_signer }
}

/**
 * create a taproot account by bitcoin script ASM
 *
 * @param {Buffer} asm - The bitcoin script used to build taproot account
 * @param {bitcoin.Signer} keypair - The internal pubkey of taproot address
 * @param {string} network - The network of taprrot address
 * @returns { {  p2tr, redeem } } - return the taproot account and redeem script.
 */
export function taproot_address_from_asm(asm: Buffer, keypair: bitcoin.Signer, network: string): { p2tr: bitcoin.payments.Payment, redeem: any } {
    const scriptTree: Taptree =
    {
        output: asm
    };

    const redeem = {
        output: asm,
        redeemVersion: LEAF_VERSION_TAPSCRIPT,
    };

    const p2tr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(keypair.publicKey),
        scriptTree,
        redeem,
        network: choose_network(network),
    });

    return {
        p2tr,
        redeem
    };
}

/**
 * create a multi-sig taproot account by bitcoin script ASM
 *
 * @param {Buffer} asm - The bitcoin script used to build taproot account
 * @param {string[]} pk - The keypair used in the generation
 * @param {string} name - The name of the wallet
 * @param {number} threshold - The threshold of the wallet
 *  @param {string} network - The network of taprrot address
 * @returns { {  p2tr, redeem } } - return the taproot account and redeem script.
 */
export function taproot_address_wallet(asm: Buffer, pk: string[], name: string, threshold: number, network: string): { p2tr: bitcoin.payments.Payment, redeem: any } {
    const scriptTree: Taptree =
    {
        output: asm
    };

    const redeem = {
        output: asm,
        redeemVersion: LEAF_VERSION_TAPSCRIPT,
    };

    const pubkeys: Buffer[] = pk.map(str => Buffer.from(str, 'hex'));
    const keypair = ECPair.makeRandom({ network: choose_network(network) })

    const p2tr = bitcoin.payments.p2tr({
        name,
        internalPubkey: toXOnly(keypair.publicKey),
        scriptTree,
        redeem,
        network: choose_network(network),
        pubkeys,
        m: threshold
    });

    return {
        p2tr,
        redeem
    };
}

/**
 * create a CSV timelocker bitcoin script
 *
 * @param {number} rel_time - The relatively locking time/block
 * @param {any} pubKey - The pubkey used to verify the signature
 * @returns { Buffer } - return the CSV leafScript.
 */
export function asm_csv(rel_time: number, pubKey: any) {
    const leafScriptAsm = `${bitcoin.script.number.encode(rel_time).toString('hex')}` + ` OP_CHECKSEQUENCEVERIFY OP_DROP ${pubKey} OP_CHECKSIG`;
    console.log("csvbuilder:" + leafScriptAsm)
    const leafScript = bitcoin.script.fromASM(leafScriptAsm);
    return leafScript
}

/**
 * create a multi-sig bitcoin script
 *
 * @param {any[]} all_key - The keypair used in the generation
 * @param {number} threshold - The threshold of the wallet
 * @returns { Buffer } - return the CSV leafScript.
 */
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
