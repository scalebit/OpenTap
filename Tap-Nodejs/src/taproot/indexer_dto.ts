interface ApiResponse {
    code: number;
    msg: string;
    data: {
        balance: BRC20Balance[];
        inscriptions: Inscription[];
        block: BlockData[];
        tokens: Token[];
        events: Brc20Event[];
    }& Partial<Token>& Partial<BRC20Balance>& Partial<NodeInfo> & Partial<InscriptionData> & Partial<GetInscriptionFromOutPointResult>;
}

interface BRC20Balance {
    tick: string;
    availableBalance: string;
    transferableBalance: string;
    overallBalance: string;
}

interface Inscription {
    inscriptionId: string;
    inscriptionNumber: number;
    amount: string;
    tick: string;
    owner: string;
    location: string;
}

interface Brc20Event {
    eventType: string;
    tick: string;
    inscriptionId: string;
    inscriptionNumber: number;
    oldSatpoint: string;
    newSatpoint: string;
    amount: string;
    from: {
        address: string;
    };
    to: {
        address: string;
    };
    valid: boolean;
    msg: string;
}

interface BlockData {
    events: Brc20Event[];
    inscriptions: InscriptionFromBlock[];
    txid: string;
}

interface Token {
    tick: string;
    inscriptionId: string;
    inscriptionNumber: number;
    supply: string;
    burnedSupply: string;
    selfMint: boolean;
    limitPerMint: string;
    minted: string;
    decimal: number;
    deployBy: {
        address: string;
    };
    txid: string;
    deployHeight: number;
    deployBlocktime: number;
}

interface ChainInfo {
    network: string;
    ordBlockHeight: number;
    ordBlockHash: string;
    chainBlockHeight: number | null;
    chainBlockHash: string | null;
}

interface NodeInfo {
    version: string;
    branch: string;
    commitHash: string;
    buildTime: string;
    chainInfo: ChainInfo;
}

interface Action {
    new: {
        cursed: boolean;
        unbound: boolean;
    };
}

interface InscriptionFromBlock {
    action: Action;
    inscriptionNumber: number;
    inscriptionId: string;
    oldSatpoint: string;
    newSatpoint: string;
    from: {
        address: string;
    };
    to: {
        address: string;
    };
}

interface InscriptionData {
    id: string;
    number: number;
    contentType: string;
    content: string;
    contentLength: number;
    contentEncoding: string | null;
    metadata: any | null;
    metaprotocol: string | null;
    parent: string | null;
    delegate: string | null;
    pointer: string | null;
    owner: {
        address: string;
    };
    genesisHeight: number;
    genesisTimestamp: number;
    location: string;
    collections: string[];
    charms: any[];
    sat: string | null;
}

interface InscriptionDigest {
    id: string;
    number: number;
    location: string;
}

interface Result {
    txid: string;
    scriptPubKey: string;
    owner: {
        address: string;
    };
    value: number;
    inscriptionDigest: InscriptionDigest[];
}

interface GetInscriptionFromOutPointResult {
    result: Result;
    latestBlockhash: string;
    latestHeight: number;
}

