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

func main() {
	regtest_params := chaincfg.RegressionNetParams
	regtest_params.DefaultPort = "18443"
	// 生成第一个钱包
	senderWallet, err := utils.LoadWallet(&regtest_params)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("senderWallet:", senderWallet)

	// 生成第二个钱包
	receiverWallet, err := utils.NewWallet(&regtest_params)
	if err != nil {
		log.Fatal(err)
	}

	// 向第一个钱包地址添加一定数量的比特币
	txhash, err := rpc.Faccut(senderWallet, btcutil.Amount(2000000))
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Added 0.02 BTC to sender's wallet.")
	fmt.Println("txhash:", txhash)

	// 构建一笔交易，将一部分比特币发送给第二个钱包地址
	amountToSend := btcutil.Amount(500000) // 0.005 BTC
	tx, err := txbuilder.CreateTx(senderWallet, receiverWallet, amountToSend, txhash)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Created transaction: %v\n", tx)

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
