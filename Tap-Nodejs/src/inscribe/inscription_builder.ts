import axios, { AxiosResponse } from "axios";
import { IUTXO } from "../taproot/utils.js"
import { ECKeyPairKeyObjectOptions } from "crypto";
import { ECPairFactory, ECPairAPI, TinySecp256k1Interface, ECPairInterface } from 'ecpair';
import { taproot_address_from_asm } from "../taproot/taproot_builder.js";
import { broadcast, getUTXOfromTx, pushTrans, txBroadcastVeify } from "../taproot/bitcoin_rpc.js";
import { regtest } from "bitcoinjs-lib/src/networks.js";
import { Signer } from "bitcoinjs-lib";
import * as bitcoin from 'bitcoinjs-lib';

const URL = `https://turbo.ordinalswallet.com`
const network = { network: regtest };

export async function ins_create(keypair: Signer, p: string, data: string, txid: string) {
    const script =
        keypair.publicKey.toString('hex') +
        ' OP_CHECKSIG' +
        ' OP_0' +
        ' OP_IF ' +
        p +
        ' 01' +
        ' text/plain;charset=utf-8' +
        ' OP_0 ' +
        data +
        ' OP_ENDIF'
        ;
    let { p2tr, redeem } = taproot_address_from_asm(script, keypair)
    let addr = p2tr.address ?? "";

    const utxos = await getUTXOfromTx(txid, addr)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new bitcoin.Psbt(network);

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
    });

    psbt.addOutput({ value: utxos.value - 150, address: p2tr.address! });
    psbt.signInput(0, keypair);

    // Finalize and send out tx
    txBroadcastVeify(psbt, addr)
}

export async function fetch_inscriptions(id: string) {
    return new Promise<string>((resolve, reject) => {
        let _URL = URL + "/inscription/" + id
        try {
            axios.get(URL).then(
                firstResponse => {
                    console.log(firstResponse.data)
                    resolve(JSON.parse(JSON.stringify(firstResponse.data)).result)
                });
        } catch (error) {
            reject(error);
        }
    })
}

export async function fetch_collection(id: string) {
    return new Promise<string>((resolve, reject) => {
        let _URL = URL + "/collection/" + id
        try {
            axios.get(URL).then(
                firstResponse => {
                    console.log(firstResponse.data)
                    resolve(JSON.parse(JSON.stringify(firstResponse.data)).result)
                });
        } catch (error) {
            reject(error);
        }

    })
}

export async function fetch_wallet(address: string) {
    return new Promise<string>((resolve, reject) => {
        let _URL = URL + "/wallet/" + address
        try {
            axios.get(URL).then(
                firstResponse => {
                    console.log(firstResponse.data)
                    resolve(JSON.parse(JSON.stringify(firstResponse.data)).result)
                });
        } catch (error) {
            reject(error);
        }

    })
}


