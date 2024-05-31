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
import { asm_builder, asm_csv, taproot_address_wallet, } from "../taproot/taproot_script_builder.js"
import { get_taproot_bridge, pay_sig, pay_csv, get_taproot_bridge_multi_leaf, pay_sig_multi_leaf } from "../bridge/multisig_builder.js"
import * as fs from 'fs';
import { toXOnly, tweakSigner, IUTXO, Config } from "../taproot/utils.js"
import { ins_builder } from "../inscribe/inscription_builder.js";

// const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const network = networks.regtest;
const LEAF_VERSION_TAPSCRIPT = 192;

async function start() {
    // Stable Pair
    // const keypair = ECPair.fromWIF("cPBwBXauJpeC2Q2CB99xtzrtA1fRDAyqApySv2QvhYCbmMsTGYy7", network)

    const keypair = ECPair.makeRandom({ network });

    // Basic Test
    // await start_p2pktr(keypair)

    // await inscription(keypair)

    await brc20_delopy(keypair, "abcd")

    // await brc20_mint(keypair, 100)
}

async function start_p2pktr(keypair: Signer) {
    console.log(`Running "Pay to Pubkey with taproot example"`);

    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });
    // Generate an address from the tweaked public key
    const { p2tr, redeem } = taproot_address_wallet(bitcoin.script.fromASM("bc6f7155178bed4aecd8ab1291959144de4dd0b5e0f848e2a8d6133b615fab35 OP_CHECKSIG"), [toXOnly(tweakedSigner.publicKey).toString('hex')], "test", 1)

    const p2tr_addr = p2tr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${p2tr_addr}`)

    let temp_trans = await pushTrans(p2tr_addr)
    console.log("the new txid is:", temp_trans)

    await pushBlock(p2tr_addr)

    const utxos = await getUTXOfromTx(temp_trans, p2tr_addr)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: p2tr.output! }
    });

    psbt.updateInput(0, {
        tapLeafScript: [
            {
                leafVersion: redeem.redeemVersion,
                script: redeem.output,
                controlBlock: p2tr.witness![p2tr.witness!.length - 1],
            },
        ],
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
    await pushBlock(p2tr_addr)
}

// inscription 
async function inscription(keypair: Signer) {
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });

    const json_test_1 = {
        "name": "hello world"
    }

    const { p2tr, redeem } = ins_builder(tweakedSigner, "ord", JSON.stringify(json_test_1))

    const p2pktr_addr = p2tr.address ?? "";

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
        witnessUtxo: { value: utxos.value, script: p2tr.output! },
        tapLeafScript: [
            {
                leafVersion: redeem.redeemVersion,
                script: redeem.output,
                controlBlock: p2tr.witness![p2tr.witness!.length - 1],
            },
        ],
    });

    psbt.addOutput({
        address: "bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", // main wallet address 
        value: utxos.value - 500
    });

    // Auto-Sign
    psbt.signInput(0, tweakedSigner);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    // generate new block to lookup
    await pushBlock(p2pktr_addr)
}

// inscription 
async function brc20_delopy(keypair: Signer, tick: string) {
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });

    const json_test_1 = {
        "p": "brc-20",
        "op": "deploy",
        "tick": "" + tick + "",
        "max": "25000000",
        "lim": "1000"
    }

    const { p2tr, redeem } = ins_builder(tweakedSigner, "ord", JSON.stringify(json_test_1, null, 2))

    const p2pktr_addr = p2tr.address ?? "";

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
        witnessUtxo: { value: utxos.value, script: p2tr.output! },
        tapLeafScript: [
            {
                leafVersion: redeem.redeemVersion,
                script: redeem.output,
                controlBlock: p2tr.witness![p2tr.witness!.length - 1],
            },
        ],
    });

    psbt.addOutput({
        address: "bcrt1p20eskn367x7m66jk6t5vwefg497zyxqnn00j0h5rsur8rfevwnqsmzpfma", // main wallet address 
        value: utxos.value - 1000
    });

    // Auto-Sign
    psbt.signInput(0, tweakedSigner);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    // generate new block to lookup
    await pushBlock(p2pktr_addr)
}

async function brc20_mint(keypair: Signer, amt: number) {
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });

    const json_test_1 = {
        "p": "brc-20",
        "op": "mint",
        "tick": "test",
        "amt": "" + amt + ""
    }

    const { p2tr, redeem } = ins_builder(tweakedSigner, "ord", JSON.stringify(json_test_1, null, 2))

    const p2pktr_addr = p2tr.address ?? "";

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
        witnessUtxo: { value: utxos.value, script: p2tr.output! },
        tapLeafScript: [
            {
                leafVersion: redeem.redeemVersion,
                script: redeem.output,
                controlBlock: p2tr.witness![p2tr.witness!.length - 1],
            },
        ],
    });

    psbt.addOutput({
        address: "bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", // main wallet address 
        value: utxos.value - 500
    });

    // Auto-Sign
    psbt.signInput(0, tweakedSigner);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    // generate new block to lookup
    await pushBlock(p2pktr_addr)
}

start().then(() => process.exit());



