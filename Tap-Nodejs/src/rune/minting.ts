import {Runestone,EtchInscription,Rune,Terms,none,Etching,some,Range,RuneId, MintJSON} from "runelib";
import {
    initEccLib,
    script,
    payments,
    networks,
    Psbt,
} from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import ECPairFactory, { ECPairAPI } from "ecpair";
import { toXOnly } from "../taproot/utils.js"
import { Taptree } from "bitcoinjs-lib/src/types";
import { pushTrans, getUTXOfromTx,pushBlock,broadcast,getRunefromTx } from "../rpc/bitcoin_rpc.js";
const network = networks.regtest;


export async function minting() {
    initEccLib(ecc);
    const ECPair: ECPairAPI = ECPairFactory(ecc);
    const keyPair = ECPair.fromWIF("cPBwBXauJpeC2Q2CB99xtzrtA1fRDAyqApySv2QvhYCbmMsTGYy7", network)
    const p2pktr = payments.p2tr({
        pubkey: toXOnly(keyPair.publicKey),
        network
    });
    const address = p2pktr.address ?? "";
    console.log(`Waiting till UTXO is detected at this Address: ${address}`);

    let temp_trans = await pushTrans(address)
    console.log("the new txid is:", temp_trans)

    const utxo = await getUTXOfromTx(temp_trans, address)
    console.log(`Using UTXO ${utxo}`);
    await pushBlock(address as string)

    const mintstone = new Runestone([], none(), some(new RuneId(711, 2)), some(1));

    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: { value: utxo.value, script: p2pktr.output! },
        tapInternalKey: toXOnly(keyPair.publicKey)
    });

    psbt.addOutput({
        script: mintstone.encipher(),
        value: 0
    });

    psbt.addOutput({
        address: address, // rune receive address
        value: 546
    });

    const fee = 12000;

    const change = utxo.value - 546 - fee;

    psbt.addOutput({
        address: address, // change address
        value: change
    });

    psbt.signInput(0, keyPair);
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    await pushBlock(address)

    const stone_test = await getRunefromTx(txHex)
    const runeid_test = stone_test.mint.value() as RuneId;
    console.log(`RuneId:${runeid_test.block} ${runeid_test.idx}`)
}

// minting()