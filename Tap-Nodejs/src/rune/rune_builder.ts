// Ref joundy
// https://github.com/joundy/bitcoin-rune-creator-js

import { Runestone, SpacedRune, Symbol } from "runestone-js";
import { U128, U32 } from "big-varuint-js";
import { toXOnly } from "../taproot/utils";
import {
    initEccLib,
    opcodes,
    script,
    payments,
    networks,
    Psbt,
} from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import ECPairFactory, { ECPairAPI, Signer } from "ecpair";
import { taproot_address_from_asm } from "../taproot/taproot_script_builder";
import { pushTrans, txBroadcastVeify } from "../rpc/bitcoin_rpc";


initEccLib(ecc);
const ECPair: ECPairAPI = ECPairFactory(ecc);
// DEFINE the network
// please note, this script only tested on regtest & testnet
// *DO NOT USE script on mainnet/production without any concern DWYOR
const network = networks.regtest;
const RUNE_RECEIVE_VALUE = 600;
const network_ = "regtest"

function createRune() {
    const spacedRune = SpacedRune.fromString("Open-Rune");
    const runestone = new Runestone({
        edicts: [],
        pointer: new U32(0n),
        etching: {
            rune: spacedRune.rune,
            spacers: spacedRune.spacers,
            premine: new U128(1000_000n),
            symbol: Symbol.fromString("R"),
            terms: {
                amount: new U128(1000n),
                cap: new U128(100n),
            },
        },
    });

    const buffer = runestone.enchiper();

    return { buffer, commitBuffer: runestone.etching?.rune?.commitBuffer() };
}

function createMintPayment(keypair: Signer, commitBuffer: Buffer, network: string) {
    // example witness + text inscription
    // *commit buffer is required
    const rune_script = [
        toXOnly(keypair.publicKey),
        opcodes.OP_CHECKSIG,
        opcodes.OP_FALSE,
        opcodes.OP_IF,
        Buffer.from("ord", "utf8"),
        1,
        1,
        Buffer.concat([Buffer.from("text/plain;charset=utf-8", "utf8")]),
        1,
        2,
        opcodes.OP_0,
        1,
        13,
        commitBuffer,
        opcodes.OP_0,
        Buffer.concat([Buffer.from("Hello World", "utf8")]),
        opcodes.OP_ENDIF,
    ];

    let { p2tr, redeem } = taproot_address_from_asm(script.compile(rune_script), keypair, network)

    return {
        p2tr,
        redeem,
    };
}

function createPsbt(
    keypair: Signer,
    payment: payments.Payment,
    redeem: {
        output: Buffer;
        redeemVersion: number;
    },
    hash: string,
    index: number,
    satValue: number,
    receiverAddress: string,
    runeBuffer: Buffer,
) {
    const psbt = new Psbt({ network });
    psbt.addInput({
        hash,
        index,
        tapInternalKey: toXOnly(keypair.publicKey),
        witnessUtxo: {
            script: payment.output!,
            value: satValue,
        },
        tapLeafScript: [
            {
                leafVersion: redeem.redeemVersion,
                script: redeem.output,
                controlBlock: payment.witness![payment.witness!.length - 1],
            },
        ],
    });

    // this only used when then premine and pointer value is pointed to this index
    // otherwise this will become dust utxo
    // alternativaly you can just ignore this output if premine/pointer is not used.
    psbt.addOutput({
        address: receiverAddress,
        value: RUNE_RECEIVE_VALUE,
    });

    const runeScript = script.compile([
        opcodes.OP_RETURN,
        opcodes.OP_13,
        runeBuffer,
    ]);
    psbt.addOutput({
        script: runeScript,
        value: 0,
    });

    return psbt;
}

function calculateFee(
    psbt: Psbt,
    keypair: Signer
) {
    psbt.signAllInputs(keypair);
    psbt.finalizeAllInputs();
    const vSize = psbt.extractTransaction(true).virtualSize();
    return vSize;
}

async function test_rune() {
    const keypair = ECPair.fromWIF("cPBwBXauJpeC2Q2CB99xtzrtA1fRDAyqApySv2QvhYCbmMsTGYy7", network)

    // Create payment address and fund the balance
    const rune = createRune();
    const { p2tr, redeem } = createMintPayment(keypair, rune.commitBuffer!, network_);
    const receiverAddress = "bcrt1p7xs0js658s3h7k80uweszex7esm4eyds62nhjrf8mpggtkrk9ztstqjx46";

    const temp_trans_1 = await pushTrans(p2tr.address ?? "")
    // create tx
    const tx = createPsbt(
        keypair,
        p2tr,
        redeem,
        temp_trans_1,
        0,
        1000,
        receiverAddress,
        rune.buffer,
    );

    const fee = calculateFee(
        tx,
        keypair
    );
    const fundValue = fee + RUNE_RECEIVE_VALUE;

    const temp_trans_2 = await pushTrans(p2tr.address ?? "", fundValue)
    // *this is required due to the ORD server checker to prevent front running transactions.

    // Create mint transaction
    const psbt = createPsbt(
        keypair,
        p2tr,
        redeem,
        temp_trans_2,
        0,
        fundValue,
        receiverAddress,
        rune.buffer,
    );
    txBroadcastVeify(psbt, p2tr.address ?? "")
}
