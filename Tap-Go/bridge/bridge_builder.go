package bridge

import (
	"fmt"
	"opentap/rpc"

	"github.com/btcsuite/btcd/btcec/v2"
	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/txscript"
)

const LEAF_VERSION_TAPSCRIPT = 192

func GetTaprootBridge(keypair *rpc.Wallet, keys []*rpc.Wallet, keynum int, threshold int, locktime int64, network int) ([]byte, []byte, []byte) {
	// All input have to be signed
	// So generated some random private key to sign
	leafKeys := make([]*rpc.Wallet, keynum)
	leafPubkeys := make([]string, keynum)

	for i := 0; i < keynum; i++ {
		leafKeys[i] = keys[i]
		leafPubkey := leafKeys[i].PublicKey.String()
		leafPubkeys = append(leafPubkeys, leafPubkey)
	}

	// leafScript := AsmBuilder(leafPubkeys, threshold)
	// csvScript := AsmCsv(locktime, keypair.PublicKey.String())

	// scriptTree := txscript.AssembleTaprootScriptTree(
	// 	txscript.NewBaseTapLeaf([]byte("50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0 OP_CHECKSIG")),
	// 	txscript.NewBaseTapLeaf(csvScript),
	// 	txscript.NewBaseTapLeaf(leafScript),
	// )

	// redeem := txscript.NewTapLeaf(LEAF_VERSION_TAPSCRIPT, leafScript)

	// redeem_csv := txscript.NewTapLeaf(LEAF_VERSION_TAPSCRIPT, csvScript)

	pk, _ := btcec.ParsePubKey([]byte(keypair.PublicKey.String()))
	p2pktr, _ := txscript.PayToTaprootScript(pk)

	temp_trans, _ := rpc.Faccut(keypair, btcutil.Amount(2000000))
	fmt.Println("The new txid is:", temp_trans)

	p2csvtr, _ := txscript.PayToTaprootScript(pk)
	utxos := []byte("")
	return p2pktr, p2csvtr, utxos
}
