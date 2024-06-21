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
import { IUTXO, invert_json_p2tr } from "opentap-v0.14/src/taproot/utils"
import { getAddressDetail, getAllTick, getAllTickBalance, getUTXO, getUTXOfromTx, txBroadcast } from "@/config/getData"
import { PsbtbodyType } from "@/config/interface"


const WalletSend = (props: any) => {
    const { currentWallet } = props

    const [network, Setnetwork] = useState('regtest')

    const [amount, SetAmount] = useState("Loading")

    const [mertic, Setmertic] = useState("sats")

    const [allbrc, Setallbrc] = useState({})

    const [allbtc, Setallbtc] = useState({})

    const address = currentWallet.p2tr.address

    const getBalanceByAddress_ = async () => {
        const r = await getAddressDetail(address)
        Setallbtc(r)
        SetAmount(r.txHistory.balanceSat)
    }

    const setAmountToBTC = () => {
        SetAmount(allbtc.txHistory.balanceSat)
        Setmertic("sats")

        Setpsbtbase("")
        toast({
            variant: "default",
            title: "Notify",
            description: "The signature of psbt has been reset due to the modification of parameter",
        })

        Setpsbtbody({
            ...psbtbody,
            "sign": []
        });
    }

    const setAmountToBrc = (event: any) => {

        Setmertic(event.target.value)
        Setpsbtbase("")
        toast({
            variant: "default",
            title: "Notify",
            description: "The signature of psbt has been reset due to the modification of parameter",
        })

        Setpsbtbody({
            ...psbtbody,
            "sign": []
        });
        for (let i = 0; i < allbrc.balance.length; i++) {
            if (allbrc.balance[i].tick == event.target.value) {
                SetAmount(allbrc.balance[i].overallBalance);
                return;
            }
        }

        SetAmount("0")
    }

    useEffect(() => {
        getBalanceByAddress_()
    }, [address])

    //getBalanceByAddress_, 

    const [WIF, SetWIF] = useState('')

    const [assetsType, setAssetsType] = useState('Bitcoin')

    const [tempAccount, SettempAccount] = useState('')

    const [tempAddr, SettempAddr] = useState('')

    const [tempUTXO, SettempUTXO] = useState('')

    const [brc20tick, Setbrc20tick] = useState({})

    const [psbtraw, Setpsbtraw] = useState({})

    const [psbtbase, Setpsbtbase] = useState('')

    const [psbtbaseimport, Setpsbtbaseimport] = useState('')

    const [psbtbody, Setpsbtbody] = useState<PsbtbodyType>({
        "from": currentWallet.p2tr.address,
        "to": "",
        "amount": "",
        "fee": "",
        "sign": []
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleInputChange = (event: any, key: any) => {
        Setpsbtbase("")
        toast({
            variant: "default",
            title: "Notify",
            description: "The signature of psbt has been reset due to the modification of parameter",
        })
        switch (key) {
            case "amt":
                {
                    Setpsbtbody({
                        ...psbtbody,
                        "amount": event.target.value,
                        "sign": []
                    });
                    break
                }
            case "fee":
                {
                    Setpsbtbody({
                        ...psbtbody,
                        "fee": event.target.value,
                        "sign": []
                    });
                    break
                }
            case "to":
                {
                    Setpsbtbody({
                        ...psbtbody,
                        "to": event.target.value,
                        "sign": []
                    });
                    break
                }
        }
    };

    const [IsReg, setIsReg] = useState(false)

    const [IsLoad, SetIsLoad] = useState(false)

    const pubkeys = currentWallet.publicKeyArr

    const threshold = currentWallet.p2tr.m

    const openRegtest = () => {
        setIsReg(true)
    }

    const closeRegtest = () => {
        setIsReg(false)
    }

    const signPsbt = async () => {
        let psbt_temp = ""
        if (!psbtbody.amount && !psbtbody.to) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please input the amount and the address you want to send",
            })
            return
        }
        if (!psbtbase) {
            let utxos: IUTXO[] | undefined = []
            if (mertic == "sats") { utxos = await getUXTO_() }
            else { utxos = await getUTXOfromTx(tempUTXO) }
            if (!utxos) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Insufficient fund, not enough UXTOs for this transaction",
                })
                return
            }
            const { p2pktr } = invert_json_p2tr(JSON.stringify(currentWallet.p2tr))
            psbt_temp = build_psbt(p2pktr.redeem, utxos!, p2pktr.address!, psbtbody.to!, network, p2pktr, parseInt(psbtbody.amount), parseInt(psbtbody.fee))
            Setpsbtraw(import_psbt(psbt_temp))
        }
        else {
            psbt_temp = psbtbase
        }
        try { Setpsbtbase(sign_psbt(psbt_temp, WIF, network)) }
        catch (e) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Invalid keypair for signature",
            })
            return
        }
        Setpsbtbody({
            ...psbtbody,
            "sign": [...psbtbody.sign, WIF]
        });
        toast({
            variant: "default",
            title: "Notify",
            description: "Sign Successfully",
        })
        return
    }

    const changePsbtbase = (val: string) => {
        Setpsbtbaseimport(val)
    }

    const changeWIF = (val: string) => {
        SetWIF(val)
    }

    const importPsbt = () => {
        if (!psbtbase) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please input the Base64 psbt",
            })
        }
        else {
            Setpsbtraw(import_psbt(psbtbaseimport));
            Setpsbtbase(psbtbaseimport);
        }
    }

    const exportPsbt = async () => {
        if (!psbtbody.to || !psbtbody.amount || !psbtbody.fee) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Incomplete Psbt",
            })
            return
        }
        if (!psbtbase) {
            const utxos = await getUXTO_()
            console.log(utxos)
            if (!utxos) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Insufficient fund, not enough UXTOs for this transaction",
                })
                return
            }
            const { p2pktr } = invert_json_p2tr(JSON.stringify(currentWallet.p2tr))
            try {
                const psbt_temp = build_psbt(p2pktr.redeem, utxos!, p2pktr.address, psbtbody.to, "regtest", p2pktr, parseInt(psbtbody.amount), parseInt(psbtbody.fee))
                Setpsbtraw(import_psbt(psbt_temp))
                Setpsbtbase(psbt_temp)
            }
            catch {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Invalid parameter in Psbt",
                })
                return
            }

        }
        navigator.clipboard.writeText(psbtbase).then(() => {
            toast({
                variant: "default",
                title: "Notify",
                description: "Your Psbt in Base64 is successfully copied to clipboard",
            })
        }).catch((err) => {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Copy error",
            })
            console.error("Copy error: ", err);
        });
    }

    const payPsbt = async () => {
        if (psbtbody.sign.length < threshold) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Not enough signature",
            })
            return
        }

        const txhex = pay_psbt_hex(psbtbase, psbtbody.sign.length, pubkeys.length, network, pubkeys);

        await txBroadcast(txhex).then(txid => {
            console.log(txid)
            toast({
                variant: "default",
                title: "Notify",
                description: "Transcation successed, the ID is copied to clipboard"
            })
            navigator.clipboard.writeText(txid)
        }).catch((err) => {
            toast({
                variant: "destructive",
                title: "Error",
                description: "The Psbt or UTXO is invalid",
            })
            console.error("Copy error: ", err);
        });
    }

    const payIns = async () => {
        if (psbtbody.sign.length < threshold) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "The main transaction haven't get enough signature",
            })
            return
        }

        const utxos = await getUTXO(tempAddr, 1001)
        const txhex = pay_ins_hex(tempAccount, utxos![0], currentWallet.p2tr.address, network);

        await txBroadcast(txhex).then(txid => {
            SettempUTXO(txid)
            toast({
                variant: "default",
                title: "Notify",
                description: "Transcation successed, the ID is copied to clipboard"
            })
            navigator.clipboard.writeText(txid)
        }).catch((err) => {
            toast({
                variant: "destructive",
                title: "Error",
                description: "The Psbt is invalid or insufficient fund",
            })
            console.error("Copy error: ", err);
        });
    }


    // eslint-disable-next-line react-hooks/exhaustive-deps
    const getUXTO_ = async () => {
        const r = await getUTXO(currentWallet.p2tr.address, parseInt(psbtbody.amount))
        return r
    }

    const getAllTick_ = async () => {
        const temp = await getAllTick()
        Setbrc20tick(temp)
        SetIsLoad(true)
        const temp1 = await getAllTickBalance(address)
        Setallbrc(temp1)
    }

    useEffect(() => {
        getAllTick_();
    }, []);

    // console.log(r)
    // setAmount(r.txHistory.balanceSat)

    // useEffect(() => {
    //     getUXTO_()
    // }, [getBalanceByAddress_, address])

    // TODO: 
    // (1) 选择Rune也需要弹出Assets
    // (2) 很多Copy按钮没有效果
    return (
        <Tabs defaultValue="Bitcoin" onValueChange={(val: string) => setAssetsType(val)} className="">
            <div className="flex">
                <div className="w-2/5">
                    <h3 className="text-[16px] font-bold mb-3">Send Assets:</h3>
                    <TabsList className="mr-3">
                        <TabsTrigger onClick={setAmountToBTC} className="w-[100px]" value="Bitcoin">Bitcoin</TabsTrigger>
                        <TabsTrigger className="w-[100px]" value="Brc20">Brc20</TabsTrigger>
                        {/* <TabsTrigger className="w-[100px]" value="Rune">Rune</TabsTrigger> */}
                    </TabsList>
                    {
                        IsReg ? <button className="btn btn-sm btn-primary w-[100px] mb-3 h-[40px]" onClick={closeRegtest}>Regtest</button>
                            : <button className="btn btn-sm w-[100px] mb-3 h-[40px]" onClick={openRegtest}>Regtest</button>
                    }
                    {/* <TabsContent value="Bitcoin">Bitcoin</TabsContent>
                    <TabsContent value="Brc20">Brc20</TabsContent>
                    <TabsContent value="Bitcoin">Bitcoin</TabsContent> */}
                </div>
                <div className="w-3/5">
                    <TabsContent className="mt-0" value="Brc20">
                        <h3 className="text-[16px] font-bold mb-3">Assets:</h3>
                        <select className="select select-bordered w-full select-sm max-w-xs w-[120px] h-[40px]" onChange={(e) => setAmountToBrc(e)} >
                            {
                                brc20tick.tokens ?
                                    brc20tick.tokens.map((item: any, index: number) =>
                                        <option value={item.tick} key={index}>{item.tick}</option>
                                    )
                                    :
                                    <></>
                            }
                        </select>
                    </TabsContent>
                </div>

            </div>

            <h3 className="text-[16px] font-bold mb-3 mt-4">Amount:</h3>
            <p className='text-[blue] font-bold mb-6'>{amount} {mertic}</p>

            {
                (assetsType == "Brc20") ?
                    <>
                        <h3 className="text-[16px] font-bold mb-3 mt-4">Temporary Account:</h3>
                        <input type="text" onChange={(e) => SettempAccount(e.target.value)} className="input input-bordered input-md w-[600px] mr-2 mb-2 flex items-center ov" placeholder="Account WIF (Make Sure It Have Some Sats)" ></input>
                        <input type="text" onChange={(e) => SettempAddr(e.target.value)} className="input input-bordered input-md w-[600px] mr-2 flex items-center ov" placeholder="Account Address" ></input>
                    </>
                    :
                    <></>
            }

            <div className="w-3/5">
                <h3 className="text-[16px] font-bold mt-3">Import From Base64:</h3>
                <textarea className="textarea textarea-bordered mt-3 w-[600px] h-[150px]" placeholder="Input Base64 Psbt Here" onChange={(e) => changePsbtbase(e.target.value)}></textarea>
            </div>
            <button className="btn w-[200px] my-2" onClick={importPsbt}>Import Psbt</button>
            <div className="flex">
                <div className="w-4/5">
                    <div className="mt-5">
                        <h3 className="text-[16px] font-bold mb-3">From:</h3>
                        <input type="text" className="input input-bordered input-md w-[658px] mr-2 mb-3 flex items-center ov" value={currentWallet.p2tr.address} disabled></input>
                        {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            pubkeys.map((item: any) =>
                                <div className="flex mb-3">
                                    <input type="text" className="input input-bordered input-md w-[100px] mr-2 flex items-center ov" value={item.tag} disabled></input>
                                    <input type="text" className="input input-bordered input-md w-[550px] mr-2 flex items-center ov" value={item.publicKey} disabled></input>
                                    {/* {
                                        IsReg ? <p className="input input-bordered input-md w-[550px] mr-2 flex items-center ov">{ConvertBuffer(item.data)}</p>
                                            : <></>
                                    } */}
                                </div>
                            )
                        }
                    </div>
                </div>
                <div className="w-3/5">
                    <div className="mt-5">
                        <h3 className="text-[16px] font-bold mb-3">To:</h3>
                        <div className="flex mb-7">
                            <input type="text" placeholder="Address" className="input input-bordered w-[400px] mr-2" value={psbtbody.to} onChange={(e) => handleInputChange(e, "to")} />
                        </div>
                        <h3 className="text-[16px] font-bold mb-3">Value:</h3>
                        <div className="flex mb-2">
                            <input type="text" placeholder="Amount/sat" className="input input-bordered w-[196px] mr-2" value={psbtbody.amount} onChange={(e) => handleInputChange(e, "amt")} />
                            <input type="text" placeholder="Fee/sat" className="input input-bordered w-[196px] mr-2" value={psbtbody.fee} onChange={(e) => handleInputChange(e, "fee")} />
                        </div>
                    </div>
                </div>
            </div >
            <div className="flex my-[15 px]">
                <p className="text-[16px] font-bold mb-3 mt-10 mr-2">Sign Status:</p>
                <p className="text-[16px] text-[blue] font-bold mb-3 mt-10" >{psbtbody.sign.length}/{threshold} Complete</p>
            </div>
            {
                IsReg ?
                    <div className="flex">
                        <input type="text" className="input input-bordered input-md w-[500px] mr-2 flex items-center ov" placeholder="Input Your WIF Here" onChange={(e) => changeWIF(e.target.value)}></input>
                        <button className="btn btn-outline w-[100px] mr-2" onClick={signPsbt}>Sign</button>
                    </div>
                    : <></>
            }
            <div className="flex mt-[20px]">
                {
                    IsReg ? <></> : <button className="btn btn-outline w-[100px] mr-2" onClick={signPsbt}>Sign</button>
                }
                <></>
                {
                    (assetsType == "Brc20") ?
                        <button className="btn btn-primary w-[200px] mr-2" onClick={payIns}>Submit Inscribe</button>
                        :
                        <></>
                }
                <button className="btn btn-primary w-[200px] mr-2" onClick={payPsbt}>Submit</button>
                <button className="btn btn-neutral w-[200px]" onClick={exportPsbt}>Export Psbt</button>
            </div>
        </Tabs >
    )
}

export default WalletSend
