package rpc

import (
	"fmt"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/rpcclient"
	"github.com/btcsuite/btcd/wire"
)

// Wallet 包含私钥、公钥和比特币地址
type Wallet struct {
	PrivateKey btcutil.WIF
	PublicKey  btcutil.AddressPubKey
	Address    btcutil.Address
}

var rpcConfig = &rpcclient.ConnConfig{
	Host:         "localhost:18443",
	User:         "user",
	Pass:         "pass",
	HTTPPostMode: true,
	DisableTLS:   true,
}

func GetUTXOFromTx(txid *chainhash.Hash, address string) (*chainhash.Hash, int64, []byte, error) {
	client, err := rpcclient.New(rpcConfig, nil)
	if err != nil {
		return nil, 0, nil, err
	}
	defer client.Shutdown()

	tx_res, err := client.GetRawTransaction(txid)
	if err != nil {
		return nil, 0, nil, err
	}

	balance := tx_res.MsgTx().TxOut[0].Value
	pubKeyScript := tx_res.MsgTx().TxOut[0].PkScript

	//todo:判断address

	return txid, balance, pubKeyScript, nil
}

func GetPrevTxByTxHash(txhash *chainhash.Hash) (string, error) {
	// 连接到 btcd RPC 服务器
	client, err := rpcclient.New(rpcConfig, nil)
	if err != nil {
		return "", err
	}
	defer client.Shutdown()

	tx_res, err := client.GetTransaction(txhash)
	if err != nil {
		return "", err
	}

	return tx_res.TxID, nil
}

func GetPrevTx(wallet *Wallet) (string, error) {
	// 连接到 btcd RPC 服务器
	client, err := rpcclient.New(rpcConfig, nil)
	if err != nil {
		return "", err
	}
	defer client.Shutdown()

	// 获取钱包地址
	addressStr := wallet.Address.EncodeAddress()
	// utxos, err := client.ListUnspentMinMaxAddresses(1, 9999999, []btcutil.Address{wallet.Address})
	// if err != nil {
	// 	return "", err
	// }

	utxos, err := client.ListUnspent()
	if err != nil {
		return "", err
	}

	// for _, v := range utxos {
	// 	fmt.Println("utxo:", v)
	// }

	// 如果找到未花费的 UTXO，则返回其交易 ID
	if len(utxos) > 0 {
		return utxos[0].TxID, nil
	}

	return "", fmt.Errorf("no unspent transaction found for address %s", addressStr)
}

func GenerateBlock(wallet *Wallet) error {
	// 连接到 btcd RPC 服务器
	client, err := rpcclient.New(rpcConfig, nil)
	if err != nil {
		return err
	}
	defer client.Shutdown()

	// 解锁钱包
	if err := client.WalletPassphrase("123456", 60); err != nil {
		return err
	}

	// 生成一个区块
	// if _, err := client.Generate(1); err != nil {
	// 	return err
	// }

	var maxTries int64 = 0
	if _, err := client.GenerateToAddress(1, wallet.Address, &maxTries); err != nil {
		return err
	}

	return nil
}

func Faccut(wallet *Wallet, amount btcutil.Amount) (*chainhash.Hash, error) {
	// 连接到 btcd RPC 服务器
	client, err := rpcclient.New(rpcConfig, nil)
	if err != nil {
		return nil, err
	}
	defer client.Shutdown()

	// 解锁钱包
	if err := client.WalletPassphrase("123456", 60); err != nil {
		return nil, err
	}

	// 发送一定数量的比特币到钱包地址
	txhash, err := client.SendToAddress(wallet.Address, amount)
	if err != nil {
		return nil, err
	}
	fmt.Println("address:", wallet.Address)
	return txhash, err
}

func SendTx(tx *wire.MsgTx) error {
	// 连接到 btcd RPC 服务器
	client, err := rpcclient.New(rpcConfig, nil)
	if err != nil {
		return err
	}
	defer client.Shutdown()

	// 广播交易
	_, err = client.SendRawTransaction(tx, false)
	if err != nil {
		return err
	}

	return nil
}
