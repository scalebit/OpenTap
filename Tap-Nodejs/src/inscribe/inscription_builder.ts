import axios from "axios";
import { taproot_address_from_asm } from "../taproot/taproot_script_builder.js";
import { getUTXOfromTx, txBroadcastVeify } from "../rpc/bitcoin_rpc.js";
import { regtest } from "bitcoinjs-lib/src/networks.js";
import { opcodes, Signer, script } from "bitcoinjs-lib";
import * as bitcoin from 'bitcoinjs-lib';
import { choose_network, toXOnly } from "../taproot/utils.js";

const URL = `https://turbo.ordinalswallet.com`

/**
 * Basic inscription builder
 *
 * @param {Signer} keypair - The number of keypair
 * @param {string} p - The mark of inscription, like ord
 * @param {string} data - The data inside an inscription
 * @param {string} type - type of the inscription, like text/plain
 * @param {string} network - The network used for taproot address
 * @returns {{ p2tr, redeem }} - return an taproot address and its reedem script
 */
export function ins_builder(keypair: Signer, p: string, data: string, type: string, network: string) {
    const ins_script = [
        toXOnly(keypair.publicKey),
        opcodes.OP_CHECKSIG,
        opcodes.OP_FALSE,
        opcodes.OP_IF,
        Buffer.from(p),
        1,
        1,
        Buffer.from(type),
        opcodes.OP_0,
        Buffer.from(data),
        opcodes.OP_ENDIF
    ];

    let { p2tr, redeem } = taproot_address_from_asm(script.compile(ins_script), keypair, network)
    return { p2tr, redeem }
}


export async function fetch_inscriptions_rpc(id: string) {
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

export async function fetch_collection_rpc(id: string) {
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

export async function fetch_wallet_rpc(address: string) {
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

/**
 * A whole process of building an inscription
 *
 * @param {Signer} keypair - The number of keypair
 * @param {string} p - The mark of inscription, like ord
 * @param {string} data - The data inside an inscription
 * @param {string} txid - The txid used to reveal
 * @param {string} type - type of the inscription, like text/plain
 * @param {string} network - The network used for taproot address
 */
export async function ins_workflow(keypair: Signer, p: string, data: string, txid: string, type: string, network: string) {
    const ins_script = [
        toXOnly(keypair.publicKey),
        opcodes.OP_CHECKSIG,
        opcodes.OP_0,
        opcodes.OP_IF,
        Buffer.from(p),
        opcodes.OP_1,
        Buffer.from(type),
        opcodes.OP_0,
        Buffer.from(data),
        opcodes.OP_ENDIF
    ];
    let { p2tr, redeem } = taproot_address_from_asm(script.compile(ins_script), keypair, network)
    let addr = p2tr.address ?? "";

    const utxos = await getUTXOfromTx(txid, addr)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new bitcoin.Psbt({ network: choose_network(network) });

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
