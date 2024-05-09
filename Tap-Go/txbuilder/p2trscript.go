package txbuilder

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"opentap/rpc"

	"github.com/btcsuite/btcd/btcec/v2"
	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"
)

var (
	preimage, _ = hex.DecodeString("00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff")
	paymentHash = sha256.Sum256(preimage)
)

func CreateScript(pubkeyA []byte, pubkeyB []byte) [][]byte {
	const (
		OP_IF          = 0x63
		OP_ELSE        = 0x67
		OP_ENDIF       = 0x68
		OP_DROP        = 0x75
		OP_EQUAL       = 0x87
		OP_EQUALVERIFY = 0x88
		OP_SHA256      = 0xa8
		OP_CHKSIG      = 0xac
		OP_CSV         = 0xb2
	)

	part1a := []byte{OP_SHA256, byte(len(paymentHash))}
	// paymentHash[:]
	part1b := []byte{OP_EQUALVERIFY, byte(len(pubkeyA))}
	// pubkeyA
	part1c := []byte{OP_CHKSIG}
	script1 := make(
		[]byte,
		0,
		len(part1a)+
			len(paymentHash)+
			len(part1b)+
			len(pubkeyA)+
			len(part1c))
	script1 = append(script1, part1a...)
	script1 = append(script1, paymentHash[:]...)
	script1 = append(script1, part1b...)
	script1 = append(script1, pubkeyA...)
	script1 = append(script1, part1c...)

	part2a := []byte{byte(len(pubkeyB))}
	// pubkeyB
	part2b := []byte{OP_CHKSIG}
	script2 := make(
		[]byte,
		0,
		len(part2a)+
			len(pubkeyB)+
			len(part2b))
	script2 = append(script2, part2a...)
	script2 = append(script2, pubkeyB...)
	script2 = append(script2, part2b...)

	script1_str, _ := txscript.DisasmString(script1)
	fmt.Println("script1:", script1_str)
	script2_str, _ := txscript.DisasmString(script2)
	fmt.Println("script2:", script2_str)

	return [][]byte{script1, script2}
}

func CreateTxP2TRScript(senderWallet *rpc.Wallet, receiverPk *btcec.PublicKey, amount btcutil.Amount, prevHash *chainhash.Hash, feeSat int64) (*wire.MsgTx, string, error) {
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

	sendPkScript, err := txscript.PayToTaprootScript(receiverPk)
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
	//pay to address of script
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
