import * as bitcoin from 'bitcoinjs-lib';
import * as base64 from 'base64-js';
import * as fs from 'fs';
import * as path from 'path';


// Reads a specified number of bytes from the transaction witness data
export function readBytes(buffer: Buffer, pointer: number, length: number = 1): [Buffer, number] {
    const value = buffer.subarray(pointer, pointer + length);
    return [value, pointer + length];
}

// Finds the initial position of the ordinal inscription mark in the transaction witness data
export function findOrdinalInscription(buffer: Buffer): number {
    const inscriptionMark = Buffer.from('0063036f7264', 'hex'); // Hex for 'ord'
    const position = buffer.indexOf(inscriptionMark);

    if (position === -1) {
        console.error('No ordinal inscription found in transaction');
        return -1;
    }

    return position + inscriptionMark.length;
}

// Reads the content type from the transaction witness data
export function extractContentType(buffer: Buffer, pointer: number): [string, number] {
    const OP_1 = Buffer.from([0x51]);
    let byte;

    [byte, pointer] = readBytes(buffer, pointer);

    if (!byte.equals(OP_1)) {
        if (!byte.equals(Buffer.from([0x01]))) {
            throw new Error('Unexpected byte');
        }

        [byte, pointer] = readBytes(buffer, pointer);
        if (!byte.equals(Buffer.from([0x01]))) {
            throw new Error('Unexpected byte');
        }
    }

    let size;
    [size, pointer] = readBytes(buffer, pointer);
    const contentType = buffer.subarray(pointer, pointer + size.readUInt8(0)).toString('utf8');
    pointer += size.readUInt8(0);

    return [contentType, pointer];
}

// Reads the push data from the transaction witness data
export function readPushData(buffer: Buffer, opcode: Buffer, pointer: number): [Buffer, number] {
    const intOpcode = opcode.readUInt8(0);
    let numBytes = 0;

    if (intOpcode >= 0x01 && intOpcode <= 0x4b) {
        return [buffer.subarray(pointer, pointer + intOpcode), pointer + intOpcode];
    }

    switch (intOpcode) {
        case 0x4c:
            numBytes = 1;
            break;
        case 0x4d:
            numBytes = 2;
            break;
        case 0x4e:
            numBytes = 4;
            break;
        default:
            console.error(`Invalid push opcode ${intOpcode} at position ${pointer}`);
            return [Buffer.alloc(0), pointer];
    }

    const sizeBuffer = buffer.subarray(pointer, pointer + numBytes);
    pointer += numBytes;
    const size = sizeBuffer.readUIntLE(0, numBytes);
    return [buffer.subarray(pointer, pointer + size), pointer + size];
}

// Writes data as a data URI
export function writeDataUri(data: Buffer, contentType: string) {
    const dataBase64 = base64.fromByteArray(data);
    console.log(`data:${contentType};base64,${dataBase64}`);
}

// Writes data to a file with the appropriate extension
export function writeFile(txid: string, data: Buffer, extension: string) {
    const filename = `output.${extension}`;
    console.log(`Writing contents to file "${txid + filename}"`);
    const filePath = path.resolve(__dirname, '..', 'data/inscription', txid + filename);

    console.log(`Writing contents to file "${filePath}"`);
    fs.writeFileSync(filePath, data);
}

// Gets the file extension from the content type
export function getFileExtension(contentType: string): string {
    const extensions: { [key: string]: string } = {
        'text/plain;charset=utf-8': 'txt',
        'text/html;charset=utf-8': 'html',
    };

    return extensions[contentType] || contentType.split('/')[1];
}

// Reads and parses a JSON file
export function readJsonFile(filePath: string): any {
    try {
        const jsonString = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(jsonString);
    } catch (err) {
        console.error(`Error reading or parsing file ${filePath}:`, err);
        return null;
    }
}

// Main export function to process the blocks and transactions
export function read_ins_from_block() {
    const filePath = path.resolve(__dirname, 'latest_100_blocks.json');
    const blocks = readJsonFile(filePath);

    if (blocks) {
        for (const block of blocks) {
            for (const transaction of block.transactions) {
                try {
                    if (transaction.vin && transaction.vin[0] && transaction.vin[0].witness) {
                        const witnessBuffer = Buffer.from(transaction.vin[0].witness.join(''), 'hex');
                        let pointer = findOrdinalInscription(witnessBuffer);

                        if (pointer === -1) {
                            continue;
                        }

                        const [contentType, newPointer] = extractContentType(witnessBuffer, pointer);
                        pointer = newPointer;
                        console.log(`Content type: ${contentType}`);

                        const fileExtension = getFileExtension(contentType);

                        if (!witnessBuffer.subarray(pointer, pointer + 1).equals(Buffer.from([0x00]))) {
                            throw new Error('Unexpected byte');
                        }
                        pointer++;

                        const data: Buffer[] = [];
                        const OP_ENDIF = Buffer.from([0x68]);

                        let opcode;
                        [opcode, pointer] = readBytes(witnessBuffer, pointer);

                        while (!opcode.equals(OP_ENDIF)) {
                            let chunk;
                            [chunk, pointer] = readPushData(witnessBuffer, opcode, pointer);
                            data.push(chunk);
                            [opcode, pointer] = readBytes(witnessBuffer, pointer);
                        }

                        const resultData = Buffer.concat(data);
                        console.log(`Total size: ${resultData.length} bytes`);

                        // Check if the witness matches the expected inscription script format
                        const expectedScript = [
                            Buffer.from([bitcoin.opcodes.OP_CHECKSIG]),
                            Buffer.from([bitcoin.opcodes.OP_FALSE]),
                            Buffer.from([bitcoin.opcodes.OP_IF]),
                            Buffer.from("ord"),
                            Buffer.from([1]),
                            Buffer.from([1]),
                            Buffer.from(contentType),
                            Buffer.from([bitcoin.opcodes.OP_0]),
                            resultData,
                            Buffer.from([bitcoin.opcodes.OP_ENDIF]),
                        ];

                        const witnessMatches = expectedScript.every((item, index) => {
                            const witnessPart = index < data.length ? data[index] : Buffer.alloc(0);
                            const match = Buffer.isBuffer(item) ? item.equals(witnessPart) : item === witnessPart;
                            console.log(`Witness part ${index}: ${match}`);
                            return match;
                        });

                        if (witnessMatches) {
                            console.log("The witness matches the expected inscription script format.");
                        } else {
                            console.log("The witness does not match the expected inscription script format.");
                        }

                        // Output data URI or write to file
                        writeDataUri(resultData, contentType);
                        writeFile(transaction.txid, resultData, fileExtension);

                        console.log('\nDone');
                        console.log('Witness:', witnessBuffer);
                    } else {
                        console.log('No witness data found for transaction:', transaction.txid);
                    }
                } catch (error) {
                    console.error(`Error processing transaction ${transaction.txid}:`, error);
                }
            }
        }
    } else {
        console.error('Failed to read blocks data from JSON file.');
    }
}

read_ins_from_block();
