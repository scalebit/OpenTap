import axios, { AxiosResponse } from "axios";
import { IUTXO } from "../taproot/utils.js"

// baseURL: `https://blockstream.info/testnet/api`

const URL = `https://open-api.unisat.io/v2/`
const API_KEY = `Use your own unisat API_KEY`

export async function brc20_mint(receiveAddress: string, feeRate: number, outputValue: number, devAddress: string, devFee: number, brc20Ticker: string, brc20Amount: string, count: number) {
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

export async function brc20_deploy(receiveAddress: string, feeRate: number, outputValue: number, devAddress: string, devFee: number, brc20Ticker: string, brc20Max: string, brc20Limit: string) {
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

export async function brc20_transfer(receiveAddress: string, feeRate: number, outputValue: number, devAddress: string, devFee: number, brc20Ticker: string, brc20Amount: string) {
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