import {
    getBRC20Balances,
    getBrc20Transferable,
    getBrc20EventsFromBlock,
    getAllTickersInfo,
    getTickerInfo,
    getTickerBalance,
    getTransferableBrc20,
    getBrc20EventsFromTx,
    getIndexerStatus,
    getInscriptionsFromBlock,
    getInscriptionById,
    getInscriptionByNumber,
    getInscriptionFromOutpoint,
    getInscriptionsFromTx,
} from "../rpc/indexer_rpc.js";

async function start() {
    const address = 'bcrt1p5f759q606mtamm458vjf88wu4fkk9s9x7zyk0f4ejwxeu00ncuzqhurput';
    const block_hash = `6ff58ea8c1b40cfdeb31ec59f3f876d897ad7acea967a7e0259a7973120014cf`
    const ticker = `ordi`;
    const txid = `ee5c68f4383aaabeba397454244ca7a110d53e8ab33752de7b745e3f03119707`;
    const inscriptionId = `ee5c68f4383aaabeba397454244ca7a110d53e8ab33752de7b745e3f03119707i0`
    const inscriptionNumber = 9
    const outpoint = `ee5c68f4383aaabeba397454244ca7a110d53e8ab33752de7b745e3f03119707:0`
    try {
        // 1: getBRC20Balances(address)
        // 2: getBrc20Transferable(address)
        // 3: getBrc20EventsFromBlock(block_hash)
        // 4: getAllTickersInfo()
        // 5: getTickerInfo(ticker)
        // 6: getTickerBalance(ticker, address)
        // 7: getTransferableBrc20(ticker, address)
        // 8: getBrc20EventsFromTx(txid)
        // 9: getIndexerStatus()
        // 10: getInscriptionsFromBlock(block_hash)
        // 11: getInscriptionById(inscriptionId)
        // 12: getInscriptionByNumber(inscriptionNumber)
        // 13: getInscriptionFromOutpoint(outpoint)
        // 14: getInscriptionsFromTx(txid)
        let currentFunction = 1;
        switch (currentFunction) {
            case 1:
                const response = await getBRC20Balances(address);
                if (response.code !== 0) {
                    console.log('error:', response.msg);
                }else{
                    console.log('BRC20 Balances:', response.data);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 2:
                const response2 = await getBrc20Transferable(address);
                if (response2.code !== 0) {
                    console.log('error:', response2.msg);
                }else{
                    console.log('Transferable:', response2.data.inscriptions);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 3:
                const response3 = await getBrc20EventsFromBlock(block_hash);
                if (response3.code !== 0) {
                    console.log('error:', response3.msg);
                }else{
                    console.log('Events:', response3.data.block);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 4:
                const response4 = await getAllTickersInfo();
                if (response4.code !== 0) {
                    console.log('error:', response4.msg);
                }else{
                    console.log('Tokens:', response4.data.tokens);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 5:
                const response5 = await getTickerInfo(ticker);
                if (response5.code !== 0) {
                    console.log('error:', response5.msg);
                }else{
                    console.log('Token:', response5.data);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 6:
                const response6 = await getTickerBalance(ticker,address);
                if (response6.code !== 0) {
                    console.log('error:', response6.msg);
                }else{
                    console.log('TickerBalance:', response6.data);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 7:
                const response7 = await getTransferableBrc20(ticker,address);
                if (response7.code !== 0) {
                    console.log('error:', response7.msg);
                }else{
                    console.log('TransferableBrc20:', response7.data.inscriptions);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 8:
                const response8 = await getBrc20EventsFromTx(txid);
                if (response8.code !== 0) {
                    console.log('error:', response8.msg);
                }else{
                    console.log('Events:', response8.data.events);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 9:
                const response9 = await getIndexerStatus();
                if (response9.code !== 0) {
                    console.log('error:', response9.msg);
                }else{
                    console.log('Status:', response9.data);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 10:
                const response10 = await getInscriptionsFromBlock(block_hash);
                if (response10.code !== 0) {
                    console.log('error:', response10.msg);
                }else{
                    console.log('Block:', response10.data.block);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 11:
                const response11 = await getInscriptionById(inscriptionId);
                if (response11.code !== 0) {
                    console.log('error:', response11.msg);
                }else{
                    console.log('Inscription:', response11.data);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 12:
                const response12 = await getInscriptionByNumber(inscriptionNumber);
                if (response12.code !== 0) {
                    console.log('error:', response12.msg);
                }else{
                    console.log('Inscription:', response12.data);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 13:
                const response13 = await getInscriptionFromOutpoint(outpoint);
                if (response13.code !== 0) {
                    console.log('error:', response13.msg);
                }else{
                    console.log('OutPoint:', response13.data);
                }
                console.log('--------------------------------------------------------------------------------------------');
            case 14:
                const response14 = await getInscriptionsFromTx(txid);
                if (response14.code !== 0) {
                    console.log('error:', response14.msg);
                }else{
                    console.log('Tx:', response14.data);
                }
                console.log('--------------------------------------------------------------------------------------------');
        }    
    } catch (error) {
        console.error('Error:', error);
    }
}

start().then(() => process.exit());