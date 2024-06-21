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
import { toXOnly, tweakSigner, IUTXO, Config, choose_network } from "../taproot/utils.js"
import { ins_builder } from "../inscribe/inscription_builder.js";
import { brc_builder } from "../inscribe/brc20_builder.js";
import { pay_ins, pay_tap } from "../taproot/transaction_builder.js";

// const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const LEAF_VERSION_TAPSCRIPT = 192;

async function start() {
    // Stable Pair
    const keypair = ECPair.fromWIF("cPBwBXauJpeC2Q2CB99xtzrtA1fRDAyqApySv2QvhYCbmMsTGYy7", choose_network("regtest"))

    // const keypair = ECPair.makeRandom({ network });

    // Basic Test
    // await start_p2pktr(keypair)

    // await inscription(keypair)

    // await brc20_delopy(keypair, "test")

    // await brc20_mint(keypair, 100, "test", "regtest")

    await brc20_transfer(keypair, 100, "test", "bcrt1pkcvuxmpvencq8kd68g7k04tynjzwxeq7mg39xmclyxea3p9q335sywaxwu", "regtest")

    // console.log(script.toASM(Buffer.from("206b2f16c05b738835eadf8532373fc22336c5850c00e6f6290c9203542ac1a9b5ac0063036f72640101106170706c69636174696f6e2f6a736f6e004c6d7b0d0a202020202270223a20226272632d3230222c0d0a20202020226f70223a20226465706c6f79222c0d0a20202020227469636b223a202274657374222c0d0a20202020226d6178223a20223231303030303030222c0d0a20202020226c696d223a202231303030220d0a7d68", 'hex')))
    // console.log(script.toASM(Buffer.from("200a9a40288aa5b4f993423412acfc7397c75ec1e08d1fd33b7bf73e0f72ed9efeac0063036f726451106170706c69636174696f6e2f6a736f6e00487b2270223a226272632d3230222c226f70223a226465706c6f79222c227469636b223a2274657373222c226d6178223a223235303030303030222c226c696d223a2231303030227d68", 'hex')))
}

async function start_p2pktr(keypair: Signer, network: string) {
    console.log(`Running "Pay to Pubkey with taproot example"`);

    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network: choose_network(network) });
    // Generate an address from the tweaked public key
    const { p2tr, redeem } = taproot_address_wallet(bitcoin.script.fromASM("bc6f7155178bed4aecd8ab1291959144de4dd0b5e0f848e2a8d6133b615fab35 OP_CHECKSIG"), [toXOnly(tweakedSigner.publicKey).toString('hex')], "test", 1, network)

    const p2tr_addr = p2tr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${p2tr_addr}`)

    let temp_trans = await pushTrans(p2tr_addr)
    console.log("the new txid is:", temp_trans)

    const utxos = await getUTXOfromTx(temp_trans, p2tr_addr)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new Psbt({ network: choose_network(network) });
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
async function inscription_workflow(keypair: Signer, tick: string, network: string) {

    // Get account
    const { tp_account, tp_signer } = get_taproot_account(keypair, network)

    // Create temp account
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network: choose_network(network) });

    const json_test_1 = {
        "p": "brc-20",
        "op": "deploy",
        "tick": "" + tick + "",
        "max": "25000000",
        "lim": "1000"
    }

    const { p2tr, redeem } = brc_builder(tweakedSigner, JSON.stringify(json_test_1), network)

    const addr_from = p2tr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${addr_from}`)

    let temp_trans = await pushTrans(addr_from)

    console.log("the new txid is:", temp_trans)

    const utxos = await getUTXOfromTx(temp_trans, addr_from)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new Psbt({ network: choose_network(network) });

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
    await pushBlock(addr_from)
}

// inscription 
async function inscription(keypair: Signer, network: string) {
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network: choose_network(network) });

    const json_test_1 = {
        "name": "hello world"
    }

    const { p2tr, redeem } = ins_builder(tweakedSigner, "ord", JSON.stringify(json_test_1), "text/plain;charset=utf-8", network)

    const addr_from = p2tr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${addr_from}`)

    let temp_trans = await pushTrans(addr_from)

    console.log("the new txid is:", temp_trans)

    await pushBlock(addr_from)

    const utxos = await getUTXOfromTx(temp_trans, addr_from)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new Psbt({ network: choose_network(network) });

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
    await pushBlock(addr_from)
}

// inscription 
async function brc20_delopy(keypair: Signer, tick: string, network: string) {

    // Get account
    const { tp_account } = get_taproot_account(keypair, network)

    // Create temp account
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network: choose_network(network) });

    const json_test_1 = {
        "p": "brc-20",
        "op": "deploy",
        "tick": "" + tick + "",
        "max": "25000000",
        "lim": "1000"
    }

    const { p2tr, redeem } = brc_builder(tweakedSigner, JSON.stringify(json_test_1), network)

    const addr_from = p2tr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${addr_from}`)

    let temp_trans = await pushTrans(addr_from)

    console.log("the new txid is:", temp_trans)

    await pay_ins(tweakedSigner, temp_trans, p2tr.address!, tp_account.address!, network, p2tr, redeem)

    // generate new block to lookup
    await pushBlock(addr_from)
}

async function brc20_mint(keypair: Signer, amt: number, tick: string, network: string) {
    // Get account
    const { tp_account } = get_taproot_account(keypair, network)

    // Create temp account
    // Tweak the original keypair  
    const tweakedSigner = tweakSigner(keypair, { network: choose_network(network) });

    const json_test_1 = {
        "p": "brc-20",
        "op": "mint",
        "tick": "" + tick + "",
        "amt": "" + amt + ""
    }

    const { p2tr, redeem } = brc_builder(tweakedSigner, JSON.stringify(json_test_1), network)

    const addr_from = p2tr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${addr_from}`)

    let temp_trans = await pushTrans(addr_from)

    console.log("the new txid is:", temp_trans)

    await pay_ins(tweakedSigner, temp_trans, p2tr.address!, tp_account.address!, network, p2tr, redeem)

    // generate new block to lookup
    await pushBlock(addr_from)
}

async function brc20_transfer(keypair: Signer, amt: number, tick: string, addr_to: string, network: string) {
    // Keypair is from_addr

    // Get account
    const { tp_account, tp_signer } = get_taproot_account(keypair, network)

    // Create temp account
    const tweakedSigner = tweakSigner(keypair, { network: choose_network(network) });

    const json_test_1 = {
        "p": "brc-20",
        "op": "transfer",
        "tick": "" + tick + "",
        "amt": "" + amt + ""
    }

    const { p2tr, redeem } = brc_builder(tweakedSigner, JSON.stringify(json_test_1), network)

    const addr_from = p2tr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${addr_from}`)

    let temp_trans = await pushTrans(addr_from)

    console.log("the new txid is:", temp_trans)

    // transfer to the temp_addr
    const inter_tx_id = await pay_ins(tweakedSigner, temp_trans, p2tr.address!, tp_account.address!, network, p2tr, redeem)

    // transfer to the to_addr
    await pay_tap(tp_signer, inter_tx_id, tp_account.address!, addr_to, network, tp_account, 500)

    // generate new block to lookup
    await pushBlock(addr_from)
}

start().then(() => process.exit());



