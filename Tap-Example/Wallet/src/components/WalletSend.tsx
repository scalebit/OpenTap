import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState } from "react"


const WalletSend = (props: any) => {
    const { currentWallet } = props

    const [assetsType, setAssetsType] = useState('Bitcoin')

    return (
        <Tabs defaultValue="Bitcoin" onValueChange={(val: string) => setAssetsType(val)} className="">
            <div className="flex">
                <div className="w-2/5">
                    <h3 className="text-[16px] font-bold mb-3">Send Assets:</h3>
                    <TabsList>
                        <TabsTrigger className="w-[100px]" value="Bitcoin">Bitcoin</TabsTrigger>
                        <TabsTrigger className="w-[100px]" value="Brc20">Brc20</TabsTrigger>
                        <TabsTrigger className="w-[100px]" value="Rune">Rune</TabsTrigger>
                    </TabsList>
                    {/* <TabsContent value="Bitcoin">Bitcoin</TabsContent>
                    <TabsContent value="Brc20">Brc20</TabsContent>
                    <TabsContent value="Bitcoin">Bitcoin</TabsContent> */}
                </div>
                <div className="w-3/5">
                    <TabsContent className="mt-0" value="Brc20">
                        <h3 className="text-[16px] font-bold mb-3">Assets:</h3>
                        <Select>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ordi">ordi</SelectItem>
                            </SelectContent>
                        </Select>

                    </TabsContent>

                </div>
            </div>
            <div className="flex">
                <div className="w-2/5">
                    <div className="mt-5">
                        <h3 className="text-[16px] font-bold mb-3">From:</h3>
                        <div className="flex mb-2">
                            <p className="input input-bordered input-md w-[300px] mr-2 flex items-center ov">dddddddddddddddddddddddddddddd</p>
                            <button className="btn btn-primary w-[100px]">Sign</button>
                        </div>
                        <div className="flex mb-2">
                            <p className="input input-bordered input-md w-[300px] mr-2 flex items-center ov">dddddddddddddddddddddddddddddd</p>
                            <button className="btn btn-primary w-[100px]">Sign</button>
                        </div>
                        <div className="flex mb-2">
                            <p className="input input-bordered input-md w-[300px] mr-2 flex items-center ov">dddddddddddddddddddddddddddddd</p>
                            <button className="btn btn-primary w-[100px]">Sign</button>
                        </div>
                    </div>
                </div>
                <div className="w-3/5">
                    <div className="mt-5">
                        <h3 className="text-[16px] font-bold mb-3">To:</h3>
                        <div className="flex mb-2">
                        <input type="text" placeholder="Address" className="input input-bordered w-[400px] mr-2" />
                        <input type="text" placeholder="Amount" className="input input-bordered w-[100px]" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex mt-[80px]">
                <button className="btn btn-primary w-[200px]">Submit</button>
                <button className="btn btn-neutral w-[200px] mx-2">Import Psbt</button>
                <button className="btn btn-neutral w-[200px]">Export Psbt</button>
            </div>
        </Tabs >
    )
}

export default WalletSend
