import axios, { AxiosResponse } from "axios";
import { BRC20UTXO, IUTXO } from "../taproot/utils.js"
import { Etching, Runestone } from "runelib";

// baseURL: `https://blockstream.info/testnet/api`

const URL = `http://user:pass@127.0.0.1:18443/`
const ORD_URL = `http://localhost/api/v1/`

export async function txBroadcastVeify(psbt: any, addr: string) {
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    let tx_verify = await getUTXOfromTx(tx.getId(), addr)
    console.log(`Get UTXO ${tx_verify}`);
}

export async function pushBlock(address: string) {
    return new Promise<string>((resolve, reject) => {
        let addr_to = address
        const data = {
            jsonrpc: "2.0",
            params: [1, addr_to],
            id: "curltext",
            method: 'generatetoaddress'
        }
        try {
            axios.post(URL, data).then(
                firstResponse => {
                    console.log(firstResponse.data)
                    resolve(JSON.parse(JSON.stringify(firstResponse.data)).result[0]);
                }
            );
        } catch (error) {
            reject(error);
        }
    })
}

export async function pushTrans(address: string, amt?: number) {
    return new Promise<string>((resolve, reject) => {
        let amount = amt ?? 0.2
        let addr_to = address
        const data = {
            jsonrpc: "2.0",
            params: [addr_to, amount, "get_for_main", "get_for_main", true, true, 1, "unset"],
            id: "curltext",
            method: 'sendtoaddress'
        }
        try {
            axios.post(URL, data).then(
                firstResponse => {
                    console.log(firstResponse.data)
                    resolve(JSON.parse(JSON.stringify(firstResponse.data)).result)
                });
        } catch (error) {
            reject(error);
        }
    })
}

export async function waitUntilUTXO(address: string) {
    return new Promise<IUTXO[]>((resolve, reject) => {
        let intervalId: any;
        const checkForUtxo = async () => {
            try {
                let addr_to = address
                const data = {
                    jsonrpc: "2.0",
                    params: [1, 6, [addr_to], true],
                    id: "curltext",
                    method: 'listunspent'
                }
                const response: AxiosResponse<string> = await axios.post(URL, data);
                const utxodata: IUTXO[] = response.data ? JSON.parse(JSON.stringify(response.data)) : undefined;
                console.log(utxodata);
                if (utxodata.length > 0) {
                    resolve(utxodata);
                    clearInterval(intervalId);
                }
            } catch (error) {
                reject(error);
                clearInterval(intervalId);
            }
        };
        intervalId = setInterval(checkForUtxo, 10000);
    });
}


export async function getUTXOfromTx(txid: string, address: string) {
    return new Promise<IUTXO>((resolve, reject) => {
        const data = {
            jsonrpc: "2.0",
            params: [txid, true],
            id: "curltext",
            method: 'getrawtransaction'
        }
        try {
            axios.post(URL, data).then(
                firstResponse => {
                    // Parse to Json
                    let txjson = JSON.parse(JSON.stringify(firstResponse.data))
                    // console.log(txjson)
                    // console.log(txjson.result.vout)
                    for (var i = 0; i < txjson.result.vout.length; i++) {
                        // console.log(txjson.result.vout[i])
                        let out = JSON.parse(JSON.stringify(txjson.result.vout[i]));
                        if (out.scriptPubKey.address == address) {
                            console.log(out)
                            let UTXO: IUTXO = {
                                txid: txjson.result.txid,
                                vout: out.n,
                                address: out.scriptPubKey.address,
                                status: {
                                    confirmed: true,
                                    block_height: txjson.result.weight,
                                    block_hash: txjson.result.blockhash,
                                    block_time: txjson.result.blocktime,
                                },
                                value: parseInt((out.value * 100000000).toString())
                            }
                            resolve(UTXO);
                        }
                    }
                })
        }
        catch (error) {
            reject(error);
        }
    });
}

export async function getALLUTXOfromTx(txid: string, address: string) {
    return new Promise<IUTXO[]>((resolve, reject) => {
        const data = {
            jsonrpc: "2.0",
            params: [txid, true],
            id: "curltext",
            method: 'getrawtransaction'
        }
        try {
            axios.post(URL, data).then(
                firstResponse => {
                    let ALL_UTXO: IUTXO[] = []
                    // Parse to Json
                    let txjson = JSON.parse(JSON.stringify(firstResponse.data))
                    // console.log(txjson)
                    // console.log(txjson.result.vout)
                    for (var i = 0; i < txjson.result.vout.length; i++) {
                        // console.log(txjson.result.vout[i])
                        let out = JSON.parse(JSON.stringify(txjson.result.vout[i]));

                        console.log(out)
                        let UTXO: IUTXO = {
                            txid: txjson.result.txid,
                            vout: out.n,
                            address: out.scriptPubKey.address,
                            status: {
                                confirmed: true,
                                block_height: txjson.result.weight,
                                block_hash: txjson.result.blockhash,
                                block_time: txjson.result.blocktime,
                            },
                            value: parseInt((out.value * 100000000).toString())
                        }
                        ALL_UTXO.push(UTXO)
                    }
                    resolve(ALL_UTXO);
                })
        }
        catch (error) {
            reject(error);
        }
    });
}

export async function getAllUTXOfromAddress(address: string) {
    return new Promise<IUTXO[]>((resolve, reject) => {
        const data = {
            jsonrpc: "2.0",
            params: [`start`, [`addr(${address})`]],
            id: "curltext",
            method: 'scantxoutset'
        }
        try {
            axios.post(URL, data).then(
                firstResponse => {
                    let ALL_UTXO: IUTXO[] = []
                    // Parse to Json
                    let txjson = JSON.parse(JSON.stringify(firstResponse.data))
                    // console.log(txjson.result.length)
                    for (var i = 0; i < txjson.result.unspents.length; i++) {
                        let UTXO: IUTXO = {
                            txid: txjson.result.unspents[i].txid,
                            vout: txjson.result.unspents[i].vout,
                            address,
                            status: {
                                confirmed: true,
                                block_height: txjson.result.unspents[i].height,
                                block_hash: "",
                                block_time: 0,
                            },
                            value: parseInt((txjson.result.unspents[i].amount * 100000000).toString())
                        }
                        ALL_UTXO.push(UTXO)
                    }
                    resolve(ALL_UTXO);
                })
        }
        catch (error) {
            reject(error);
        }
    });
}

export async function getBRC20FromALLUTXO(utxo: IUTXO[]) {
    return new Promise<BRC20UTXO[]>(async (resolve, reject) => {
        try {
            let ALL_UTXO: BRC20UTXO[] = []
            for (var i = 0; i < utxo.length; i++) {
                await axios.get(ORD_URL + `brc20/tx/${utxo[i].txid}/events`).then(
                    firstResponse => {
                        // Parse to Json
                        let txjson = JSON.parse(JSON.stringify(firstResponse.data))
                        for (let j = 0; j < txjson.data.events.length; j++) {
                            if ((txjson.data.events[j].type == "transfer" || txjson.data.events[j].type == "mint") && txjson.data.events[j].to.address == utxo[i].address) {
                                let tempbrc: BRC20UTXO = {
                                    txid: txjson.data.txid,
                                    vout: utxo[i].vout,
                                    address: utxo[i].address,
                                    status: {
                                        confirmed: utxo[i].status.confirmed,
                                        block_height: utxo[i].status.block_height,
                                        block_hash: utxo[i].status.block_hash,
                                        block_time: utxo[i].status.block_time,
                                    },
                                    brc20: {
                                        tick: txjson.data.events[j].tick,
                                        value: txjson.data.events[j].amount,
                                    },
                                    value: utxo[i].value,
                                }
                                ALL_UTXO.push(tempbrc)
                            }
                        }
                    })
            }
            resolve(ALL_UTXO)
        }
        catch (error) {
            reject(error);
        }
    });
}

export async function getBRC20FromUTXO(utxo: IUTXO) {
    return new Promise<BRC20UTXO[]>((resolve, reject) => {
        try {
            let ALL_UTXO: BRC20UTXO[] = []

            axios.get(ORD_URL + `brc20/tx/${utxo.txid}/events`).then(
                firstResponse => {
                    // Parse to Json
                    let txjson = JSON.parse(JSON.stringify(firstResponse.data))
                    console.log(txjson.data.events)
                    for (let j = 0; j < txjson.data.events.length; j++) {
                        if (txjson.data.events[j].type == "transfer" && txjson.data.events[j].to.address == utxo.address) {
                            let tempbrc: BRC20UTXO = {
                                txid: txjson.data.txid,
                                vout: utxo.vout,
                                address: utxo.address,
                                status: {
                                    confirmed: utxo.status.confirmed,
                                    block_height: utxo.status.block_height,
                                    block_hash: utxo.status.block_hash,
                                    block_time: utxo.status.block_time,
                                },
                                brc20: {
                                    tick: txjson.data.events[j].tick,
                                    value: txjson.data.events[j].amount,
                                },
                                value: utxo.value,
                            }
                            ALL_UTXO.push(tempbrc)
                        }
                    }
                })
            resolve(ALL_UTXO)
        }
        catch (error) {
            reject(error);
        }
    });
}

export async function getTick(ticker: string) {
    return new Promise<any>((resolve, reject) => {
        try {
            axios.get(ORD_URL + `/api/v1/brc20/tick/${ticker}`).then(
                firstResponse => {
                    // Parse to Json
                    let txjson = JSON.parse(JSON.stringify(firstResponse.data))
                    resolve(txjson.data)
                })
        }
        catch (error) {
            reject(error);
        }
    });
}

export async function broadcast(txHex: string) {
    return new Promise<string>((resolve, reject) => {
        const data = {
            jsonrpc: "2.0",
            params: [txHex],
            id: "curltext",
            method: 'sendrawtransaction'
        }
        try {
            axios.post(URL, data).then(
                firstResponse => {
                    // Parse to Json
                    let txjson = JSON.parse(JSON.stringify(firstResponse.data))
                    // Sendrawtransaction return the txid, but not hex
                    // RPC document is incorrect
                    console.log(txjson)
                    resolve(txjson.result);
                    // console.log(txjson.result.vout)
                })
        }
        catch (error) {
            reject(error);
        }
    });
}

export async function broadcastraw(txHex: string) {
    return new Promise<string>((resolve, reject) => {
        const data = {
            jsonrpc: "2.0",
            params: [txHex, 0, 1000],
            id: "curltext",
            method: 'sendrawtransaction'
        }
        try {
            axios.post(URL, data).then(
                firstResponse => {
                    // Parse to Json
                    let txjson = JSON.parse(JSON.stringify(firstResponse.data))
                    // Sendrawtransaction return the txid, but not hex
                    // RPC document is incorrect
                    console.log(txjson)
                    resolve(txjson.result);
                    // console.log(txjson.result.vout)
                })
        }
        catch (error) {
            reject(error);
        }
    });

}

export async function getRunefromTx(txid: string) {
    return new Promise<Runestone>((resolve, reject) => {
        const data = {
            jsonrpc: "2.0",
            params: [txid, true],
            id: "curltext",
            method: 'getrawtransaction'
        }
        try {
            axios.post(URL, data).then(
                firstResponse => {
                    // Parse to Json
                    let txjson = JSON.parse(JSON.stringify(firstResponse.data))
                    console.log(txjson.result.hex)
                    const rune_stone = Runestone.decipher(txjson.result.hex).value() as Runestone;
                    if (rune_stone != null) {
                        resolve(rune_stone)

                    } else {
                        console.log("No Rune in this tx")
                    }

                })
        }
        catch (error) {
            reject(error);
        }
    });
}