import fetch from "node-fetch";
import { promises as fs } from "fs";
import * as path from 'path';

// Esplora API base URL
const ESPLORA_API_BASE_URL = "https://blockstream.info/api";

// Function to fetch the latest block height
async function getLatestBlockHeight(): Promise<number> {
    console.log("Fetching latest block height...");
    const response = await fetch(`${ESPLORA_API_BASE_URL}/blocks/tip/height`);
    if (!response.ok) {
        throw new Error("Failed to fetch latest block height");
    }
    const height = await response.text();
    return parseInt(height, 10);
}

// Function to fetch block details by block height with retries
async function getBlockByHeight(height: number, retries: number = 3): Promise<any> {
    try {
        console.log(`Fetching block hash for height ${height}...`);
        const response = await fetch(`${ESPLORA_API_BASE_URL}/block-height/${height}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch block hash for height ${height}`);
        }
        const blockHash = await response.text();

        console.log(`Fetching block details for hash ${blockHash}...`);
        const blockResponse = await fetch(`${ESPLORA_API_BASE_URL}/block/${blockHash}`);
        if (!blockResponse.ok) {
            throw new Error(`Failed to fetch block details for hash ${blockHash}`);
        }
        return await blockResponse.json();
    } catch (error) {
        if (retries > 0) {
            console.warn(`Retrying to fetch block by height ${height}. Retries left: ${retries}`);
            await delay(1000); // Wait 1 second before retrying
            return getBlockByHeight(height, retries - 1);
        } else {
            throw error;
        }
    }
}

// Function to fetch block details including transactions by block hash with retries
async function getBlockWithTransactions(blockHash: string, retries: number = 3): Promise<any> {
    try {
        console.log(`Fetching block transactions for hash ${blockHash}...`);
        const blockResponse = await fetch(`${ESPLORA_API_BASE_URL}/block/${blockHash}`);
        if (!blockResponse.ok) {
            throw new Error(`Failed to fetch block details for hash ${blockHash}`);
        }
        const blockData = await blockResponse.json();

        const transactionsResponse = await fetch(`${ESPLORA_API_BASE_URL}/block/${blockHash}/txs`);
        if (!transactionsResponse.ok) {
            throw new Error(`Failed to fetch transactions for block hash ${blockHash}`);
        }
        const transactions = await transactionsResponse.json();
        return { ...blockData, transactions };
    } catch (error) {
        if (retries > 0) {
            console.warn(`Retrying to fetch block transactions for hash ${blockHash}. Retries left: ${retries}`);
            await delay(1000); // Wait 1 second before retrying
            return getBlockWithTransactions(blockHash, retries - 1);
        } else {
            throw error;
        }
    }
}

// Function to delay execution for a specified number of milliseconds
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to fetch the latest 100 blocks including their transactions
async function getLatest100Blocks() {
    const latestHeight = await getLatestBlockHeight();
    let blocks: any[] = [];
    const batchSize = 5; // Number of concurrent requests
    const delayBetweenBatches = 1000; // Delay in milliseconds (1 second)

    for (let i = latestHeight; i > latestHeight - 100; i -= batchSize) {
        const currentBatch: any[] = [];
        for (let j = 0; j < batchSize && (i - j) > (latestHeight - 100); j++) {
            currentBatch.push(getBlockByHeight(i - j));
        }
        const results = await Promise.allSettled(currentBatch);
        blocks = blocks.concat(results
            .filter(result => result.status === "fulfilled")
            .map(result => (result as PromiseFulfilledResult<any>).value));
        await delay(delayBetweenBatches); // Wait for the delay before the next batch
    }

    const failedCount = 100 - blocks.length;
    if (failedCount > 0) {
        console.warn(`Failed to fetch ${failedCount} blocks.`);
    }

    let detailedBlocks: any[] = [];
    for (let i = 0; i < blocks.length; i += batchSize) {
        const currentBatch = blocks.slice(i, i + batchSize).map(block => getBlockWithTransactions(block.id));
        const detailedResults = await Promise.allSettled(currentBatch);
        detailedBlocks = detailedBlocks.concat(detailedResults
            .filter(result => result.status === "fulfilled")
            .map(result => (result as PromiseFulfilledResult<any>).value));
        await delay(delayBetweenBatches); // Wait for the delay before the next batch
    }

    return detailedBlocks;
}

// Main function to execute the script and write results to a file
(async () => {
    try {
        const blocks = await getLatest100Blocks();
        console.log(`Fetched ${blocks.length} blocks with transactions.`);

        // Write the blocks data to a JSON file
        const filePath = path.resolve(__dirname, '..', 'data', 'latest_100_blocks.json');
        await fs.writeFile(filePath, JSON.stringify(blocks, null, 2));
        console.log('Blocks data has been written to latest_100_blocks.json');
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error fetching blocks: ${error.message}`);
        } else {
            console.error('Unknown error occurred');
        }
    }
})();
