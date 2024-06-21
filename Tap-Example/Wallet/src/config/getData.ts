import axios from 'axios'
import { getAllUTXOfromAddress } from 'opentap-v0.14/src/rpc/bitcoin_rpc'
import { auto_choose_UTXO } from 'opentap-v0.14/src/taproot/transaction_builder'
import { IUTXO } from 'opentap-v0.14/src/taproot/utils'

axios.defaults.timeout = 10 * 1000 // 10s

// const apiHost = 'https://open-api.unisat.io/v1'
// const regtest_api_host = 'http://localhost:3002/api'
// const regtest_index_host = ''

export const getBalanceByAddress = async (address: string) => {
    try {
        const resp = await axios.get(`/unisatapi/indexer/address/${address}/balance`)
        return resp.data
    }
    catch (e) {
        console.error(e)
    }
}

export const getAddressDetail = async (address: string) => {
    try {
        const resp = await axios.get(`/rpcapi/address/${address}`)
        return resp.data
    }
    catch (e) {
        console.error(e)
    }
}

export const getUTXO = async (address: string, amt: number) => {
    try {
        const data = {
            jsonrpc: "2.0",
            params: [`start`, [`addr(${address})`]],
            id: "curltext",
            method: 'scantxoutset'
        }
        const res = await axios.post(`/opentap-regtest`, data)
        const ALL_UTXO: IUTXO[] = []
        // Parse to Json
        const txjson = JSON.parse(JSON.stringify(res.data))
        // console.log(txjson.result.length)
        for (let i = 0; i < txjson.result.unspents.length; i++) {
            const UTXO: IUTXO = {
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
        return auto_choose_UTXO(ALL_UTXO, amt)
    }
    catch (e) {
        console.error(e)
    }
}

export const txBroadcast = async (txHex: string) => {
    try {
        const data = {
            jsonrpc: "2.0",
            params: [`${txHex}`],
            id: "curltext",
            method: 'sendrawtransaction'
        }
        const res = await axios.post(`/opentap-regtest`, data)
        const txid = JSON.parse(JSON.stringify(res.data.result))
        return txid
    }
    catch (e) {
        console.error(e)
    }
}

export const getAllTick = async () => {
    try {
        const resp = await axios.get(`/ord-regtest/api/v1/brc20/tick`)
        console.log(resp.data.data)
        return resp.data.data
    }
    catch (e) {
        console.error(e)
    }
}

export const getAllTickBalance = async (address: string) => {
    try {
        const resp = await axios.get(`/ord-regtest/api/v1/brc20/address/${address}/balance`)
        return resp.data.data
    }
    catch (e) {
        console.error(e)
    }
}

export async function getUTXOfromTx(txid: string) {
    try {
        const data = {
            jsonrpc: "2.0",
            params: [txid, true],
            id: "curltext",
            method: 'getrawtransaction'
        }
        const res = await axios.post(`/opentap-regtest`, data)
        const txjson = JSON.parse(JSON.stringify(res.data))
        const ALL_UTXO: IUTXO[] = []
        for (let i = 0; i < txjson.result.vout.length; i++) {
            // console.log(txjson.result.vout[i])
            const out = JSON.parse(JSON.stringify(txjson.result.vout[i]));
            console.log(out)
            const UTXO: IUTXO = {
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
        return ALL_UTXO
    }
    catch (error) {
        console.log(error);
    }
}