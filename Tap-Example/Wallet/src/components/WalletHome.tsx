
const WalletHome = (props: any) => {
    const { currentWallet } = props
    return (
        <div>
            <h3 className="text-[16px] font-bold mb-3">Your Address:</h3>
            <p className='w-[360px] break-words'>{currentWallet.p2tr.address}</p>
            <h3 className="text-[16px] font-bold mb-3 mt-10">Bitcoin Amount:</h3>
            <p className='text-[blue] font-bold mb-3'>0.0025</p>
            <p>{currentWallet.publicKeyArr.length}-{currentWallet.threshold} Threshold Account</p>
        </div>
    )
}

export default WalletHome
