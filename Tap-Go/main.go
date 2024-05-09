package main

import (
	"encoding/hex"
	"fmt"
	"log"
	"opentap/rpc"
	"opentap/txbuilder"
	"opentap/utils"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/wire"
)

// pay to legacy address
func start_p2pkh() {
	regtest_params := rpc.Regtest_params
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
	txhash, err := rpc.Faucet(senderWallet.Address, btcutil.Amount(2000000))
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Added 0.02 BTC to sender's wallet.")
	fmt.Println("faccut txhash:", txhash)

	// 构建一笔交易，将一部分比特币发送给第二个钱包地址
	amountToSend := btcutil.Amount(500000) // 0.005 BTC
	gasfee := int64(500)
	tx, err := txbuilder.CreateTx(senderWallet, receiverWallet.Address, amountToSend, txhash, gasfee)
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

// pay to taproot address keypath
func start_p2tr_keypath() {
	regtest_params := rpc.Regtest_params
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

	receiver_p2tr_addr_str, err := receiverWallet.CreateP2TR()
	if err != nil {
		fmt.Println(err.Error())
	}
	fmt.Println("receiver_p2tr_addr:", receiver_p2tr_addr_str)

	sender_p2tr_addr, err := btcutil.DecodeAddress(sender_p2tr_addr_str, &chaincfg.RegressionNetParams)
	if err != nil {
		log.Fatal(err)
	}

	receiver_p2tr_addr, err := btcutil.DecodeAddress(receiver_p2tr_addr_str, &chaincfg.RegressionNetParams)
	if err != nil {
		log.Fatal(err)
	}

	// 向第一个钱包地址添加一定数量的比特币
	txhash, err := rpc.Faucet(sender_p2tr_addr, btcutil.Amount(2000000))
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Added 0.02 BTC to sender's wallet.")
	fmt.Println("faccut txhash:", txhash)

	// 构建一笔交易，将一部分比特币发送给第二个钱包地址
	amountToSend := btcutil.Amount(500000) // 0.005 BTC
	gasfee := int64(500)
	rawTx, txid, err := txbuilder.CreateTxP2TRKey(senderWallet, receiver_p2tr_addr, amountToSend, txhash, gasfee)
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

// pay to taproot address scriptpath
func start_p2tr_scriptpath(redeem_script_index int) {
	regtest_params := rpc.Regtest_params
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

	receiver_p2tr_addr_str, err := receiverWallet.CreateP2TR()
	if err != nil {
		fmt.Println(err.Error())
	}
	fmt.Println("receiver_p2tr_addr:", receiver_p2tr_addr_str)

	sender_p2tr_addr, err := btcutil.DecodeAddress(sender_p2tr_addr_str, &chaincfg.RegressionNetParams)
	if err != nil {
		log.Fatal(err)
	}

	// 向第一个钱包地址添加一定数量的比特币
	txhash, err := rpc.Faucet(sender_p2tr_addr, btcutil.Amount(2000000))
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Added 0.02 BTC to sender's wallet.")
	fmt.Println("faccut txhash:", txhash)

	// 构建一笔交易，将一部分比特币发送给第二个钱包地址
	amountToSend := btcutil.Amount(500000) // 0.005 BTC
	gasfee := int64(500)

	//生成taproot script 切片
	scripts := txbuilder.CreateScript(senderWallet.SerializeSchnorrPubKey(), receiverWallet.SerializeSchnorrPubKey())
	ts := txbuilder.NewTapScript(senderWallet, scripts, &chaincfg.RegressionNetParams)
	//生成taproot tree 并返回 pk
	p2tr_script_PK, err := ts.CreateP2trPK()
	if err != nil {
		fmt.Printf("fail CreateP2TR(): %v\n", err)
		return
	}
	fmt.Println("p2tr:", p2tr_script_PK)

	//创建utxo 发送至taproot tree address
	rawTx, txid1, err := txbuilder.CreateTxP2TRScript(senderWallet, p2tr_script_PK, amountToSend, txhash, gasfee)
	if err != nil {
		fmt.Printf("fail CreateRawTxP2TR: %v\n", err)
		return
	}
	fmt.Println("txid:", txid1)
	// 发送交易
	err = rpc.SendTx(rawTx)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Transaction sent.")

	//构建redeem script
	var tx2 *wire.MsgTx
	var txid2 string
	prevHash, _ := chainhash.NewHashFromStr(txid1)
	switch redeem_script_index {
	case 0:
		preimage, _ := hex.DecodeString("00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff")
		tx2, txid2, err = ts.CreateRawTxP2TR(
			// previous output
			prevHash, 0, int64(amountToSend),
			// current output
			sender_p2tr_addr_str, gasfee,
			// unlock
			redeem_script_index, // script1 = scripts[0]
			[][]byte{preimage},
			senderWallet,
		)
	case 1:
		tx2, txid2, err = ts.CreateRawTxP2TR(
			// previous output
			prevHash, 0, int64(amountToSend),
			// current output
			sender_p2tr_addr_str, gasfee,
			// unlock
			redeem_script_index, // script2 = scripts[1]
			[][]byte{},
			receiverWallet,
		)
	}

	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("txid2:", txid2)

	// 发送交易
	err = rpc.SendTx(tx2)
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
	rpc.InitRPCConfig(
		"localhost:18443", //Host
		"user",            // user
		"pass",            //password
		"123456",          //walletPassphrase
	)
	// start_p2pkh()
	// start_p2tr_keypath()
	start_p2tr_scriptpath(0) //用Taproot tree中索引为0的脚本解锁utxo
	// start_p2tr_scriptpath(1) //用Taproot tree中索引为1的脚本解锁utxo
}
