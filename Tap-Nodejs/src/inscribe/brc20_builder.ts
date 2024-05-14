import axios, { AxiosResponse } from "axios";
import { toXOnly } from "../taproot/utils";
import { Signer, opcodes, script } from "bitcoinjs-lib";
import { taproot_address_from_asm } from "../taproot/taproot_script_builder";
import { getUTXOfromTx, txBroadcastVeify } from "../taproot/bitcoin_rpc";
import * as bitcoin from 'bitcoinjs-lib';
import { regtest } from "bitcoinjs-lib/src/networks";

const URL = `https://open-api.unisat.io/v2/`
const API_KEY = `Use your own unisat API_KEY`
const network = { network: regtest };


export function brc20_op(op: string, tick: string, amt: string, lim: string) {
    switch (op) {
        case "deploy":
            return `{"p":"brc-20","op":"mint","tick":"${tick}","max":"${amt}","lim":"${lim}"}`
        case "mint":
            return `{"p":"brc-20","op":"mint","tick":"${tick}","amt":"${amt}"}`
        case "transfer":
            return `{"p":"brc-20","op":"transfer","tick":"${tick}","amt":"${amt}"}`
    }
}


export async function brc20_send(keypair: Signer, p: string, data: string, txid: string) {
    const ins_script = [
        toXOnly(keypair.publicKey),
        opcodes.OP_CHECKSIG,
        opcodes.OP_0,
        opcodes.OP_IF,
        // in normal situation, p = 'ord'
        Buffer.from(p),
        1,
        Buffer.from('text/plain;charset=utf-8'),
        opcodes.OP_0,
        Buffer.from(data),
        opcodes.OP_ENDIF
    ];
    let { p2tr, redeem } = taproot_address_from_asm(script.compile(ins_script), keypair)
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

export async function brc20_mint_rpc(receiveAddress: string, feeRate: number, outputValue: number, devAddress: string, devFee: number, brc20Ticker: string, brc20Amount: string, count: number) {
    return new Promise<string>((resolve, reject) => {
        const data = {
            headers: { "Authorization": `Bearer ${API_KEY}` },
            jsonrpc: "2.0",
            body: {
                receiveAddress,
                feeRate,
                outputValue,
                devAddress,
                devFee,
                brc20Ticker,
                brc20Amount,
                count
            }
        }
        let _URL = URL + "inscribe/order/create/brc20-mint"
        try {
            axios.post(_URL, data).then(
                firstResponse => {
                    console.log(firstResponse.data)
                    resolve(JSON.parse(JSON.stringify(firstResponse.data)).result)
                });
        } catch (error) {
            reject(error);
        }
    })
}

export async function brc20_deploy_rpc(receiveAddress: string, feeRate: number, outputValue: number, devAddress: string, devFee: number, brc20Ticker: string, brc20Max: string, brc20Limit: string) {
    return new Promise<string>((resolve, reject) => {
        const data = {
            headers: { "Authorization": `Bearer ${API_KEY}` },
            jsonrpc: "2.0",
            body: {
                receiveAddress,
                feeRate,
                outputValue,
                devAddress,
                devFee,
                brc20Ticker,
                brc20Max,
                brc20Limit
            }
        }
        let _URL = URL + "inscribe/order/create/brc20-deploy"
        try {
            axios.post(_URL, data).then(
                firstResponse => {
                    console.log(firstResponse.data)
                    resolve(JSON.parse(JSON.stringify(firstResponse.data)).result)
                });
        } catch (error) {
            reject(error);
        }
    })
}

export async function brc20_transfer_rpc(receiveAddress: string, feeRate: number, outputValue: number, devAddress: string, devFee: number, brc20Ticker: string, brc20Amount: string) {
    return new Promise<string>((resolve, reject) => {
        const data = {
            headers: { "Authorization": `Bearer ${API_KEY}` },
            jsonrpc: "2.0",
            body: {
                receiveAddress,
                feeRate,
                outputValue,
                devAddress,
                devFee,
                brc20Ticker,
                brc20Amount
            }
        }
        let _URL = URL + "inscribe/order/create/brc20-transfer"
        try {
            axios.post(_URL, data).then(
                firstResponse => {
                    console.log(firstResponse.data)
                    resolve(JSON.parse(JSON.stringify(firstResponse.data)).result)
                });
        } catch (error) {
            reject(error);
        }
    })
}