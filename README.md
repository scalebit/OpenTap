# **OpenTap**

OpenTap is both a library and an integrated demo for tapscript developers. We wrapped the most commonly used tapscript as a module for developers. You can build taproot-related apps in a more easy way.

Currently we are supporting `node.js` environment, `go` version is on the way. The function we are currently supported:

- [x]  Taproot Builder - Easily to create a taproot address/wallet
- [x]  Script (ASM) Builder - Build Bitcoin raw script by opcode
- [x]  Multi-Sig Builder - Build Multi-Sig script and signing
- [x]  Inscription Builder - Build basic inscription and inscribe
- [x]  RPC/API - Module used to get/post data to RPC/API
- [x]  Bridge L1 Demo - A integrated demo that build multi-sig bridge in L1

And we are working on:

- [ ]  Brc20/Rune - Fully support/demo the inscribe, brc-20, rune operation
- [ ]  Bridge with Custody Demo - A full assets bridge demo
- [ ]  BitVM - Taproot address/script based on BitVM
- [ ]  Go - Fully supported go language

**DISCLAIMER: We haven’t finished our inside auditing yet, so use it at your own risk before we fully confirm the source code.**

## **Test Environment**

### Bitcoin Setup

To run Bitcoin locally, we could use regtest network to easily test our lib. The following module is required to build regtest:

```jsx
bitcoind
bitcoin-cli
```

We suggest getting them directly on the Bitcoin Core official site:

[Bitcoin Core](https://bitcoin.org/en/bitcoin-core/)

After installed the Bitcoin core, you should next setup the Bitcoin environment through `Bitcoin.conf`, which can be find at `./bitcoin-daemon/Config`. You need to manually put it into the right directory: 

| Operating System | Data Directory | Example Path |
| --- | --- | --- |
| Windows | %APPDATA%\\Bitcoin\\ | C:\\Users\\username\\AppData\\Roaming\\Bitcoin\\bitcoin.conf |
| Linux | $HOME/.bitcoin/ | /home/username/.bitcoin/bitcoin.conf |
| macOS | $HOME/Library/Application Support/Bitcoin/ | /Users/username/Library/Application Support/Bitcoin/bitcoin.conf |

To running the regtest network, using the command:

```jsx
bitcoind —regtest

// Need to generate 101 block at the first tie
bitcoin-cli 

// Need to create wallet at the first time 
bitcoin-cli -regtest createwallet testwallet_1

// Need to load a wallet
bitcoin-cli -regtest loadwallet main
```

### **Visualization**

We leverage the `btc-rpc-explorer` to view the local regtest network. You need to install `node.js` in your local machine before using the explorer:

[Github](https://github.com/janoside/btc-rpc-explorer)

To visualize the network, we need to first install and running `bitcoind`, and then setup the explorer environment. We suggested using `yarn` to install the `btc-rpc-explorer`.

```jsx
yarn install
yarn start
```

Before `yarn start`, find the `.env-example` and set it to `.env`. Then we modified parts of the files as below, to point the RPC provider into the local regtest network.

```
# Bitcoin RPC Credentials (URI -OR- HOST/PORT/USER/PASS)
# Defaults:
#   - [host/port]: 127.0.0.1:8332
#   - [username/password]: none
#   - cookie: '~/.bitcoin/.cookie'
#   - timeout: 5000 (ms)
BTCEXP_BITCOIND_URI=bitcoin://user:pass@127.0.0.1:18443?timeout=10000
BTCEXP_BITCOIND_HOST=127.0.0.1
BTCEXP_BITCOIND_PORT=18443
BTCEXP_BITCOIND_USER=user
BTCEXP_BITCOIND_PASS=pass
#BTCEXP_BITCOIND_COOKIE=/path/to/bitcoind/.cookie
BTCEXP_BITCOIND_RPC_TIMEOUT=5000
```

You can simple enter http://127.0.0.1:3002/ in your browser to see the blockchain network.

## Reference

- cmd crypto suite - https://github.com/cmdruid?tab=repositories
- inscription-online - https://github.com/supertestnet/inscriptions-online
- btc-rpc-explorer - https://github.com/janoside/btc-rpc-explorer/
- taproot workshop - https://github.com/bitcoinops/taproot-workshop
- taproot-with-bitcoinjs - https://github.com/Eunovo/taproot-with-bitcoinjs
- unisat-wallet-dev-support - https://github.com/unisat-wallet/dev-support/blob/master/unisat-web3-demo/src/App.css
