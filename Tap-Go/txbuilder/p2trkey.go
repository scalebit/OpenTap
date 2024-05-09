package txbuilder

import (
	"fmt"
	"opentap/rpc"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"
)

func CreateTxP2TRKey(senderWallet *rpc.Wallet, receiverAddr btcutil.Address, amount btcutil.Amount, prevHash *chainhash.Hash, feeSat int64) (*wire.MsgTx, string, error) {
	originTx := wire.NewMsgTx(2)

	senderAddr, err := senderWallet.CreateP2TR()
	if err != nil {
		return nil, "", fmt.Errorf("fail createP2tr(prevAddr): %w", err)
	}

	// 获取未花费的 UTXO
	prevTxID, balance, pubKeyScript, index, err := rpc.GetUTXOFromTx(prevHash, senderAddr)
	if err != nil {
		return nil, "", err
	}
	fmt.Println("utxo:", prevTxID, balance, pubKeyScript, index)

	prevOutputFetcher := txscript.NewCannedPrevOutputFetcher(pubKeyScript, balance)
	txinIndex := int(0)

	sendPkScript, err := txscript.PayToAddrScript(receiverAddr)
	if err != nil {
		return nil, "", fmt.Errorf("fail PayToAddrScript(sendAddr): %w", err)
	}

	txOut := wire.NewTxOut(int64(amount), sendPkScript)
	originTx.AddTxOut(txOut)

	//找零
	changeAddress, err := btcutil.DecodeAddress(senderAddr, &chaincfg.RegressionNetParams)
	if err != nil {
		return nil, "", err
	}
	changeScript, err := txscript.PayToAddrScript(changeAddress)
	if err != nil {
		return nil, "", err
	}
	txChange := wire.NewTxOut(balance-int64(amount)-feeSat, changeScript)
	originTx.AddTxOut(txChange)

	prevOut := wire.NewOutPoint(prevHash, uint32(index))
	txIn := wire.NewTxIn(prevOut, nil, nil)
	originTx.AddTxIn(txIn)

	sigHashes := txscript.NewTxSigHashes(originTx, prevOutputFetcher)
	witness, err := txscript.TaprootWitnessSignature(
		originTx,
		sigHashes,
		txinIndex,
		balance,
		pubKeyScript,
		txscript.SigHashDefault,
		senderWallet.PrivateKey.PrivKey,
	)
	if err != nil {
		return nil, "", fmt.Errorf("fail RawTxInWitnessSignature: %w", err)
	}
	txIn.Witness = witness

	txid := originTx.TxHash()
	return originTx, txid.String(), nil
}
