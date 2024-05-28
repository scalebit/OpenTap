export interface IPublicKey {
    tag: string
    publicKey: string
}

export interface IBalance {
    confirmed: number
    unconfirmed: number
    total: number
}

export interface IWallet {
    walletName: string
    address: string
}

export interface AnyObject {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}
