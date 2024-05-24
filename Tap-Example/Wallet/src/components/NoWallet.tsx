const NoWallet = () => {
    return (
        <div className="no-wallet p-10">
            <h2 className="text-[40px] font-bold mb-8">Oops!</h2>
            <p className="mt-2">There is no OpenTap wallet found in your local storage.</p>
            <p className="mt-4">Please create a new wallet first.</p>

            <button className="btn btn-primary btn-wide mt-10">Create</button>

            <div className="mt-[80px]">
                <h3 className="text-[18px] font-bold mb-3">Visit Our Site</h3>
                <div className="flex">
                    <img src="https://scalebit.xyz/images/bglogo.png" className="h-[50px]" alt="" />
                    <img src="https://scalebit.xyz/images/bglogo.png" className="h-[50px] mx-6" alt="" />
                    <img src="https://scalebit.xyz/images/bglogo.png" className="h-[50px]" alt="" />
                </div>
            </div>
        </div>
    )
}

export default NoWallet
