package bridge

import (
	"fmt"

	"github.com/btcsuite/btcd/txscript"
)

func AsmBuilder(allKey [][]byte, threshold int) ([]byte, error) {
	builder := txscript.NewScriptBuilder()
	// leafScriptAsm := fmt.Sprintf("%s OP_CHECKSIG", allKey[0])
	builder.AddData(allKey[0]).AddOp(txscript.OP_CHECKSIG)

	for i := 1; i < len(allKey); i++ {
		// leafScriptAsm += fmt.Sprintf(" %s OP_CHECKSIGADD", allKey[i])
		builder.AddData(allKey[i]).AddOp(txscript.OP_CHECKSIGADD)
	}
	// leafScriptAsm += fmt.Sprintf(" %x OP_GREATERTHANOREQUAL", threshold)
	builder.AddInt64(int64(threshold)).AddOp(txscript.OP_GREATERTHANOREQUAL)

	// bitcoin script
	leafScript, err := builder.Script()
	if err != nil {
		return nil, err
	}
	// fmt.Println("asmbuilder:", leafScript)
	// leafScript, _ := bscript.NewFromASM(leafScriptAsm)

	return leafScript, nil
}

func AsmCsv(relTime int64, pubKey []byte) ([]byte, error) {
	builder := txscript.NewScriptBuilder()
	// relTimeHex := fmt.Sprintf("%x", relTime)
	// leafScriptAsm := relTimeHex + " OP_CHECKSEQUENCEVERIFY OP_DROP " + pubKey + " OP_CHECKSIG"
	builder.AddInt64(relTime).AddOp(txscript.OP_CHECKSEQUENCEVERIFY).AddOp(txscript.OP_DROP).AddData(pubKey).AddOp(txscript.OP_CHECKSIG)
	// fmt.Println("csvbuilder:" + leafScriptAsm)

	leafScript, err := builder.Script()
	if err != nil {
		return nil, err
	}
	return leafScript, nil
}

func GetThresholdByOp(threshold int) string {
	flag := threshold
	var asm string

	if flag <= 16 {
		asm = fmt.Sprintf("OP_%d", threshold)
	} else {
		asm = "OP_16"
		flag = flag - 16
		for flag > 16 {
			asm = asm + " OP_16 OP_ADD"
			flag = flag - 16
		}
		asm = asm + fmt.Sprintf(" OP_%d OP_ADD", flag%16)
	}

	return asm
}
