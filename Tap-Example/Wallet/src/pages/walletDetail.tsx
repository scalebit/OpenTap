import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import WalletHome from '../components/WalletHome'

const WalletDetail = () => {
    const location = useParams();
    const [tab, setTab] = useState(1)
    let currentWallet = null
    const localWallet_ = JSON.parse(localStorage.getItem('localWallet') || '')
    for (const key in localWallet_) {
        const obj_ = localWallet_[key]
        if (obj_.p2tr.address === location.address) {
            currentWallet = obj_
        }
    }

    useEffect(() => {

    }, [])

    return (
        <div>
            <h2 className='text-[30px] mb-5'>My Wallet</h2>
            <div role="tablist" className="tabs tabs-boxed max-w-[500px] mb-5">
                <a role="tab" className={`tab ${tab === 1 ? 'tab-active' : ''}`} onClick={() => setTab(1)}>Home</a>
                <a role="tab" className={`tab ${tab === 2 ? 'tab-active' : ''}`} onClick={() => setTab(2)}>Send</a>
                <a role="tab" className={`tab ${tab === 3 ? 'tab-active' : ''}`} onClick={() => setTab(3)}>Asset</a>
            </div>
            {
                tab === 1 ? <WalletHome currentWallet={currentWallet} /> : <></>
            }
        </div>
    )
}

export default WalletDetail
