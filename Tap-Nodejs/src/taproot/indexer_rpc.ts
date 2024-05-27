import axios, { AxiosResponse } from "axios";
const API_URL = `http://127.0.0.1`

export async function getBRC20Balances(address: string): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/brc20/address/${address}/balance`;

    return new Promise<ApiResponse>((resolve, reject) => {
        try {
            axios.get(URL)
                .then(response => {
                    resolve(response.data);
                })
                .catch(error => {
                    reject(error);
                });
        } catch (error) {
            reject(error);
        }
    });
}

export async function getBrc20Transferable(address: string): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/brc20/address/${address}/transferable`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}

export async function getBrc20EventsFromBlock(blockhash: string): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/brc20/block/${blockhash}/events`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}

export async function getAllTickersInfo(): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/brc20/tick`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}

export async function getTickerInfo(ticker: string): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/brc20/tick/${ticker}`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}

export async function getTickerBalance(ticker: string, address: string): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/brc20/tick/${ticker}/address/${address}/balance`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}

export async function getTransferableBrc20(ticker: string, address: string): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/brc20/tick/${ticker}/address/${address}/transferable`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}

export async function getBrc20EventsFromTx(txid: string): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/brc20/tx/${txid}/events`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}

export async function getIndexerStatus(queryBTC?: boolean): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/node/info`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL, { params: { btc: queryBTC } })
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}

export async function getInscriptionsFromBlock(blockhash: string): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/ord/block/${blockhash}/inscriptions`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}

export async function getInscriptionById(inscriptionId: string): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/ord/id/${inscriptionId}/inscription`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}


export async function getInscriptionByNumber(inscriptionNumber: number): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/ord/number/${inscriptionNumber}/inscription`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}

export async function getInscriptionFromOutpoint(outpoint: string): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/ord/outpoint/${outpoint}/info`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}

export async function getInscriptionsFromTx(txid: string): Promise<ApiResponse> {
    const URL = `${API_URL}/api/v1/ord/tx/${txid}/inscriptions`;

    return new Promise<ApiResponse>((resolve, reject) => {
        axios.get(URL)
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                reject(new Error(`Error fetching data from ${URL}: ${error.message}`));
            });
    });
}