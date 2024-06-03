
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
import { broadcast, pushBlock, pushTrans, getUTXOfromTx, broadcastraw, getALLUTXOfromTx } from "../rpc/bitcoin_rpc.js";
import { ECPairFactory, ECPairAPI, ECPairInterface } from 'ecpair';
import { Taptree } from "bitcoinjs-lib/src/types";
import { get_agg_keypair, get_agg_pub, get_agg_sign, get_option } from "../bridge/musig_builder.js"
import * as tinysecp from 'tiny-secp256k1'
import { Buff } from '@cmdcode/buff'
import { schnorr } from '@noble/curves/secp256k1'
import { regtest } from "bitcoinjs-lib/src/networks.js";
import { asm_builder, asm_csv, get_taproot_account, taproot_address_wallet, } from "../taproot/taproot_script_builder.js"
import { get_taproot_bridge, pay_sig, pay_csv, get_taproot_bridge_multi_leaf, pay_sig_multi_leaf } from "../bridge/multisig_builder.js"
import * as fs from 'fs';
import { toXOnly, tweakSigner, IUTXO, Config } from "../taproot/utils.js"
import { ins_builder } from "../inscribe/inscription_builder.js";
import { brc_builder } from "../inscribe/brc20_builder.js";

export async function pay_ins(keypair: any, txid: any, addr_from: any, addr_to: any, network: any, account: any, redeem: any) {
    const utxos = await getUTXOfromTx(txid, addr_from)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new Psbt({ network });

    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: account.output! }
    });

    psbt.updateInput(0, {
        tapLeafScript: [
            {
                leafVersion: redeem.redeemVersion,
                script: redeem.output,
                controlBlock: account.witness![account.witness!.length - 1],
            },
        ],
    })

    psbt.addOutput({
        address: addr_to,
        value: utxos.value - 500
    });

    psbt.signInput(0, keypair);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    return tx.getId();
}

export async function pay_tap(keypair: any, txid: any, addr_from: any, addr_to: any, network: any, account: any, value: any) {
    const utxos = await getUTXOfromTx(txid, addr_from)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: account.output! },
        tapInternalKey: toXOnly(keypair.publicKey)
    });

    if (utxos.value - 500 < value) { return }

    psbt.addOutput({
        address: addr_to,
        value: value
    });

    psbt.addOutput({
        address: addr_from,
        value: utxos.value - value - 500
    });

    // Auto-Sign
    psbt.signInput(0, keypair);

    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(tx)

    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    // generate new block to lookup
    return tx.getId()
}