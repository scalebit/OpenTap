import * as fs from 'fs';

const config = {
    network: "regtest",
    interval: 1000,
    price_interval: 10000,
    committee_number: 3,
    threshold: 1,
    port: process.env.PORT,
    urltoken: "8h18@#vhi12jSG!9PPk",
    db: {
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASS,
        database: process.env.MYSQL_DBNAME
    },
    b2: {
        network: process.env.NETWORK,
        valutAddress: process.env.B2_VALUT,
        limitAddress: process.env.B2_LIMIT,
        bridgeAddress: process.env.B2_BRIDGE,
        configAddress: process.env.B2_CONFIG,
        comAddress: process.env.B2_COM,
        tokenAddress: process.env.B2_TOKEN,
        url: "https://b2-mainnet.alt.technology",
        recoveryPhrase: process.env.B2_ACCOUNT_RECOVERY_PHRASE,
    },
    aptos: {
        network: process.env.NETWORK,
        bridgeAddress: process.env.APTOS_BRIDGE,
        wsurl: "",
        url: "https://fullnode.mainnet.aptoslabs.com",
        coinstore: "0x1::coin::CoinStore<0x4e1854f6d332c9525e258fb6e66f84b6af8aba687bbcb832a24768c4e175feec::abtc::ABTC>",
        recoveryPhrase: process.env.APTOS_ACCOUNT_RECOVERY_PHRASE,
    },
    B2BridgeAbi: JSON.parse(fs.readFileSync("./src/abi/abi.json", "utf8")).abi,
    committee: [process.env.c1, process.env.c2, process.env.c3]
};

export default config;
