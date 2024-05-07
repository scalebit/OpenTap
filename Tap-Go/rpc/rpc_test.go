package rpc_test

import (
	"fmt"
	"opentap/rpc"
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
