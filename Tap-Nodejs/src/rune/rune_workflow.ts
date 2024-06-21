import {Runestone,EtchInscription,Rune,Terms,none,Etching,some,Range} from "runelib";
import {
    initEccLib,
    script,
    payments,
    networks,
    Psbt,
} from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import ECPairFactory, { ECPairAPI } from "ecpair";
import { toXOnly } from "../taproot/utils.js"
import { Taptree } from "bitcoinjs-lib/src/types";
import { pushTrans, getUTXOfromTx,pushBlock,broadcast,getRunefromTx } from "../rpc/bitcoin_rpc.js";
import {etching} from "./etching"
import {minting} from "./minting"
import {transferring} from "./transferring"

async function start() {
    etching()
    // minting()
    // transferring()
    
}

start()