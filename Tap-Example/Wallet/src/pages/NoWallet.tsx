import { useNavigate } from "react-router-dom"

const NoWallet = () => {

    const navigate = useNavigate()
    const localWallet_ = JSON.parse(localStorage.getItem('localWallet') || '')
    const hasWallet = (localWallet_ === "")
    return (

        <div className="no-wallet p-10">
            {
                hasWallet ?
                    <>
                        <h2 className="text-[40px] font-bold mb-8">Oops!</h2>
                        <p className="mt-2">There is no OpenTap wallet found in your local storage.</p>
                        <p className="mt-4">Please create a new wallet first.</p>

                        <button className="btn btn-primary btn-wide mt-10" onClick={() => navigate('/create-wallet')}>Create</button>

                        <div className="mt-[80px]">
                            <h3 className="text-[18px] font-bold mb-3">Visit Our Site</h3>
                            <div className="flex">
                                <img src="https://scalebit.xyz/images/bglogo.png" className="h-[50px]" alt="" />
                                <img src="https://scalebit.xyz/images/bglogo.png" className="h-[50px] mx-6" alt="" />
                                <img src="https://scalebit.xyz/images/bglogo.png" className="h-[50px]" alt="" />
                            </div>
                        </div>
                    </>
                    :
                    <>
                        <h2 className="text-[40px] font-bold mb-8">Welcome Back!</h2>
                        <p className="mt-2">Please choose one of the OpenTap wallet in your local storage.</p>
                        <p className="mt-4">Or create a new wallet.</p>

                        <button className="btn btn-primary btn-wide mt-10" onClick={() => navigate('/create-wallet')}>Create</button>

                        <div className="mt-[80px]">
                            <h3 className="text-[18px] font-bold mb-3">Visit Our Site</h3>
                            <div className="flex">
                                <img src="https://scalebit.xyz/images/bglogo.png" className="h-[50px]" alt="" />
                                <img src="https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png" className="h-[50px] mx-6" alt="" />
                                <img src="https://img.icons8.com/?size=100&id=8824&format=png" className="h-[50px]" alt="" />
                            </div>
                        </div>
                    </>
            }

        </div>
    )
}

export default NoWallet
