package bridge

import (
	"fmt"
	"testing"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/txscript"
)

func TestAsmBuilder(t *testing.T) {
	wifStr1 := "cQpHXfs91s5eR9PWXui6qo2xjoJb2X3VdUspwKXe4A8Dybvut2rL"
	wif1, err := btcutil.DecodeWIF(wifStr1)
	if err != nil {
		t.Error(err)
	}
	// public key extracted from wif.PrivKey
	pk1 := wif1.PrivKey.PubKey().SerializeCompressed()

	wifStr2 := "cVgxEkRBtnfvd41ssd4PCsiemahAHidFrLWYoDBMNojUeME8dojZ"
	wif2, err := btcutil.DecodeWIF(wifStr2)
	if err != nil {
		t.Error(err)
	}
	pk2 := wif2.PrivKey.PubKey().SerializeCompressed()

	wifStr3 := "cPXZBMz5pKytwCyUNAdq94R9VafU8L2QmAW8uw3gKrzjuCWCd3TM"
	wif3, err := btcutil.DecodeWIF(wifStr3)
	if err != nil {
		t.Error(err)
	}
	pk3 := wif3.PrivKey.PubKey().SerializeCompressed()

	allKey := [][]byte{pk1, pk2, pk3}
	threshold := 2
	script, err := AsmBuilder(allKey, threshold)
	if err != nil {
		t.Error(err)
	}

	redeemStr, err := txscript.DisasmString(script)
	if err != nil {
		t.Error(err)
	}

	fmt.Println(redeemStr)
}

func TestAsmCsv(t *testing.T) {
	wifStr1 := "cPBwBXauJpeC2Q2CB99xtzrtA1fRDAyqApySv2QvhYCbmMsTGYy7"
	wif1, err := btcutil.DecodeWIF(wifStr1)
	if err != nil {
		t.Error(err)
	}
	// public key extracted from wif.PrivKey
	pk1 := wif1.PrivKey.PubKey().SerializeCompressed()

	relTime := int64(1)
	script, err := AsmCsv(relTime, pk1)
	fmt.Println(script)
	if err != nil {
		fmt.Println(err.Error())
		t.Error(err)
	}
	redeemStr, err := txscript.DisasmString(script)
	if err != nil {
		t.Error(err)
	}

	fmt.Println(redeemStr)
}
