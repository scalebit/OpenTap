package opentap

import (
	"fmt"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/rpcclient"
	"github.com/btcsuite/btcd/wire"
)

// Wallet 包含私钥、公钥和比特币地址
type Wallet struct {
	PrivateKey btcutil.WIF
	PublicKey  btcutil.AddressPubKey
	Address    btcutil.Address
}

func getPrevTx(wallet *Wallet) (string, error) {
	// 连接到 btcd RPC 服务器
	rpcConfig := &rpcclient.ConnConfig{
		Host:         "localhost:8334",
		User:         "rpcuser",
		Pass:         "rpcpassword",
		HTTPPostMode: true,
		DisableTLS:   true,
	}
	client, err := rpcclient.New(rpcConfig, nil)
	if err != nil {
		return "", err
	}
	defer client.Shutdown()

	// 获取钱包地址
	addressStr := wallet.Address.EncodeAddress()

	utxos, err := client.ListUnspentMinMaxAddresses(1, 9999999, []btcutil.Address{wallet.Address})
	if err != nil {
		return "", err
	}

	// 如果找到未花费的 UTXO，则返回其交易 ID
	if len(utxos) > 0 {
		return utxos[0].TxID, nil
	}

	return "", fmt.Errorf("no unspent transaction found for address %s", addressStr)
}

func generateBlock() error {
	// 连接到 btcd RPC 服务器
	rpcConfig := &rpcclient.ConnConfig{
		Host:         "localhost:8334",
		User:         "rpcuser",
		Pass:         "rpcpassword",
		HTTPPostMode: true,
		DisableTLS:   true,
	}
	client, err := rpcclient.New(rpcConfig, nil)
	if err != nil {
		return err
	}
	defer client.Shutdown()

	// 解锁钱包
	if err := client.WalletPassphrase("yourwalletpassphrase", 60); err != nil {
		return err
	}

	// 生成一个区块
	if _, err := client.Generate(1); err != nil {
		return err
	}

	return nil
}

func faccut(wallet *Wallet, amount btcutil.Amount) error {
	// 连接到 btcd RPC 服务器
	rpcConfig := &rpcclient.ConnConfig{
		Host:         "localhost:8334",
		User:         "rpcuser",
		Pass:         "rpcpassword",
		HTTPPostMode: true,
		DisableTLS:   true,
	}
	client, err := rpcclient.New(rpcConfig, nil)
	if err != nil {
		return err
	}
	defer client.Shutdown()

	// 解锁钱包
	if err := client.WalletPassphrase("yourwalletpassphrase", 60); err != nil {
		return err
	}

	// 发送一定数量的比特币到钱包地址
	if _, err := client.SendToAddress(wallet.Address, amount); err != nil {
		return err
	}

	return nil
}

func sendTx(tx *wire.MsgTx) error {
	// 连接到 btcd RPC 服务器
	rpcConfig := &rpcclient.ConnConfig{
		Host:         "localhost:8334",
		User:         "rpcuser",
		Pass:         "rpcpassword",
		HTTPPostMode: true,
		DisableTLS:   true,
	}
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
