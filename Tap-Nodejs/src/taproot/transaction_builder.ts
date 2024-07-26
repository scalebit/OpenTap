
import { Psbt } from "bitcoinjs-lib";
import { broadcast, getUTXOfromTx, getALLUTXOfromTx } from "../rpc/bitcoin_rpc.js";
import { ECPairFactory, ECPairAPI } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1'
import { get_taproot_account } from "../taproot/taproot_script_builder.js"
import { toXOnly, IUTXO, choose_network, BRC20UTXO, prase_decimal } from "../taproot/utils.js"

const ECPair: ECPairAPI = ECPairFactory(tinysecp);

/**
 * pay for a inscription
 *
 * @param {Signer} keypair - The number of keypair
 * @param {any} txid - The txid used to get UXTO
 * @param {string} addr_from - The address that pay
 * @param {string} addr_to - The address that receive
 * @param {string} network - The network used for taproot address
 * @param {string} account - The detail information of 'from taproot address'
 * @param {string} redeem - The redeem script of 'from UTXO'
 * @returns {string} - return the txid
 */
export async function pay_ins(keypair: any, txid: any, addr_from: any, addr_to: any, network: any, account: any, redeem: any) {
    const utxos = await getUTXOfromTx(txid, addr_from)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new Psbt({ network: choose_network(network) });

    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: account.output! }
    });

    psbt.updateInput(0, {
        tapLeafScript: [
            {
                leafVersion: redeem.redeemVersion,
                script: redeem.output,
                controlBlock: account.witness![account.witness!.length - 1],
            },
        ],
    })

    psbt.addOutput({
        address: addr_to,
        value: utxos.value - 500
    });

    psbt.signInput(0, keypair);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    return tx.getId();
}

/**
 * pay for a taproot address with internal pubkey
 *
 * @param {Signer} keypair - The number of keypair
 * @param {any} txid - The txid used to get UXTO
 * @param {string} addr_from - The address that pay
 * @param {string} addr_to - The address that receive
 * @param {string} network - The network used for taproot address
 * @param {string} account - The detail information of 'from taproot address'
 * @param {string} value - The value used to pay
 * @returns {string} - return the txid
 */
export async function pay_tap(keypair: any, txid: any, addr_from: any, addr_to: any, network: any, account: any, value: any) {
    const utxos = await getUTXOfromTx(txid, addr_from)
    console.log(`Using UTXO ${utxos.txid}:${utxos.vout}`);

    const psbt = new Psbt({ network: choose_network(network) });
    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: account.output! },
        tapInternalKey: toXOnly(keypair.publicKey)
    });

    if (utxos.value - 500 < value) { return }

    psbt.addOutput({
        address: addr_to,
        value: value
    });

    psbt.addOutput({
        address: addr_from,
        value: utxos.value - value - 500
    });

    // Auto-Sign
    psbt.signInput(0, keypair);

    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(tx)

    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    // generate new block to lookup
    return tx.getId()
}

/**
 * build a psbt
 *
 * @param {any} redeem - The redeem script of taproot address
 * @param {any[]} utxos - The UXTOs used as input
 * @param {string} addr_from - The address that pay
 * @param {string} addr_to - The address that receive
 * @param {string} network - The network used for taproot address
 * @param {string} account - The detail information of 'from taproot address'
 * @param {string} value - The value used to pay
 * @param {string} fee - The transaction fee
 * @returns {string} - return the base64 string of a psbt
 */
export function build_psbt(redeem: any, utxos: any[], addr_from: any, addr_to: any, network: any, account: any, value: any, fee: any): string {
    const psbt = new Psbt({ network: choose_network(network) });
    let utxo_value = 0;
    let i = 0;

    for (let utxo of utxos) {
        psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: { value: utxo.value, script: account.output! },
        });

        psbt.updateInput(i, {
            tapLeafScript: [
                {
                    leafVersion: redeem.redeemVersion,
                    script: redeem.output,
                    controlBlock: account.witness![account.witness!.length - 1],
                },
            ],
        })

        utxo_value = utxo.value + utxo_value
        i = i + 1
    }

    psbt.addOutput({
        address: addr_to,
        value: value
    });

    psbt.addOutput({
        address: addr_from,
        value: utxo_value - value - fee
    });

    return psbt.toBase64();
}

/**
 * sign a psbt
 *
 * @param {string} psbt_ - The base64 string of a psbt
 * @param {string} WIF - The wif of an account
 * @returns {string} - return the base64 string of a psbt
 */
export function sign_psbt(psbt_: string, WIF: string, network: any) {
    const keypair = ECPair.fromWIF(WIF, choose_network(network))
    // Auto-Sign
    let psbt = Psbt.fromBase64(psbt_)

    console.log(psbt.data.inputs[0].tapScriptSig)

    for (let i = 0; i < psbt.data.inputs.length; i++) {
        psbt.signInput(i, keypair);
    }

    return psbt.toBase64();
}

/**
 * export the pubkey that need to be sign from a psbt
 *
 * @param {string} psbt_ - The base64 string of a psbt
 * @returns {{ length, pubkeys }} - return the number and the pubkeys.
 */
export async function export_sign_psbt(psbt_: string) {
    let psbt = Psbt.fromBase64(psbt_)
    let pubkeys = []
    let length = psbt.data.inputs[0].tapScriptSig!.length
    for (let i = 0; i < length!; i++) {
        pubkeys.push(psbt.data.inputs[0].tapScriptSig![i].pubkey.toString('hex'))
    }
    return { length, pubkeys }
}

/**
 * import a psbt from base64
 *
 * @param {string} psbt_ - The base64 string of a psbt
 * @returns {Psbt} - return the Pbst
 */
export function import_psbt(psbt_: string) {
    let psbt = Psbt.fromBase64(psbt_)
    return psbt;
}

/**
 * export a psbt to base64
 *
 * @param {string} psbt_ - The raw psbt
 * @returns {Psbt} - return the Pbst in Base64
 */
export function export_psbt(psbt_: any) {
    let psbt = psbt_.toBase64()
    return psbt;
}

/**
 * pay the psbt
 *
 * @param {string} psbt_ - The psbt in base64 format
 * @returns {Psbt} - return the txid
 */
export async function pay_psbt(psbt_: string) {
    let psbt = Psbt.fromBase64(psbt_)
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(tx)

    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log("Txid is:", tx.getId());

    const txHex = await broadcast(tx.toHex());
    console.log(`Success! TxHex is ${txHex}`);

    // generate new block to lookup
    return tx.getId()
}

/**
 * pay the psbt when the sign is not full (but reach the threshold)
 *
 * @param {string} psbt_ - The psbt in base64 format
 * @param {number} threshold - The psbt in base64 format
 * @param {number} sign_num - The current sig 
 * @param {string} network - The psbt in base64 format
 * @param {any[]} pks - The public keys array used to sign
 * @returns {Psbt} - return the txid
 */
export function pay_psbt_hex(psbt_: string, threshold: number, sign_num: number, network: string, pks: any[]) {
    let psbt = Psbt.fromBase64(psbt_)

    for (let i = 0; i < psbt.data.inputs.length; i++) {
        for (let j = threshold; j < sign_num; j++) {
            psbt.data.inputs[i].tapScriptSig?.push({
                leafHash: psbt.data.inputs[i].tapScriptSig![0].leafHash,
                pubkey: pks[j],
                signature: Buffer.from("")
            });
        }
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    return tx.toHex()
}

/**
 * auto choose UXTO for input
 *
 * @param {IUTXO[]} utxos - The UTXO set, you can use getAllUTXOfromAddress to get UXTOs
 * @param {number} max_amount - The value of UTXO you need
 * @returns {IUTXO[]} - return the required UXTOs
 */
export function auto_choose_UTXO(utxos: IUTXO[], max_amount: number): IUTXO[] {
    // Filter out UTXOs with a value less than 1000 satoshis (to avoid brc20)
    // and the coinbase transaction (coinbase transaction will lock for 100 block)
    let filteredUTXOs = utxos.filter(utxo => utxo.value >= 1000);

    // Sort UTXOs by value in descending order
    filteredUTXOs.sort((a, b) => b.value - a.value);

    let chosenUTXOs: IUTXO[] = [];
    let total = 0;

    // Accumulate UTXOs until the total is at least max_amount
    for (let utxo of filteredUTXOs) {
        if (total >= max_amount) break;
        chosenUTXOs.push(utxo);
        total += utxo.value;
    }

    // If the total is still less than max_amount after checking all UTXOs, there might be an issue
    if (total < max_amount) {
        console.warn('Not enough funds available to meet the max_amount requirement.');
        return [];
    }

    return chosenUTXOs;
}

/**
 * auto choose UXTO for input that related to brc20
 *
 * @param {IUTXO[]} utxos - The UTXO set, you can use getAllUTXOfromAddress to get UXTOs
 * @param {number} max_amount - The value of UTXO you need
 * @param {number} decimal - The decimal of the brc20 token
 * @param {string} ticker - The tick/name of brc20 token
 * @returns {BRC20UTXO[]} - return the required UXTOs
 */
export function auto_choose_brc20_UTXO(utxos: BRC20UTXO[], max_amount: number, decimal: number, ticker: string): BRC20UTXO[] {
    // Filter out UTXOs with the coinbase transaction (coinbase transaction will lock for 100 block)
    let filteredUTXOs = utxos.filter(utxo => utxo.brc20.tick == ticker);

    // Sort UTXOs by value in descending order
    filteredUTXOs.sort((a, b) => b.brc20.value - a.brc20.value);

    let chosenUTXOs: BRC20UTXO[] = [];
    let total = 0;

    // Accumulate UTXOs until the total is at least max_amount
    for (let utxo of filteredUTXOs) {
        if (total >= max_amount) break;
        chosenUTXOs.push(utxo);
        total += prase_decimal(utxo.brc20.value, decimal);
    }

    // If the total is still less than max_amount after checking all UTXOs, there might be an issue
    if (total < max_amount) {
        console.warn('Not enough funds available to meet the max_amount requirement.');
        return [];
    }

    return chosenUTXOs;
}

//----------------------Wallet API-------------------------------

/// Used in wallet example
export async function pay_ins_hex(WIF: any, utxos: any, addr_to: any, network: any) {

    const keypair = ECPair.fromWIF(WIF)
    const { tp_account, tp_signer } = get_taproot_account(keypair, network)

    const psbt = new Psbt({ network: choose_network(network) });

    psbt.addInput({
        hash: utxos.txid,
        index: utxos.vout,
        witnessUtxo: { value: utxos.value, script: tp_account.output! }
    });

    psbt.addOutput({
        address: addr_to,
        value: utxos.value - 500
    });

    psbt.signInput(0, tp_signer);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    return tx.toHex();
}