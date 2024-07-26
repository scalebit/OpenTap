# **OpenTap**

OpenTap is both a library and an integrated demo for tapscript developers. We wrapped the most commonly used tapscript as a module for developers. You can build taproot-related apps in a more easy way.

Currently, we are supporting the `node.js` environment, `go` version is on the way. The function we are currently supported:

- [x]  Taproot Builder - Easily to create a taproot address/wallet
- [x]  Script (ASM) Builder - Build Bitcoin raw script by opcode
- [x]  Multi-Sig Builder - Build Multi-Sig script and signing
- [x]  Inscription Builder - Build basic Brc20/Rune/Inscription
- [x]  RPC/API - Module used to get/post data to RPC/API
- [x]  Demo - An integrated demo that builds a multi-sig wallet in the browser

We are working on:

- [ ]  Assets - Fully support Bitcoin native assets
- [ ]  DLC - Implement of discreet log contract
- [ ]  BitVM - Tapscript based on BitVM (and BitVM improvement)
- [ ]  Go - Fully supported go language

**DISCLAIMER: We haven’t finished our inside auditing yet, so use it at your own risk before we fully confirm the source code.**

## **Test Environment**

Before you using/testing this repo, we strongly recommend you to set up a local Bitcoin test environment (regtest). Building a test environment is tedious work, we have managed to organize and testify all the necessary steps to build it, which is much quicker to test anything compared to Bitcoin testnet. Our env include:

- [x]  Bitcoin Regtest
- [x]  Bitcoin Explorer
- [x]  Brc20/Inscription Indexer
- [ ]  Rune Indexer

You can go to the `./Environment` folder for all the instruction you need.

## Reference

- cmd crypto suite - https://github.com/cmdruid?tab=repositories
- inscription-online - https://github.com/supertestnet/inscriptions-online
- btc-rpc-explorer - https://github.com/janoside/btc-rpc-explorer/
- taproot workshop - https://github.com/bitcoinops/taproot-workshop
- taproot-with-bitcoinjs - https://github.com/Eunovo/taproot-with-bitcoinjs
- unisat-wallet-dev-support - https://github.com/unisat-wallet/dev-support/blob/master/unisat-web3-demo/src/App.css
