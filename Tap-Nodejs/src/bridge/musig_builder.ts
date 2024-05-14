import {
    initEccLib,
    networks,
    script,
    Signer,
    payments,
    crypto,
    Psbt
} from "bitcoinjs-lib";
import { pushTrans, getUTXOfromTx } from "../taproot/bitcoin_rpc.js";
import { ECPairFactory, ECPairAPI } from 'ecpair';
import { Buff } from '@cmdcode/buff'
import * as musig from "@cmdcode/musig2"
import * as tinysecp from 'tiny-secp256k1'
import { schnorr } from '@noble/curves/secp256k1'
import { sha256 } from "bitcoinjs-lib/src/crypto.js";
import { toXOnly } from "../taproot/utils.js"

initEccLib(tinysecp);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const network = networks.regtest;

// Test schnorr
export function test1() {
    // Take it as txid hash
    const encoder = new TextEncoder()
    const preimage = encoder.encode('txidhash')
    const message = sha256(Buffer.from(preimage))

    // Encode an example string as bytes.
    let wallets = get_agg_keypair(5)
    let options = get_option(wallets)
    let pub = get_agg_pub(wallets, options)
    let sign = get_agg_sign(wallets, options, message)

    // Check if the signature is valid.
    const isValid2 = schnorr.verify(sign, message, pub)
    if (isValid2) { console.log('The signature should validate using another library.') }

    const isValid1 = tinysecp.verifySchnorr(message, pub, sign);
    if (isValid1) { console.log('The test demo should produce a valid signature.') }
}

// Schonrr Verify
export async function test2() {
    try {
        // Encode an example string as bytes.
        let wallets = get_agg_keypair(5)
        let options = get_option(wallets)
        let pub = get_agg_pub(wallets, options)

        console.log('Testing schnorr tx.')

        // Generate an address from the tweaked public key
        const keypair = ECPair.makeRandom({ network });
        const p2pktr = payments.p2tr({
            pubkey: toXOnly(keypair.publicKey),
            network
        });

        // const p2pktr = payments.p2tr({
        //     pubkey: Buffer.from(pub),
        //     network
        // });

        const p2pktr_addr = p2pktr.address ?? "";
        console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`)

        // push trans but not confirm
        let temp_trans = await pushTrans(p2pktr_addr)
        console.log("the new txid is:", temp_trans)

        // get UTXO
        const utxos = await getUTXOfromTx(temp_trans, p2pktr_addr)
        console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

        const psbt = new Psbt({ network });
        psbt.addInput({
            hash: utxos.txid,
            index: utxos.vout,
            witnessUtxo: { value: utxos.value, script: p2pktr.output! },
            tapInternalKey: pub
        });

        // utxos.value
        psbt.addOutput({
            address: "bcrt1q5hk8re6mar775fxnwwfwse4ql9vtpn6x558g0w", // main wallet address 
            value: utxos.value - 150
        });

        // Can use validator to get input hash
        let msg: any;

        const schnorrValidator = (
            pubkey: Buffer,
            msghash: Buffer,
            signature: Buffer,
        ): boolean => {
            msg = msghash;
            return tinysecp.verifySchnorr(msghash, pubkey, signature);
        }

        // Sign hash
        let sign = get_agg_sign(wallets, options, msg!)

        const partialSig = [
            {
                pubkey: pub,
                signature: sign,
            },
        ];
        psbt.updateInput(0, { partialSig })

        psbt.updateInput
        psbt.finalizeAllInputs();

        console.log("Input Finalized")

        let isValid1 = psbt.validateSignaturesOfInput(0, schnorrValidator, pub)
        if (isValid1) { console.log('The test demo should produce a valid signature.') }
    } catch (error) {
        console.error('发生错误:', error);
    }
}

export function get_agg_keypair(num: number) {
    // Let's create an example list of signers.
    const signers: any[] = []
    for (var i = 0; i < num; i++) {
        signers.push("generate" + i);
    }
    // We'll store each member's wallet in an array.
    const wallets: any[] = []
    // Setup a dummy wallet for each signer.
    for (const name of signers) {
        // Generate some random secrets using WebCrypto.
        const secret = Buff.random(32)
        // const key = Buff.random(32)
        const nonce = Buff.random(64)
        // Create a pair of signing keys.
        const [sec_key, pub_key] = musig.keys.get_keypair(secret)
        // Create a pair of nonces (numbers only used once).
        const [sec_nonce, pub_nonce] = musig.keys.get_nonce_pair(nonce)
        // Add the member's wallet to the array.
        wallets.push({
            name, sec_key, pub_key, sec_nonce, pub_nonce
        })
    }

    // Collect public keys and nonces from all signers.
    return wallets;
}

export function get_agg_pub(wallets: any[], options: any) {
    // Encode an example string as bytes.
    const encoder = new TextEncoder()
    const message = encoder.encode('agg')

    const group_keys = wallets.map(e => e.pub_key)
    const group_nonces = wallets.map(e => e.pub_nonce)

    const ctx = musig.get_ctx(group_keys, group_nonces, message, options)

    const { group_pubkey } = ctx
    return group_pubkey
}

export function get_option(wallets: any[]) {
    // use option 32
    // use random, please use Buff.random(32)
    const options = { key_tweaks: [Buff.random(32), Buff.random(32)] }
    return options
}

export function get_agg_sign(wallets: any[], options: any, message: any) {

    const group_keys = wallets.map(e => e.pub_key)
    const group_nonces = wallets.map(e => e.pub_nonce)

    const ctx = musig.get_ctx(group_keys, group_nonces, message, options)

    // Each member creates their own partial signature,
    // using their own computed signing session.
    const group_sigs = wallets.map(wallet => {
        return musig.musign(
            ctx,
            wallet.sec_key,
            wallet.sec_nonce
        )
    })

    // Combine all the partial signatures into our final signature.
    const signature = musig.combine_psigs(ctx, group_sigs)

    return signature;
};