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
import { asm_builder, asm_csv, get_orgin_taproot_account, taproot_address_wallet, } from "../taproot/taproot_script_builder.js"
import { get_taproot_bridge, pay_sig, pay_csv, get_taproot_bridge_multi_leaf, pay_sig_multi_leaf } from "../bridge/multisig_builder.js"
import * as fs from 'fs';
import { toXOnly, tweakSigner, IUTXO, Config } from "../taproot/utils.js"
import { ins_builder } from "../inscribe/inscription_builder.js";
import { brc_builder } from "../inscribe/brc20_builder.js";

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

    // await brc20_delopy(keypair, "efgg")

    await brc20_mint(keypair, 100, "test")

    // console.log(script.toASM(Buffer.from("206b2f16c05b738835eadf8532373fc22336c5850c00e6f6290c9203542ac1a9b5ac0063036f72640101106170706c69636174696f6e2f6a736f6e004c6d7b0d0a202020202270223a20226272632d3230222c0d0a20202020226f70223a20226465706c6f79222c0d0a20202020227469636b223a202274657374222c0d0a20202020226d6178223a20223231303030303030222c0d0a20202020226c696d223a202231303030220d0a7d68", 'hex')))
    // console.log(script.toASM(Buffer.from("200a9a40288aa5b4f993423412acfc7397c75ec1e08d1fd33b7bf73e0f72ed9efeac0063036f726451106170706c69636174696f6e2f6a736f6e00487b2270223a226272632d3230222c226f70223a226465706c6f79222c227469636b223a2274657373222c226d6178223a223235303030303030222c226c696d223a2231303030227d68", 'hex')))
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

    const { p2tr, redeem } = ins_builder(tweakedSigner, "ord", JSON.stringify(json_test_1), "text/plain;charset=utf-8")

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

    const { p2tr, redeem } = brc_builder(tweakedSigner, JSON.stringify(json_test_1))

    const p2pktr_addr = p2tr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`)

    let temp_trans = await pushTrans(p2pktr_addr)

    console.log("the new txid is:", temp_trans)

    const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new Psbt({ network });

    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: p2tr.output! },
    });

    psbt.updateInput(0, {
        tapLeafScript: [
            {
                leafVersion: redeem.redeemVersion,
                script: redeem.output,
                controlBlock: p2tr.witness![p2tr.witness!.length - 1],
            },
        ],
    })

    psbt.addOutput({
        address: "bcrt1pqj3cnv0gzm3y86sgwenl9mmry2wf5pf5k9ajlwzynwzvqufgeevqex8fyh", // main wallet address 
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

async function brc20_mint(keypair: Signer, amt: number, tick: string) {
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });

    const json_test_1 = {
        "p": "brc-20",
        "op": "mint",
        "tick": "" + tick + "",
        "amt": "" + amt + ""
    }

    const { p2tr, redeem } = brc_builder(tweakedSigner, JSON.stringify(json_test_1))

    const p2pktr_addr = p2tr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`)

    let temp_trans = await pushTrans(p2pktr_addr)

    console.log("the new txid is:", temp_trans)

    const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr)
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
    })

    psbt.addOutput({
        address: "bcrt1pqj3cnv0gzm3y86sgwenl9mmry2wf5pf5k9ajlwzynwzvqufgeevqex8fyh", // main wallet address 
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

async function brc20_transfer(keypair: Signer, amt: number, tick: string, to: string) {
    // Tweak the original keypair

    const { tp_account, tp_signer } = get_orgin_taproot_account()
    const tweakedSigner = tweakSigner(keypair, { network });

    const json_test_1 = {
        "p": "brc-20",
        "op": "transfer",
        "tick": "" + tick + "",
        "amt": "" + amt + ""
    }

    const { p2tr, redeem } = brc_builder(tweakedSigner, JSON.stringify(json_test_1))

    const p2pktr_addr = p2tr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`)

    let temp_trans = await pushTrans(p2pktr_addr)

    console.log("the new txid is:", temp_trans)

    const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr)
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
    })

    psbt.addOutput({
        address: tp_account.pubkey!.toString('hex'), // main wallet address 
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



