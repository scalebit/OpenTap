package rpc_test

import (
	"fmt"
	"opentap/rpc"
	"opentap/utils"
	"testing"

	"github.com/btcsuite/btcd/chaincfg/chainhash"
)

func TestGetUTXOFromTx(t *testing.T) {
	txhash, _ := chainhash.NewHashFromStr("729a0165bf2aaf3109d2a1214ba1161cee5dfaf90a02029a741c8a6dfaa33718")
	txid, balance, pubKeyScript, index, err := rpc.GetUTXOFromTx(txhash, "")
	if err != nil {
		t.Error(err)
	}
	fmt.Println("txid:", txid)
	fmt.Println("balance:", balance)
	fmt.Println("pubKeyScript:", pubKeyScript)
	fmt.Println("index:", index)

	/*
		=== RUN   TestGetUTXOFromTx
		txid: 729a0165bf2aaf3109d2a1214ba1161cee5dfaf90a02029a741c8a6dfaa33718
		balance: 2000000
		pubKeyScript: [118 169 20 29 71 102 228 235 81 229 23 227 44 159 84 155 77 250 62 232 215 225 141 136 172]
		--- PASS: TestGetUTXOFromTx (0.01s)
	*/
}

func TestCreateP2TR(t *testing.T) {
	regtest_params := rpc.Regtest_params
	wallet1, err := utils.LoadWallet("2ff6778392d7dc64037ab85a2cc40dfebc8ce2893d6c8b1e0332b6fb08744fe8", &regtest_params)
	if err != nil {
		t.Error(err)
	}
	fmt.Println("senderWallet:", wallet1.Address.EncodeAddress())

	p2tr_addr, err := wallet1.CreateP2TR()
	if err != nil {
		t.Error(err)
	}
	fmt.Println("p2tr_addr:", p2tr_addr)

}
