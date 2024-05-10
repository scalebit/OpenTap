package utils

import (
	"encoding/hex"
	"errors"
	"fmt"
	"opentap/rpc"
	"reflect"

	"github.com/btcsuite/btcd/btcec/v2"
	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
)

// newWallet 生成一个新的比特币钱包
func NewWallet(para *chaincfg.Params) (*rpc.Wallet, error) {
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
	wallet := &rpc.Wallet{
		PrivateKey: *wif,
		PublicKey:  *publicKey,
		Address:    publicKey.AddressPubKeyHash(),
	}

	return wallet, nil
}

func LoadWallet(privkey string, para *chaincfg.Params) (*rpc.Wallet, error) {
	privKeyBytes, err := hex.DecodeString(privkey)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	privateKey, _ := btcec.PrivKeyFromBytes(privKeyBytes)

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
	wallet := &rpc.Wallet{
		PrivateKey: *wif,
		PublicKey:  *publicKey,
		Address:    publicKey.AddressPubKeyHash(),
	}

	return wallet, nil
}

func ReverseSlice(data interface{}) {
	value := reflect.ValueOf(data)
	if value.Kind() != reflect.Slice {
		panic(errors.New("data must be a slice type"))
	}
	valueLen := value.Len()
	for i := 0; i <= int((valueLen-1)/2); i++ {
		reverseIndex := valueLen - 1 - i
		tmp := value.Index(reverseIndex).Interface()
		value.Index(reverseIndex).Set(value.Index(i))
		value.Index(i).Set(reflect.ValueOf(tmp))
	}
}
