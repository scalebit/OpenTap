import { useEffect, useState } from "react"
import { getAddressDetail } from '@/config/getData'

const WalletHome = (props: any) => {
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
        console.log("123")
        getBalanceByAddress_()

    }, [getBalanceByAddress_, address])

    return (
        <div>
            <p className="mb-3">{currentWallet.publicKeyArr.length}-{currentWallet.threshold} Threshold Account</p>
            <h3 className="text-[16px] font-bold mb-3 mt-10">Your Address:</h3>
            <p className='w-[360px] break-words'>{currentWallet.p2tr.address}</p>
            <h3 className="text-[16px] font-bold mb-3 mt-10">Bitcoin Amount:</h3>
            <p className='text-[blue] font-bold mb-3'>{amount} sat</p>
            <h3 className="text-[16px] font-bold mb-3 mt-10"> Descriptor</h3>
            <p>Use descriptor to recover the account</p>
            <textarea className="textarea my-5 w-[600px] h-[150px]" value={descriptor} disabled></textarea>
            <p></p>
            <button className='btn w-[150px] btn-primary mr-5' >Copy</button>
        </div>
    )
}

export default WalletHome
