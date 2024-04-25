package opentap

import (
	"github.com/btcsuite/btcd/btcec/v2"
	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
)

// newWallet 生成一个新的比特币钱包
func newWallet(para *chaincfg.Params) (*Wallet, error) {
	privateKey, err := btcec.NewPrivateKey()
	if err != nil {
		return nil, err
	}

	// 获取公钥
	publicKey, err := btcutil.NewAddressPubKey(privateKey.PubKey().SerializeCompressed(), para)
	if err != nil {
		return nil, err
	}

	// 将私钥转换为 WIF 格式
	wif, err := btcutil.NewWIF(privateKey, &chaincfg.MainNetParams, true)
	if err != nil {
		return nil, err
	}

	// 构建钱包对象并返回
	wallet := &Wallet{
		PrivateKey: *wif,
		PublicKey:  *publicKey,
	}

	return wallet, nil
}
