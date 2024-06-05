import axios from 'axios'

axios.defaults.timeout = 10 * 1000 // 10s

// const apiHost = 'https://open-api.unisat.io/v1'
// const regtest_api_host = 'http://localhost:3002/api'
// const regtest_index_host = ''

export const getBalanceByAddress = async (address: string) => {
    try {
        const resp = await axios.get(`unisatapi/indexer/address/${address}/balance`)
        return resp.data
    }
    catch (e) {
        console.error(e)
    }
}

export const getAddressDetail = async (address: string) => {
    try {
        const resp = await axios.get(`/api/address/${address}`)
        return resp.data
    }
    catch (e) {
        console.error(e)
    }
}
