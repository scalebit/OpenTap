package main

import (
	"fmt"
	"log"
	"opentap/rpc"
	"opentap/txbuilder"
	"opentap/utils"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
)

// pay to legacy address
func start_p2pkh() {
	regtest_params := chaincfg.RegressionNetParams
	regtest_params.DefaultPort = "18443"
	// 生成第一个钱包
	senderWallet, err := utils.LoadWallet("2ff6778392d7dc64037ab85a2cc40dfebc8ce2893d6c8b1e0332b6fb08744fe8", &regtest_params)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("senderWallet:", senderWallet.Address.EncodeAddress())

	// 生成第二个钱包
	receiverWallet, err := utils.NewWallet(&regtest_params)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("receiverWallet:", receiverWallet.Address.EncodeAddress())

	// 向第一个钱包地址添加一定数量的比特币
	txhash, err := rpc.Faccut(senderWallet.Address, btcutil.Amount(2000000))
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Added 0.02 BTC to sender's wallet.")
	fmt.Println("faccut txhash:", txhash)

	// 构建一笔交易，将一部分比特币发送给第二个钱包地址
	amountToSend := btcutil.Amount(500000) // 0.005 BTC
	tx, err := txbuilder.CreateTx(senderWallet, receiverWallet, amountToSend, txhash)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Created transaction: %v\n", tx.TxHash())

	// 发送交易
	err = rpc.SendTx(tx)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Transaction sent.")

	// 生成一个区块
	err = rpc.GenerateBlock(senderWallet)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Block generated.")
}

// pay to taproot address
func start_p2tr() {
	regtest_params := chaincfg.RegressionNetParams
	regtest_params.DefaultPort = "18443"
	// 生成第一个钱包
	senderWallet, err := utils.LoadWallet("2ff6778392d7dc64037ab85a2cc40dfebc8ce2893d6c8b1e0332b6fb08744fe8", &regtest_params)
	if err != nil {
		log.Fatal(err)
	}
	sender_p2tr_addr_str, err := senderWallet.CreateP2TR()
	if err != nil {
		fmt.Println(err.Error())
	}
	fmt.Println("sender_p2tr_addr:", sender_p2tr_addr_str)

	// 生成第二个钱包
	receiverWallet, err := utils.NewWallet(&regtest_params)
	if err != nil {
		log.Fatal(err)
	}

	receiver_p2tr_addr, err := receiverWallet.CreateP2TR()
	if err != nil {
		fmt.Println(err.Error())
	}
	fmt.Println("receiver_p2tr_addr:", receiver_p2tr_addr)

	sender_p2tr_addr, err := btcutil.DecodeAddress(sender_p2tr_addr_str, &chaincfg.RegressionNetParams)
	if err != nil {
		log.Fatal(err)
	}
	// 向第一个钱包地址添加一定数量的比特币
	txhash, err := rpc.Faccut(sender_p2tr_addr, btcutil.Amount(2000000))
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Added 0.02 BTC to sender's wallet.")
	fmt.Println("faccut txhash:", txhash)

	// 构建一笔交易，将一部分比特币发送给第二个钱包地址
	// rawTx, txid, err := senderWallet.CreateRawTxP2TR(txhash, receiver_p2tr_addr, 500)
	amountToSend := btcutil.Amount(500000) // 0.005 BTC
	rawTx, txid, err := txbuilder.CreateTxP2TR(senderWallet, receiverWallet, amountToSend, txhash, 500)
	if err != nil {
		fmt.Printf("fail CreateRawTxP2TR: %v\n", err)
		return
	}
	fmt.Println("txid:", txid)
	// 发送交易
	err = rpc.SendTx(rawTx)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Transaction sent.")

	// 生成一个区块
	err = rpc.GenerateBlock(senderWallet)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Block generated.")
}

func main() {
	// start_p2pkh()
	start_p2tr()
}
