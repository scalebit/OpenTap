package rpc

import (
	"github.com/btcsuite/btcd/btcec/v2/schnorr"
	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/txscript"
)

// Wallet contains private keys, public keys, and Bitcoin addresses
type Wallet struct {
	PrivateKey btcutil.WIF
	PublicKey  btcutil.AddressPubKey
	Address    btcutil.Address
}

// P2TR
// privkey -> pubkey -> shnorr-pubkey => witness program
func (w *Wallet) CreateP2TR() (string, error) {
	addr, err := w.createP2TR()
	if err != nil {
		return "", err
	}
	return addr.String(), nil
}

func (w *Wallet) createP2TR() (*btcutil.AddressTaproot, error) {
	pubKey := txscript.ComputeTaprootKeyNoScript(w.PublicKey.PubKey())
	witnessProg := schnorr.SerializePubKey(pubKey)
	return btcutil.NewAddressTaproot(witnessProg, &chaincfg.RegressionNetParams)
}

func (w *Wallet) SerializeSchnorrPubKey() []byte {
	return schnorr.SerializePubKey(w.PublicKey.PubKey())
}
