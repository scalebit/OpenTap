package opentap

import (
	"fmt"
	"log"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
)

func main() {
	// 生成第一个钱包
	senderWallet, err := newWallet(&chaincfg.RegressionNetParams)
	if err != nil {
		log.Fatal(err)
	}

	// 生成第二个钱包
	receiverWallet, err := newWallet(&chaincfg.RegressionNetParams)
	if err != nil {
		log.Fatal(err)
	}

	// 向第一个钱包地址添加一定数量的比特币
	err = faccut(senderWallet, btcutil.Amount(1))
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Added 1 BTC to sender's wallet.")

	// 构建一笔交易，将一部分比特币发送给第二个钱包地址
	amountToSend := btcutil.Amount(500000) // 0.005 BTC
	tx, err := createTx(senderWallet, receiverWallet, amountToSend)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Created transaction: %v\n", tx)

	// 发送交易
	err = sendTx(tx)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Transaction sent.")

	// 生成一个区块
	err = generateBlock()
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Block generated.")
}
