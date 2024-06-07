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
const network = networks.regtest;

export async function etching(){
    initEccLib(ecc);
    const ECPair: ECPairAPI = ECPairFactory(ecc);
    const keyPair = ECPair.fromWIF("cPBwBXauJpeC2Q2CB99xtzrtA1fRDAyqApySv2QvhYCbmMsTGYy7", network)

    const ins = new EtchInscription()
    const name = "CCCCCCCCCCCCCCCCCCNH";
    ins.setContent("text/plain", Buffer.from('scrypt is best', 'utf-8'))
    ins.setRune(name)

    const etching_script_asm = `${toXOnly(keyPair.publicKey).toString(
        "hex"
    )} OP_CHECKSIG`;
    const etching_script = Buffer.concat([script.fromASM(etching_script_asm), ins.encipher()]);

    const scriptTree: Taptree = {
        output: etching_script,
    }

    const script_p2tr = payments.p2tr({
        internalPubkey: toXOnly(keyPair.publicKey),
        scriptTree,
        network,
    });

    const etching_redeem = {
        output: etching_script,
        redeemVersion: 192
    }

    const etching_p2tr = payments.p2tr({
        internalPubkey: toXOnly(keyPair.publicKey),
        scriptTree,
        redeem: etching_redeem,
        network
    });

    const address = script_p2tr.address ?? "";
    console.log("send coin to address", address);

    let temp_trans = await pushTrans(address)
    console.log("the new txid is:", temp_trans)

    await pushBlock(address)

    const utxos = await getUTXOfromTx(temp_trans, address)

    console.log(`Using UTXO ${utxos}`);

    const psbt = new Psbt({ network });

    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: script_p2tr.output! },
        tapLeafScript: [
            {
                leafVersion: etching_redeem.redeemVersion,
                script: etching_redeem.output,
                controlBlock: etching_p2tr.witness![etching_p2tr.witness!.length - 1]
            }
        ]
    });

    const rune = Rune.fromName(name)
    const amount = 1000;
    const cap = 21000;
    const terms = new Terms(amount, cap, new Range(none(), none()), new Range(none(), none()))
    const symbol = "$"
    const premine = none();
    const divisibility = none();
    const etching = new Etching(divisibility, premine, some(rune), none(), some(symbol), some(terms), true);

    const stone = new Runestone([], some(etching), none(), none());

    psbt.addOutput({
        script: stone.encipher(),
        value: 0
    })

    const fee = 5000;

    const change = utxos.value - 546 - fee;

    psbt.addOutput({
        address: address, // ord address
        value: 546
    });

    psbt.addOutput({
        address: address, // change address
        value: change
    });

    psbt.signInput(0, keyPair);
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);


    // const stone_test = Runestone.decipher(tx.toHex()).value() as Runestone;
    // const etching_test = stone_test.etching.value() as Etching;
    // console.log(`Stone Name:${etching_test.rune.value()?.name}`)

    await pushBlock(address)

    const stone_test = await getRunefromTx(txHex)
    const etching_test = stone_test.etching.value() as Etching;
    console.log(`Stone Name:${etching_test.rune.value()?.name}`)

}

// etching()