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
import { broadcast, pushBlock, pushTrans, getUTXOfromTx, broadcastraw, getALLUTXOfromTx, getAllUTXOfromAddress, getBRC20FromUTXO, getBRC20FromALLUTXO, getTick } from "../rpc/bitcoin_rpc.js";
import { ECPairFactory, ECPairAPI, ECPairInterface } from 'ecpair';
import { Taptree } from "bitcoinjs-lib/src/types";
import { get_agg_keypair, get_agg_pub, get_agg_sign, get_option } from "../bridge/musig_builder.js"
import * as tinysecp from 'tiny-secp256k1'
import { Buff } from '@cmdcode/buff'
import { schnorr } from '@noble/curves/secp256k1'
import { regtest } from "bitcoinjs-lib/src/networks.js";
import { asm_builder, asm_csv, } from "../taproot/taproot_script_builder.js"
import { get_taproot_bridge, pay_sig, pay_csv, get_taproot_bridge_multi_leaf, pay_sig_multi_leaf } from "../bridge/multisig_builder.js"
import * as fs from 'fs';
import { toXOnly, tweakSigner, IUTXO, Config, invert_json_p2tr, invert_json_to_obj, choose_network } from "../taproot/utils.js"
import { taproot_address_from_asm, taproot_multisig_raw_account } from "../taproot/taproot_script_builder.js"
import { auto_choose_UTXO, auto_choose_brc20_UTXO, build_psbt, pay_psbt, pay_psbt_hex, sign_psbt } from "../taproot/transaction_builder.js";
import { sign } from "crypto";
import { getTickerInfo } from "../rpc/indexer_rpc.js";

// const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const network = networks.regtest;
const LEAF_VERSION_TAPSCRIPT = 192;

async function start() {
    // Stable Pair
    const keypair = ECPair.fromWIF("cPBwBXauJpeC2Q2CB99xtzrtA1fRDAyqApySv2QvhYCbmMsTGYy7", network)

    // Get Stable Multi-Sig
    const { leafKeys_WIF, p2tr, redeem } = taproot_multisig_raw_account(keypair, 2, 3, "regtest")
    fs.writeFileSync('./dump/leafKeys_WIF.json', JSON.stringify(leafKeys_WIF))
    fs.writeFileSync('./dump/p2tr.json', JSON.stringify(p2tr))
    fs.writeFileSync('./dump/redeem.json', JSON.stringify(redeem))

    // Psbt Test
    const leafKeys_WIFs = invert_json_to_obj(fs.readFileSync("./dump/leafKeys_WIF.json", "utf8"))
    const p2trs = invert_json_p2tr(fs.readFileSync("./dump/p2tr.json", "utf8"))
    const redeems = invert_json_p2tr(fs.readFileSync("./dump/redeem.json", "utf8"))

    for (const key of leafKeys_WIFs) {
        const pk = toXOnly(ECPair.fromWIF(key, network).publicKey).toString('hex')
        console.log(pk)
    }

    await start_psbt_stable(leafKeys_WIFs.p2pktr, p2trs.p2pktr, redeem.p2pktr, keypair, 1500, 500)

    await start_psbt(2, 4, keypair, 1111, 555)

    await send_faccut("bcrt1pkcvuxmpvencq8kd68g7k04tynjzwxeq7mg39xmclyxea3p9q335sywaxwu")

    await check_fund("bcrt1pkcvuxmpvencq8kd68g7k04tynjzwxeq7mg39xmclyxea3p9q335sywaxwu")

    await send_raw("02000000000101d0629013827ed48a57dc0826727433f16e63ae456a44d29f3e34dfce85838f170100000000ffffffff025704000000000000225120b619c36c2cccf003d9ba3a3d67d5649c84e3641eda22536f1f21b3d884a08c695026310100000000225120b619c36c2cccf003d9ba3a3d67d5649c84e3641eda22536f1f21b3d884a08c69044051e77a099cfeeb8c0fca79464f766acba8dcad6a1c4b9d143c339208c000d7fce023ef8f25ad288751046f26bb6cdd74f76a2117df844a9df5d52df328eff1b040f53fca1db8b9b4bd4796757fbbc489dfd8af1ba3796f2eec361def3577b59c6759697ccbd0902c25ed8e950b52b558accb36e6090b5cf9e4ce3e57021e575f2f68206ab8323bed8417b5175f18e356507a26d1155f18a60b82e697331998613caebcac2094706ca3f147ad1baebc4edd059c59e88fd1d1a3568d93a9161c3ac11d2aef0cba202649c3efd8bd6893195be78b2527caaa45ba94a97664f3d4f1ae754c5321b9a3ba52a221c089702b9d065eb206cf709ce752b1a3ff2a0920d713c52f241231d7a8dc19316a00000000")
}

/**
 * Send raw transaction
 *
 * @param {string} txraw - The transaction in Hex
 */
async function send_raw(txraw: string) {
    await broadcast(txraw)
}

/**
 * Get some coin from the regtest (not working in mainnet)
 *
 * @param {string} address - The address
 */
async function send_faccut(address: any) {
    let temp_trans = await pushTrans(address)
    console.log("the new txid is:", temp_trans)
}

/**
 * Get the UTXO from an address
 *
 * @param {string} address - The address
 */
async function check_fund(address: any) {
    let utxos = await getAllUTXOfromAddress(address)
    console.log(auto_choose_UTXO(utxos, 1000))
}

/// The whole workflow of building a psbt
async function start_psbt(threshold: number, num: number, keypair: Signer, amt: number, fee: number) {

    const { leafKeys_WIF, p2tr, redeem } = taproot_multisig_raw_account(keypair, threshold, num, "regtest")

    console.log(`Waiting till UTXO is detected at this Address: ${p2tr.address!}`)

    let temp_trans = await pushTrans(p2tr.address!)
    console.log("the new txid is:", temp_trans)

    const utxo = await getUTXOfromTx(temp_trans, p2tr.address!)

    let psbt_origin: string = build_psbt(redeem, [utxo], p2tr.address, "bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", "regtest", p2tr, amt, fee)
    let psbt_ = ''

    for (var i = 0; i < threshold; i++) {
        psbt_ = sign_psbt(psbt_origin, leafKeys_WIF[i], "regtest")
        psbt_origin = psbt_
    }

    let leafKeys = []

    for (var i = 0; i < leafKeys_WIF.length; i++) {
        leafKeys.push(ECPair.fromWIF(leafKeys_WIF[i], network).publicKey)
    }

    const txhex = await pay_psbt_hex(psbt_origin, threshold, num, "regtest", leafKeys)

    await broadcast(txhex)

}

/// The whole workflow of building a psbt with a stable keypair
async function start_psbt_stable(leafKeys_WIF: any, p2tr: any, redeem: any, keypair: Signer, amt: number, fee: number) {

    console.log(`Waiting till UTXO is detected at this Address: ${p2tr.address!}`)

    let temp_trans = await pushTrans(p2tr.address!)
    console.log("the new txid is:", temp_trans)

    await pushBlock(p2tr.address!)

    let utxos = await getAllUTXOfromAddress(p2tr.address!)
    utxos = auto_choose_UTXO(utxos, amt)
    console.log(utxos)

    let psbt_origin: string = build_psbt(redeem, utxos, p2tr.address, "bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", network, p2tr, amt, fee)
    let psbt_ = ''

    for (var i = 0; i < leafKeys_WIF.length; i++) {
        psbt_ = sign_psbt(psbt_origin, leafKeys_WIF[i], network)
        psbt_origin = psbt_
    }

    await pay_psbt(psbt_origin)
    await pushBlock(p2tr.address!)
}
