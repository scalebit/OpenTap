import axios, { AxiosResponse } from "axios";
import { IUTXO } from "./utils.js"

// baseURL: `https://blockstream.info/testnet/api`

const URL = `https://turbo.ordinalswallet.com`


export async function fetchInscriptions(offset: any) {
    console.log(`Fethcing inscription list with offset: ${offset}...`);
    const res = await axios.get(`${URL}/inscriptions`, {
        params: {
            offset,
        },
    });
    console.log(res.data);
    return res.data;
}