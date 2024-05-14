package rpc

import (
	"fmt"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/rpcclient"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"
)

var rpcConfig = &rpcclient.ConnConfig{
	Host:         "localhost:18443",
	User:         "user",
	Pass:         "pass",
	HTTPPostMode: true,
	DisableTLS:   true,
}

var walletPassphrase = "123456"

var Regtest_params chaincfg.Params = chaincfg.RegressionNetParams

func InitRPCConfig(host, user, pass, walletpass string) {
	rpcConfig.Host = host
	rpcConfig.User = user
	rpcConfig.Pass = pass
	walletPassphrase = walletpass

	Regtest_params = chaincfg.RegressionNetParams
	Regtest_params.DefaultPort = "18443"
}

func GetUTXOFromTx(txid *chainhash.Hash, address string) (*chainhash.Hash, int64, []byte, int, error) {
	client, err := rpcclient.New(rpcConfig, nil)
	if err != nil {
		return nil, 0, nil, 0, err
	}
	defer client.Shutdown()

	tx_res, err := client.GetRawTransaction(txid)
	if err != nil {
		return nil, 0, nil, 0, err
	}

	for i := 0; i < len(tx_res.MsgTx().TxOut); i++ {
		balance := tx_res.MsgTx().TxOut[i].Value
		pubKeyScript := tx_res.MsgTx().TxOut[i].PkScript
		scriptClass, addrs, flag, err := txscript.ExtractPkScriptAddrs(pubKeyScript, &Regtest_params)
		if err != nil {
			return nil, 0, nil, 0, err
		}

		if len(addrs) > 0 && addrs[0].EncodeAddress() == address {
			fmt.Println("ExtractPkScriptAddrs:", scriptClass, addrs, flag)
			return txid, balance, pubKeyScript, i, nil
		}
	}

	return nil, 0, nil, 0, fmt.Errorf("No utxo exists for this address")
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
	if err := client.WalletPassphrase(walletPassphrase, 60); err != nil {
		return err
	}

	// 生成一个区块
	// if _, err := client.Generate(1); err != nil {
	// 	return err
	// }

	var maxTries int64 = 10
	var blockhash []*chainhash.Hash
	if blockhash, err = client.GenerateToAddress(1, wallet.Address, &maxTries); err != nil {
		return err
	}
	fmt.Println("blockhash:", blockhash)
	return nil
}

func Faucet(address btcutil.Address, amount btcutil.Amount) (*chainhash.Hash, error) {
	// 连接到 btcd RPC 服务器
	client, err := rpcclient.New(rpcConfig, nil)
	if err != nil {
		return nil, err
	}
	defer client.Shutdown()

	// 解锁钱包
	if err := client.WalletPassphrase(walletPassphrase, 60); err != nil {
		return nil, err
	}

	// 发送一定数量的比特币到钱包地址
	txhash, err := client.SendToAddress(address, amount)
	if err != nil {
		return nil, err
	}
	// fmt.Println("address:", address)
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
