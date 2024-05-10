import axios, { AxiosResponse } from "axios";
import { IUTXO } from "./utils.js"

// baseURL: `https://blockstream.info/testnet/api`

const URL = `http://user:pass@127.0.0.1:18443/`

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
                // console.log(response.data);
                // console.log(JSON.parse(JSON.stringify(response.data)));
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

