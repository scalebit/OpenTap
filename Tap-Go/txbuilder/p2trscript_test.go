package txbuilder

import (
	"fmt"
	"opentap/utils"
	"testing"

	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
)

func TestCreateScriptMutiSig(t *testing.T) {
	wallet1, err := utils.LoadWallet("2ff6778392d7dc64037ab85a2cc40dfebc8ce2893d6c8b1e0332b6fb08744fe8", &chaincfg.RegressionNetParams)
	if err != nil {
		t.Error(err)
	}
	wallet2, err := utils.LoadWallet("3fe069f9c7cae96daf359f2e08bea43979c9a2d87325fffde261163378e33d15", &chaincfg.RegressionNetParams)
	if err != nil {
		t.Error(err)
	}

	publickeys := [][]byte{wallet1.SerializeSchnorrPubKey(), wallet2.SerializeSchnorrPubKey()}
	scripts, _ := CreateScriptMutiSig(publickeys, len(publickeys), 15)
	fmt.Println(scripts)
}

func TestCreateScript(t *testing.T) {
	wallet1, err := utils.LoadWallet("2ff6778392d7dc64037ab85a2cc40dfebc8ce2893d6c8b1e0332b6fb08744fe8", &chaincfg.RegressionNetParams)
	if err != nil {
		t.Error(err)
	}
	wallet2, err := utils.LoadWallet("3fe069f9c7cae96daf359f2e08bea43979c9a2d87325fffde261163378e33d15", &chaincfg.RegressionNetParams)
	if err != nil {
		t.Error(err)
	}
	scripts := CreateScriptHashLock(wallet1.SerializeSchnorrPubKey(), wallet2.SerializeSchnorrPubKey())
	fmt.Println(scripts)

	ts := NewTapScript(wallet2, scripts, &chaincfg.RegressionNetParams)
	p2tr, err := ts.CreateP2tr()
	if err != nil {
		fmt.Printf("fail CreateP2TR(): %v\n", err)
		return
	}
	fmt.Println(p2tr)

	// redeem
	prevHash, _ := chainhash.NewHashFromStr("cc6bbc55755d2b3fc3a55bcb3fc9505804960a239abc0db9098c752aabd11003")
	prevIndex := uint32(1)
	prevAmountSat := int64(10_000)
	sendAddrStr := "bcrt1quqqccct6wqpq9tp7qqw0j74cy4wkmrc5mt3d3t"
	feeSat := int64(330)

	tx, txid, err := ts.CreateRawTxP2TR(
		// previous output
		prevHash, prevIndex, prevAmountSat,
		// current output
		sendAddrStr, feeSat,
		// unlock
		0, // script1 = scripts[0]
		[][]byte{preimage},
		wallet1,
		0,
	)
	if err != nil {
		t.Error(err)
	}
	fmt.Println("txid:", txid)
	fmt.Println("tx:", tx)
}
