
const WalletHome = (props: any) => {
    const { currentWallet } = props
    const descriptor = "123"
    return (
        <div>
            <h3 className="text-[16px] font-bold mb-3">Your Address:</h3>
            <p className='w-[360px] break-words'>{currentWallet.p2tr.address}</p>
            <h3 className="text-[16px] font-bold mb-3 mt-10">Bitcoin Amount:</h3>
            <p className='text-[blue] font-bold mb-3'>0.0025</p>
            <p>{currentWallet.publicKeyArr.length}-{currentWallet.threshold} Threshold Account</p>
            <h3 className="text-[16px] font-bold mb-3 mt-10"> Descriptor</h3>
            <p>Use descriptor to recover the account</p>
            <textarea className="textarea my-5 w-[600px] h-[150px]" value={descriptor} disabled></textarea>
            <p></p>
            <button className='btn w-[150px] btn-primary mr-5' >Copy</button>
        </div>
    )
}

export default WalletHome
