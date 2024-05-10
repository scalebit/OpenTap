import {
    initEccLib,
    Signer,
    crypto,
} from "bitcoinjs-lib";
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory, ECPairAPI } from 'ecpair';
import varuint from "varuint-bitcoin";
import * as tinysecp from 'tiny-secp256k1'

initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);

export function tweakSigner(signer: Signer, opts: any = {}): Signer {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let privateKey: Uint8Array | undefined = signer.privateKey!;
    if (!privateKey) {
        throw new Error('Private key is required for tweaking signer!');
    }
    if (signer.publicKey[0] === 3) {
        privateKey = tinysecp.privateNegate(privateKey);
    }

    const tweakedPrivateKey = tinysecp.privateAdd(
        privateKey,
        tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash),
    );
    if (!tweakedPrivateKey) {
        throw new Error('Invalid tweaked private key!');
    }

    // To import private key
    // console.log()

    return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
        network: opts.network,
    })

}

export function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer {
    return crypto.taggedHash(
        'TapTweak',
        Buffer.concat(h ? [pubKey, h] : [pubKey]),
    );
}

export function toXOnly(pubkey: Buffer): Buffer {
    return pubkey.subarray(1, 33)
}

export function witnessStackToScriptWitness(witness: Buffer[]) {
    let buffer = Buffer.allocUnsafe(0)

    function writeSlice(slice: Buffer) {
        buffer = Buffer.concat([buffer, Buffer.from(slice)])
    }

    function writeVarInt(i: number) {
        const currentLen = buffer.length;
        const varintLen = varuint.encodingLength(i)

        buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)])
        varuint.encode(i, buffer, currentLen)
    }

    function writeVarSlice(slice: Buffer) {
        writeVarInt(slice.length)
        writeSlice(slice)
    }

    function writeVector(vector: Buffer[]) {
        writeVarInt(vector.length)
        vector.forEach(writeVarSlice)
    }

    writeVector(witness)

    return buffer
}

export function createKeySpendOutput(publicKey: any) {
    // x-only pubkey (remove 1 byte y parity)
    const myXOnlyPubkey = publicKey.slice(1, 33);
    const commitHash = bitcoin.crypto.taggedHash('TapTweak', myXOnlyPubkey);
    const tweakResult = tinysecp.xOnlyPointAddTweak(myXOnlyPubkey, commitHash);
    if (tweakResult === null) throw new Error('Invalid Tweak');
    const { xOnlyPubkey: tweaked } = tweakResult;
    // scriptPubkey
    return Buffer.concat([
        // witness v1, PUSH_DATA 32 bytes
        Buffer.from([0x51, 0x20]),
        // x-only tweaked pubkey
        tweaked,
    ]);
}

export interface IUTXO {
    txid: string;
    vout: number;
    address: string;
    status: {
        confirmed: boolean;
        block_height: number;
        block_hash: string;
        block_time: number;
    };
    value: number;
}

export interface Config {
    internalKey: string,
    Threshold: number,
    KeyNum: number,
    Locktime: number
}
