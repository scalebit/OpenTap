## Tap-Go: Bitcoin Transaction Builder

Tap-Go is a Golang-based repository that facilitates the construction and sending of Bitcoin transactions, as well as block generation. It currently supports Pay-to-Public-Key-Hash (P2PKH) and Pay-to-Taproot (P2TR) transaction types.

### Features

- **P2PKH Support:** Construct and send transactions to legacy addresses.
- **P2TR Support:** Construct and send transactions to Taproot addresses.
- **Script Path Support:** Unlock UTXO using redeem scripts based on script paths in Taproot.


### Usage

To use Tap-Go, follow these steps:

1. Ensure you have configured your test environment. Refer to the [OpenTap README](https://github.com/scalebit/OpenTap/blob/master/README.md) for detailed instructions.

2. Change directory to the `Tap-Go` directory:
 ```bash
 cd Tap-Go
 ```
3. Install dependencies:
 ```bash
 go mod tidy
 ```
4. The main.go file provides code examples supporting P2PKH and P2TR. You can execute it using:
 ```bash
 go run main.go
 ```