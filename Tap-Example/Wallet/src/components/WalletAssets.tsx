import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { toast } from "./ui/use-toast"
import { import_psbt, export_psbt, build_psbt, sign_psbt, pay_psbt_hex } from 'opentap-v0.14/src/taproot/transaction_builder'
import { IUTXO, invert_json_p2tr, prase_decimal } from "opentap-v0.14/src/taproot/utils"
import { getAddressDetail, getAllTick, getAllTickBalance, getUTXO, getUTXOfromTx, txBroadcast } from "@/config/getData"
import { PsbtbodyType } from "@/config/interface"

const WalletAssets = (props: any) => {
    const { currentWallet } = props
    const descriptor = JSON.stringify(currentWallet.p2tr)
    const [amount, setAmount] = useState("Loading")
    const address = currentWallet.p2tr.address

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const getBalanceByAddress_ = async () => {
        const r = await getAddressDetail(address)
        console.log(r)
        setAmount(r.txHistory.balanceSat)
    }

    useEffect(() => {
        getBalanceByAddress_()
    }, [getBalanceByAddress_, address])

    const [allbrc, Setallbrc] = useState({})
    const [brc20tick, Setbrc20tick] = useState({})

    const getAllTick_ = async () => {
        const temp = await getAllTick()
        Setbrc20tick(temp)
        const temp1 = await getAllTickBalance(address)
        Setallbrc(temp1)
    }

    function getDecimal(tick: string): number {
        if (!brc20tick.tokens) { return 18 }
        for (let i = 0; i < brc20tick.tokens.length; i++) {
            const brc20 = brc20tick.tokens[i]
            if (brc20.tick == tick) {
                return brc20.decimal
            }
        }

    }

    useEffect(() => {
        getAllTick_();
    }, []);

    return (
        <div>
            <h3 className="text-[16px] font-bold mb-3 mt-10">Your Address:</h3>
            <p className='w-[360px] break-words'>{currentWallet.p2tr.address}</p>
            <h3 className="text-[16px] font-bold mb-3 mt-10">Bitcoin Amount:</h3>
            <p className='text-[blue] font-bold mb-3'>{amount} sat</p>
            <h3 className="text-[16px] font-bold mb-3 mt-10">Brc20 Amount:</h3>
            {
                allbrc.balance ?
                    allbrc.balance.map((item: any, index: number) =>
                        <>
                            <h3 className="text-[16px] font-bold mb-3 mt-3">{item.tick}</h3>
                            <p className='text-[blue] font-bold mb-3' key={index} > {prase_decimal(item.overallBalance, getDecimal(item.tick))} {item.tick}</p>
                        </>
                    )
                    :
                    <></>
            }
        </div>
    )
}

export default WalletAssets