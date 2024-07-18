# **Example**

To demonstrate how to use the Opentap, we build a example project which is a browser-based Bitcoin wallet that support multi-sig wallet build by react. Currently its only available at Local regtest environment. It contained:

- [x]  Create Wallet - Create a new wallet with threshold multi-sig.
- [x]  Import/Export Wallet - Convert your wallet to JSON and import/export.
- [x]  View Assets - Get the balance of Bitcoin/Brc20 of wallet.
- [x]  Send Assets - Send Bitcoin/Brc20 to another account.

We are working on:

- [ ]  Mainnet/Testnet - Support real Bitcoin transaction.
- [ ]  Rune - Support runestone assets.
- [ ]  Optimization - Adding more complex payment method.

## **Test Environment**

Before you using/testing this repo, we strongly recommend you to setup a local bitcoin test envirnment (regtest). Building a test env is a tidious work, we have managed to organize and testfiy all the necessary step to build it, which is much more quicker to test anything compare to Bitcoin testnet. Our env include:

- [x]  Bitcoin Regtest
- [x]  Bitcoin Explorer
- [x]  Brc20/Inscription Indexer
- [ ]  Rune Indexer

You can go to the `./Environment` folder for all the instrcution you need.
