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
    // const { leafKeys_WIF, p2tr, redeem } = taproot_multisig_raw_account(keypair, 2, 3)
    // fs.writeFileSync('./dump/leafKeys_WIF.json', JSON.stringify(leafKeys_WIF))
    // fs.writeFileSync('./dump/p2tr.json', JSON.stringify(p2tr))
    // fs.writeFileSync('./dump/redeem.json', JSON.stringify(redeem))

    // Psbt Test
    // const leafKeys_WIF = invert_json_to_obj(fs.readFileSync("./dump/leafKeys_WIF.json", "utf8"))
    // const p2tr = invert_json_p2tr(fs.readFileSync("./dump/p2tr.json", "utf8"))
    // const redeem = invert_json_p2tr(fs.readFileSync("./dump/redeem.json", "utf8"))

    // for (const key of leafKeys_WIF) {
    //     const pk = toXOnly(ECPair.fromWIF(key, network).publicKey).toString('hex')
    //     console.log(pk)
    // }

    // await start_psbt(leafKeys_WIF.p2pktr, p2tr.p2pktr, redeem.p2pktr, keypair, 1500, 500)

    // await start_psbt(2, 4, keypair, 1111, 555)

    // Basic Test
    // start_p2pktr(keypair)

    // Classic Multisig
    // await bridge_unit(keypair)

    // Privacy Multisig
    // await bridge_unit_mulit_leaf(keypair, 1)

    // Workflow
    // await bridge_workflow(keypair)

    // Musig
    // await start_musig_txbuilder()

    // Create a Taproot Bridge
    // await bridge_create_and_dump()

    // Multisig pay
    // await bridge_unlock_with_dump(1)

    // Escape hatch
    // await bridge_unlock_with_dump(2)

    // await send_faccut("bcrt1pkcvuxmpvencq8kd68g7k04tynjzwxeq7mg39xmclyxea3p9q335sywaxwu")
    // await check_fund("bcrt1pkcvuxmpvencq8kd68g7k04tynjzwxeq7mg39xmclyxea3p9q335sywaxwu")
    // await send_raw("02000000000101d0629013827ed48a57dc0826727433f16e63ae456a44d29f3e34dfce85838f170100000000ffffffff025704000000000000225120b619c36c2cccf003d9ba3a3d67d5649c84e3641eda22536f1f21b3d884a08c695026310100000000225120b619c36c2cccf003d9ba3a3d67d5649c84e3641eda22536f1f21b3d884a08c69044051e77a099cfeeb8c0fca79464f766acba8dcad6a1c4b9d143c339208c000d7fce023ef8f25ad288751046f26bb6cdd74f76a2117df844a9df5d52df328eff1b040f53fca1db8b9b4bd4796757fbbc489dfd8af1ba3796f2eec361def3577b59c6759697ccbd0902c25ed8e950b52b558accb36e6090b5cf9e4ce3e57021e575f2f68206ab8323bed8417b5175f18e356507a26d1155f18a60b82e697331998613caebcac2094706ca3f147ad1baebc4edd059c59e88fd1d1a3568d93a9161c3ac11d2aef0cba202649c3efd8bd6893195be78b2527caaa45ba94a97664f3d4f1ae754c5321b9a3ba52a221c089702b9d065eb206cf709ce752b1a3ff2a0920d713c52f241231d7a8dc19316a00000000"")
    await get_brc20_txid("bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w")
}

// Get all non-brc20 UTXO 
// Get all brc20 UTXO

async function get_brc20_txid(address: string) {
    let utxos = await getAllUTXOfromAddress(address)
    let brc20utxo = await getBRC20FromALLUTXO(utxos)
    console.log(brc20utxo)
    let ticker = await getTickerInfo("test")
    let decimal = ticker.decimal
    let brcutxo = auto_choose_brc20_UTXO(brc20utxo, 50, decimal, "test")
    console.log(brcutxo)
}

async function send_raw(txraw: string) {
    await broadcast(txraw)
}

async function send_faccut(address: any) {
    let temp_trans = await pushTrans(address)
    console.log("the new txid is:", temp_trans)

    await pushBlock("bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w")
}

async function check_fund(address: any) {
    let utxos = await getAllUTXOfromAddress(address)
    console.log(auto_choose_UTXO(utxos, 1000))
}


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
    // await pushBlock("bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w")
}

// async function start_psbt(threshold: number, num: number, keypair: Signer, amt: number, fee: number) {

// const leafKeys = [];
// const leafKeys_useless = [];
// const leafPubkeys = [];
// const leafPubkeys_useless = [];
// // const leafKeys_WIF = [];

// for (let i = 0; i < num; i++) {
//     // const leafKey = ECPair.makeRandom({ network });
//     // leafKeys.push(leafKey);
//     // leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
//     // leafKeys_WIF.push(leafKey.toWIF())

//     const leafKey_useless = ECPair.makeRandom({ network });
//     leafKeys_useless.push(leafKey_useless);
//     leafPubkeys_useless.push(toXOnly(leafKey_useless.publicKey).toString('hex'));
// }

// const { leafKeys_WIF, p2tr, redeem } = taproot_multisig_raw_account(keypair, threshold, num, "regtest")

// // const leafScript = asm_builder(leafPubkeys, threshold);

// // const scriptTree: Taptree =
// // {
// //     output: leafScript,
// // };

// // const redeem = {
// //     output: leafScript,
// //     redeemVersion: LEAF_VERSION_TAPSCRIPT,
// // };

// // const p2tr = bitcoin.payments.p2tr({
// //     internalPubkey: toXOnly(keypair.publicKey),
// //     scriptTree,
// //     redeem,
// //     network: choose_network(`regtest`),
// // });


//     console.log(`Waiting till UTXO is detected at this Address: ${p2tr.address!}`)

//     let temp_trans = await pushTrans(p2tr.address!)
//     console.log("the new txid is:", temp_trans)

//     const utxos = await getUTXOfromTx(temp_trans, p2tr.address!)

//     // let psbt_origin: string = build_psbt(redeem, [utxo], p2tr.address, "bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", "regtest", p2tr, amt, fee)
//     // let psbt_ = ''

//     // for (var i = 0; i < threshold; i++) {
//     //     psbt_ = sign_psbt(psbt_origin, leafKeys_WIF[i], "regtest")
//     //     psbt_origin = psbt_
//     // }

//     const psbt = new bitcoin.Psbt({ network: choose_network(`regtest`) });

//     psbt.addInput({
//         hash: utxos.txid,
//         index: utxos.vout,
//         witnessUtxo: { value: utxos.value, script: p2tr.output! },
//     });

//     psbt.updateInput(0, {
//         tapLeafScript: [
//             {
//                 leafVersion: redeem.redeemVersion,
//                 script: redeem.output,
//                 controlBlock: p2tr.witness![p2tr.witness!.length - 1],
//             },
//         ],
//     });

//     psbt.addOutput({ value: utxos.value - 150, address: p2tr.address! });

//     // psbt.addOutput({ value: utxos.value - 150, address: p2tr.address! });

//     // Threshold signers
//     for (var i = 0; i < threshold; i++) {
//         psbt.signInput(0, ECPair.fromWIF(leafKeys_WIF[i], choose_network(`regtest`)));
//     }

//     // All input have to be signed
//     // So generated some random private key to sign

//     // Useless signers
//     for (var i = threshold; i < leafKeys_WIF.length; i++) {
//         psbt.signInput(0, leafKeys_useless[i]);
//     }

//     psbt.finalizeAllInputs();

//     const tx = psbt.extractTransaction();
//     console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
//     console.log("Txid is:", tx.getId());

//     await broadcast(tx.toHex())
// }

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

// Basic test
async function start_p2pktr(keypair: Signer) {
    console.log(`Running "Pay to Pubkey with taproot example"`);

    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });
    // Generate an address from the tweaked public key
    const p2pktr = payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });
    const p2pktr_addr = p2pktr.address ?? "";

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
        witnessUtxo: { value: utxos.value, script: p2pktr.output! },
        tapInternalKey: toXOnly(keypair.publicKey)
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
    await pushBlock(p2pktr_addr)
}

// Basic test pubkeys
async function start_p2pktr_pubkeys() {
    console.log(`Running "Pay to Pubkey with taproot example"`);

    const Key1 = ECPair.makeRandom({ network });
    const Key2 = ECPair.makeRandom({ network });

    // Tweak the original keypair
    // const tweakedSigner = tweakSigner(keypair, { network });
    // Generate an address from the tweaked public key
    const p2pktr = payments.p2tr({
        pubkeys: [toXOnly(Key1.publicKey), toXOnly(Key2.publicKey)],
        network
    });
    const p2pktr_addr = p2pktr.address!;

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
        witnessUtxo: { value: utxos.value, script: p2pktr.output! }
    });

    psbt.addOutput({
        address: "bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", // main wallet address 
        value: utxos.value - 150
    });

    // Auto-Sign
    psbt.signInput(0, Key1);
    psbt.signInput(0, Key2);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(tx)

    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    // generate new block to lookup
    await pushBlock(p2pktr_addr)
}

// Musig test
async function start_musig_txbuilder() {
    let wallets = get_agg_keypair(5);
    let options = get_option(wallets);
    let pub = get_agg_pub(wallets, options);

    console.log('Testing schnorr tx.');

    // Generate an address from the tweaked public key
    const p2pktr = payments.p2tr({
        pubkey: Buffer.from(pub, 'hex'),
        network
    });

    const p2pktr_addr = p2pktr.address ?? "";
    console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`);

    // Push transaction but not confirm
    let temp_trans = await pushTrans(p2pktr_addr);
    console.log("the new txid is:", temp_trans);

    // Get UTXO
    const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr);
    const all_utxos = await getALLUTXOfromTx(temp_trans, p2pktr_addr);
    // console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    // Building a new transaction
    let transaction = new Transaction(); // Assuming you have defined network
    transaction.addInput(Buffer.from(utxos.txid, 'hex').reverse(), utxos.vout);

    const scriptPubKey = bitcoin.address.toOutputScript("bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", network);
    transaction.addOutput(scriptPubKey, utxos.value - 200);

    let prevOutScript: any[] = []
    let prevValue: any[] = []
    for (var i = 0; i < all_utxos.length; i++) {
        prevOutScript.push(bitcoin.address.toOutputScript(all_utxos[i].address, network));
        prevValue.push(all_utxos[i].value)
    }

    let p1 = bitcoin.address.toOutputScript(all_utxos[0].address, network)
    let p2 = bitcoin.address.toOutputScript(all_utxos[1].address, network)

    let v1 = all_utxos[0].value
    let v2 = all_utxos[1].value

    // const prevOutScript = ;
    // const prevOutScript2 = bitcoin.address.toOutputScript(p2pktr_addr, network);

    let signatureHash = transaction.hashForWitnessV1(0, [p2], [v2], Transaction.SIGHASH_DEFAULT);
    let sign: Buff = get_agg_sign(wallets, options, signatureHash);

    let tapKeySig = Buffer.from(sign); // Ensure the signature is in the correct format

    transaction.ins[0].witness = [tapKeySig];

    // Check if the signature is valid.
    const isValid2 = schnorr.verify(sign, signatureHash, pub)
    if (isValid2) { console.log('The signature should validate using another library.') }
    // Both of this two passed.
    const isValid1 = tinysecp.verifySchnorr(signatureHash, pub, sign);
    if (isValid1) { console.log('The test demo should produce a valid signature.') }

    // transaction.version = 2
    console.log(transaction)

    // Broadcasting the transaction
    const txHex = transaction.toHex();
    console.log(`Broadcasting Transaction Hex: ${txHex}`);
    const broadcastResult = await broadcastraw(txHex);
    console.log(`Success! Broadcast result: ${broadcastResult}`);

    // Generate new block to confirm
    await pushBlock(p2pktr_addr);
}

async function bridge_workflow(keypair: Signer) {
    const internalKey = keypair;
    const Threshold = 25;
    const KeyNum = 25;
    const Locktime = 5;
    const Tappath: number = 1;

    // All input have to be signed
    // So generated some random private key to sign
    const leafKeys = [];
    const leafPubkeys = [];

    for (let i = 0; i < KeyNum; i++) {
        const leafKey = ECPair.makeRandom({ network });
        leafKeys.push(leafKey);
        leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
    }

    const leafScript = asm_builder(leafPubkeys, Threshold);
    const csvScript = asm_csv(Locktime, toXOnly(keypair.publicKey).toString('hex'))

    const scriptTree: Taptree = [
        {
            output: bitcoin.script.fromASM(
                '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0 OP_CHECKSIG',
            ),
        },
        [
            {
                output: csvScript,
            },
            {
                output: leafScript,
            },
        ],
    ];

    const redeem = {
        output: leafScript,
        redeemVersion: LEAF_VERSION_TAPSCRIPT,
    };
    const redeem_csv = {
        output: csvScript,
        redeemVersion: LEAF_VERSION_TAPSCRIPT,
    };

    const p2pktr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(internalKey.publicKey),
        scriptTree,
        redeem,
        network: regtest,
    });

    const p2csvtr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(internalKey.publicKey),
        scriptTree,
        redeem: redeem_csv,
        network: regtest,
    });

    const p2pktr_addr = p2pktr.address ?? "";

    console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`)

    let temp_trans = await pushTrans(p2pktr_addr)
    console.log("the new txid is:", temp_trans)

    const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new bitcoin.Psbt({ network: regtest });

    /////////////////////////////////
    //Path 1: update multi-sig unlock
    /////////////////////////////////
    if (Tappath == 1) {
        psbt.addInput({
            hash: utxos.txid,
            index: utxos.vout,
            witnessUtxo: { value: utxos.value, script: p2pktr.output! },
        });

        psbt.updateInput(0, {
            tapLeafScript: [
                {
                    leafVersion: redeem.redeemVersion,
                    script: redeem.output,
                    controlBlock: p2pktr.witness![p2pktr.witness!.length - 1],
                },
            ],
        });

        psbt.addOutput({ value: utxos.value - 150, address: p2pktr.address! });

        // Threshold signers
        for (var i = 0; i < leafKeys.length; i++) {
            psbt.signInput(0, leafKeys[i]);
        }
        // Uselss signers
        if (leafKeys.length < Threshold) {
            for (let i = 0; i < psbt.data.inputs.length; i++) {
                for (let j = leafKeys.length; j < Threshold; j++) {
                    psbt.data.inputs[i].tapScriptSig?.push({
                        leafHash: psbt.data.inputs[i].tapScriptSig![0].leafHash,
                        pubkey: toXOnly(leafKeys[j].publicKey),
                        signature: Buffer.from("")
                    });
                }
            }
        }
    }
    ///////////////////////////

    //////////////////////////
    //Path2: update csv unlock
    //////////////////////////
    if (Tappath == 2) {
        psbt.addInput({
            hash: utxos.txid,
            index: utxos.vout,
            sequence: Locktime,
            witnessUtxo: { value: utxos.value, script: p2csvtr.output! },
        });

        psbt.updateInput(0, {
            tapLeafScript: [
                {
                    leafVersion: redeem_csv.redeemVersion,
                    script: redeem_csv.output,
                    controlBlock: p2csvtr.witness![p2csvtr.witness!.length - 1],
                },
            ],
        });

        psbt.addOutput({ value: utxos.value - 150, address: p2csvtr.address! });

        // Only one signers
        psbt.signInput(0, keypair);
    }
    ///////////////////////////

    // Finalize and send out tx
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    if (Tappath == 2) {
        for (var i = 0; i < Locktime; i++) {
            await pushBlock(p2pktr_addr)
        }
    }

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    let tx_verify = await getUTXOfromTx(tx.getId(), p2pktr_addr)
    console.log(`Get UTXO ${tx_verify}`);
}

async function bridge_unit(keypair: Signer) {

    const internalKey = keypair;
    const Threshold = 25;
    const KeyNum = 25;
    const Locktime = 5;
    const Tappath: number = 1;

    // All input have to be signed
    // So generated some random private key to sign
    const leafKeys = [];
    const leafPubkeys = [];
    for (let i = 0; i < KeyNum; i++) {
        const leafKey: Signer = ECPair.makeRandom({ network });
        leafKeys.push(leafKey);
        leafPubkeys.push(toXOnly(leafKey.publicKey));
    }

    const [p2pktr, p2csvtr, utxos] = await get_taproot_bridge(keypair, leafKeys, KeyNum, Threshold, Locktime, network);

    /////////////////////////////////
    //Path 1: update multi-sig unlock
    /////////////////////////////////
    if (Tappath == 1) {
        await pay_sig(network, utxos, p2pktr, leafKeys, Threshold, leafPubkeys)
    }

    //////////////////////////
    //Path2: update csv unlock
    //////////////////////////
    if (Tappath == 2) {
        await pay_csv(network, utxos, p2csvtr, internalKey, Locktime)
    }
}

async function bridge_unit_mulit_leaf(keypair: Signer, unlocker: number) {
    const key_first = ECPair.makeRandom({ network })
    const internalKey = keypair;
    const Threshold = 3;
    const KeyNum = 4;
    const Locktime = 5;
    const Tappath: number = 1;

    // All input have to be signed
    // So generated some random private key to sign
    const leafKeys = [];
    const leafPubkeys = [];
    for (let i = 0; i < KeyNum; i++) {
        const leafKey: Signer = ECPair.makeRandom({ network });
        leafKeys.push(leafKey);
        leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
    }

    const [p2pktr, p2csvtr, utxos, combinations] = await get_taproot_bridge_multi_leaf(keypair, leafKeys, KeyNum, Threshold, Locktime, network, key_first);
    const p2tr: bitcoin.Payment[] = p2pktr as bitcoin.Payment[]

    // Use combinations to get the keypair
    let comb_keypair: Signer[] = []
    let t_combinations: string[] = combinations as string[]
    for (let i = 0; i < t_combinations[unlocker].length; i++) {
        for (let j = 0; j < leafKeys.length; j++) {
            if (leafPubkeys[j] == t_combinations[unlocker][i]) {
                comb_keypair.push(leafKeys[j])
            }
        }
    }

    /////////////////////////////////
    //Path 1: update multi-sig unlock
    /////////////////////////////////
    if (Tappath == 1) {
        await pay_sig_multi_leaf(network, utxos, p2tr, comb_keypair, Threshold, unlocker)
    }

    //////////////////////////
    //Path2: update csv unlock
    //////////////////////////
    if (Tappath == 2) {
        await pay_csv(network, utxos, p2csvtr, internalKey, Locktime)
    }
}

async function bridge_create_and_dump() {
    const config: Config = {
        internalKey: ECPair.makeRandom({ network }).toWIF(),
        Threshold: 2,
        KeyNum: 2,
        Locktime: 5
    }

    // All input have to be signed
    // So generated some random private key to sign
    const leafKeys = [];
    const leafWIFKeys = [];
    const leafPubkeys = [];
    for (let i = 0; i < config.KeyNum; i++) {
        const leafKey: ECPairInterface = ECPair.makeRandom({ network });
        leafKeys.push(leafKey);
        leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
        leafWIFKeys.push(leafKey.toWIF())
    }
    const key = ECPair.fromWIF(config.internalKey.toString(), network)

    const [p2pktr, p2csvtr, utxos] = await get_taproot_bridge(key, leafKeys, config.KeyNum, config.Threshold, config.Locktime, network);

    fs.writeFileSync('./dump/config.json', JSON.stringify(config))
    fs.writeFileSync('./dump/leafWIFKeys.json', JSON.stringify(leafWIFKeys))
    fs.writeFileSync('./dump/p2pktr.json', JSON.stringify(p2pktr))
    fs.writeFileSync('./dump/p2csvtr.json', JSON.stringify(p2csvtr))
    fs.writeFileSync('./dump/utxos.json', JSON.stringify(utxos))

    await pushBlock("bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w")

}

async function bridge_unlock_with_dump(path: number) {

    const config: Config = JSON.parse(fs.readFileSync("./dump/config.json", "utf8"), (k, v) => {
        if (
            v !== null && typeof v === 'object' && 'type' in v && v.type === 'Buffer' && 'data' in v && Array.isArray(v.data)) {
            return Buffer.from(v.data);
        }
        return v;
    });
    const leafWIFKeys: string[] = JSON.parse(fs.readFileSync("./dump/leafWIFKeys.json", "utf8"));
    const p2pktr: payments.Payment = JSON.parse(fs.readFileSync("./dump/p2pktr.json", "utf8"), (k, v) => {
        if (
            v !== null && typeof v === 'object' && 'type' in v && v.type === 'Buffer' && 'data' in v && Array.isArray(v.data)) {
            return Buffer.from(v.data);
        }
        return v;
    });
    const p2csvtr: payments.Payment = JSON.parse(fs.readFileSync("./dump/p2csvtr.json", "utf8"), (k, v) => {
        if (
            v !== null && typeof v === 'object' && 'type' in v && v.type === 'Buffer' && 'data' in v && Array.isArray(v.data)) {
            return Buffer.from(v.data);
        }
        return v;
    });
    const utxos: IUTXO = JSON.parse(fs.readFileSync("./dump/utxos.json", "utf8"), (k, v) => {
        if (
            v !== null && typeof v === 'object' && 'type' in v && v.type === 'Buffer' && 'data' in v && Array.isArray(v.data)) {
            return Buffer.from(v.data);
        }
        return v;
    });

    let leafKeys: ECPairInterface[] = []
    let leafPubkeys = []
    for (var i = 0; i < leafWIFKeys.length; i++) {
        leafKeys.push(ECPair.fromWIF(leafWIFKeys[i].toString(), network))
        leafPubkeys.push(toXOnly(ECPair.fromWIF(leafWIFKeys[i].toString(), network).publicKey))
    }
    let key = ECPair.fromWIF(config.internalKey.toString(), network)

    /////////////////////////////////
    //Path 1: update multi-sig unlock
    /////////////////////////////////
    if (path == 1) {
        await pay_sig(network, utxos, p2pktr, leafKeys, config.Threshold, leafPubkeys)
    }

    // //////////////////////////
    // //Path2: update csv unlock
    // //////////////////////////
    if (path == 2) {
        await pay_csv(network, utxos, p2csvtr, key, config.Locktime)
    }
}

start().then(() => process.exit());



