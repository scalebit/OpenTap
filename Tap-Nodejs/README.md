# OpenTap-Nodejs

This is the `node.js` version of OpenTap. Currently it cannot be directly install using the `npm` or `yarn` before we confirm. Nonetheless, you can find anything that useful for your project to claim. The structure of the project is shown below:

## bridge

Here contained functions that related to Layer 1 bridge taproot script, including three different types of taproot multi-sig account and payment method. The detail of different type of taproot account can be find here:

[taproot-multisig](https://jimmysong.github.io/taproot-multisig)

In addition, we implement a simple CSV script as the escape hatch in the taproot account.

## inscribe

These functions are mainly for the inscription-related operation. It contained how to build/inscribe a inscription and brc20. Meanwhile, you can find the parser of inscription and build your own indexer if needed. 

We are not using RPC/API to build inscription, instead, we build everything from the ground to make a better understanding. However, to test if the inscription is successfully made, you should install a local indexer, which can be found in the environment folder.

## rpc

It contains functions that using axios to post/get data from Bitcoin RPC and other indexer service.

## rune

It contains the necessary function about how to etching and minting runestone. However, different from Brc20 that have a indexer to testify the result, there is no available local runestone indxer. In this case, you can use rpc/bitcoin_rpc/getRunefromTx function to see if a runestone is successfully made.

## taproot

It contains the functions that used to build taproot account, redeem script and psbt. It basically formed by low-level code, only pay attention if you find any problem with high-level function.

## template

We have organized all the test case in this folder for you to checkout how OpenTap works. We strongly recommend you to go through this functions, as it demonstrate how to use the Opentap.
