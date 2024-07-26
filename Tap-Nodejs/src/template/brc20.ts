import { initEccLib, Signer, Psbt } from "bitcoinjs-lib";
import { broadcast, pushBlock, pushTrans, getUTXOfromTx, getAllUTXOfromAddress, getBRC20FromALLUTXO } from "../rpc/bitcoin_rpc.js";
import { ECPairFactory, ECPairAPI } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1'
import { get_taproot_account } from "../taproot/taproot_script_builder.js"
import { tweakSigner, choose_network } from "../taproot/utils.js"
import { ins_builder } from "../inscribe/inscription_builder.js";
import { brc_builder } from "../inscribe/brc20_builder.js";
import { pay_ins, pay_tap } from "../taproot/transaction_builder.js";
import { auto_choose_brc20_UTXO } from "../taproot/transaction_builder.js";
import { getTickerInfo } from "../rpc/indexer_rpc.js";

initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);

async function start() {
    // Stable Pair
    const keypair = ECPair.fromWIF("cPBwBXauJpeC2Q2CB99xtzrtA1fRDAyqApySv2QvhYCbmMsTGYy7", choose_network("regtest"))
    // const keypair = ECPair.makeRandom({ network });

    let json = { "name": "Hello World" }

    await inscription(keypair, "regtest", "text/plain;charset=utf-8", json)

    await brc20_delopy(keypair, "test", "regtest")

    await brc20_mint(keypair, 100, "test", "regtest")

    await brc20_transfer(keypair, 100, "test", "bcrt1pkcvuxmpvencq8kd68g7k04tynjzwxeq7mg39xmclyxea3p9q335sywaxwu", "regtest")

    await get_brc20_txid("bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w")
}

/**
 * The detailed workflow of how to build a inscription
 *
 * @param {Signer} keypair - The key used to build an temporary account
 * @param {string} tick - The name of brc20 token
 * @param {string} network - The network env
 */
async function inscription_workflow(keypair: Signer, tick: string, network: string) {
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

/**
 * Use opentap to build a inscription
 *
 * @param {Signer} keypair - The key used to build an temporary account
 * @param {string} network - The network env
 * @param {string} type - The inscription type
 * @param {any} content - The inscription content
 */
async function inscription(keypair: Signer, network: string, type: string, content: any) {
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network: choose_network(network) });

    const { p2tr, redeem } = ins_builder(tweakedSigner, "ord", JSON.stringify(content), type, network)

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

/**
 * Use opentap to deploy a brc20 token
 *
 * @param {Signer} keypair - The key used to build an temporary account
 * @param {string} tick - The name of brc20 token
 * @param {string} network - The network env
 */
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

/**
 * Use opentap to mint a brc20 token
 *
 * @param {Signer} keypair - The key used to build an temporary account
 * @param {number} amt - The amount of brc20 to mint, it has a custom decimal
 * @param {string} tick - The name of brc20 token
 * @param {string} network - The network env
 */
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

/**
 * Use opentap to transfer a brc20 token
 *
 * @param {Signer} keypair - The key used to build an temporary account
 * @param {number} amt - The amount of brc20 to mint, it has a custom decimal
 * @param {string} tick - The name of brc20 token
 * @param {string} addr_to - Send the brc20 to a certain address
 * @param {string} network - The network env
 */
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


/**
 * Get all UTXO contained brc20
 *
 * @param {string} address - The related address
 */
async function get_brc20_txid(address: string) {
    let utxos = await getAllUTXOfromAddress(address)
    let brc20utxo = await getBRC20FromALLUTXO(utxos)
    console.log(brc20utxo)
    let ticker = await getTickerInfo("test")
    let decimal = ticker.decimal
    let brcutxo = auto_choose_brc20_UTXO(brc20utxo, 50, decimal, "test")
    console.log(brcutxo)
}

start().then(() => process.exit());



