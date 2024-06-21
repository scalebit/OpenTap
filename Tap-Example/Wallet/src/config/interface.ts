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

export interface PsbtbodyType {
    from: string;
    to: string;
    amount: string;
    fee: string;
    sign: string[];  // 确保sign被定义为字符串数组
}
