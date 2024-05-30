import axios from 'axios'

axios.defaults.timeout = 10 * 1000 // 10s

const apiHost = 'https://open-api.unisat.io/v1'

export const getBalanceByAddress = async (address: string) => {
    try {
        const resp = await axios.get(`${apiHost}/indexer/address/${address}/balance`)
        return resp.data
    }
    catch (e) {
        console.error(e)
    }
}
