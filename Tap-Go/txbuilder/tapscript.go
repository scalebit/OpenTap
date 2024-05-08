package txbuilder

import (
	"opentap/rpc"

	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/txscript"
)

type TapScript struct {
	Key     *rpc.Wallet
	Scripts []txscript.TapLeaf
	Net     *chaincfg.Params
}

func NewTapScript(wallet *rpc.Wallet, scripts [][]byte, net *chaincfg.Params) *TapScript {
	taps := make([]txscript.TapLeaf, len(scripts))
	for i, v := range scripts {
		taps[i] = txscript.NewBaseTapLeaf(v)
	}
	return &TapScript{
		Key:     wallet,
		Scripts: taps,
		Net:     net,
	}
}
