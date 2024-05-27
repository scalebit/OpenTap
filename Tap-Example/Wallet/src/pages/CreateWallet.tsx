import { useState, useEffect } from 'react'
import { useStore } from '../store/index'
import { asm_builder, p2tr_wallet } from 'open-tap-nodejs/src/taproot/taproot_script_builder'

const CreateWallet = () => {
    const { network, publicKey } = useStore()

    const [step, setStep] = useState(1)

    const [walletName, setWalletName] = useState('')

    const [publicKeyArr, setPublicKeyArr] = useState([{
        tag: '',
        publicKey: ''
    },
    {
        tag: '',
        publicKey: ''
    }])

    const [threshold, setThreshold] = useState(1)

    const [descriptor, setDescriptor] = useState('vuwuevbbseviubweuirbviuaehriyvbkhebrviyebriyvbiwEBSVIUIAEVUYEGSUKRGVUEYRGF7458GERUGIVYGEAR8OTG4875EG487E5YGH45HG45HG9H94G')

    console.log(setDescriptor)

    useEffect(() => {
        if (publicKey) {
            changePK('publicKey', publicKey, 0)
        }
    }, [publicKey])

    const changePK = (key: 'tag' | 'publicKey', val: string, index: number) => {
        const arr_ = [...publicKeyArr]
        const obj_ = arr_[index]
        obj_[key] = val
        arr_[index] = obj_
        setPublicKeyArr(arr_)
    }

    const addPublicKey = () => {
        const arr_ = [...publicKeyArr, {
            tag: '',
            publicKey: ''
        }]
        setPublicKeyArr(arr_)
    }

    const delPublicKey = (index: number) => {
        const arr_ = [...publicKeyArr]
        arr_.splice(index, 1)
        setPublicKeyArr(arr_)
    }

    const nextStep = () => {
        if (step === 2) {
            if (!walletName) {
                return
            }
        } else if (step === 3) {
            const flag = publicKeyArr.every(item => item.tag && item.publicKey)
            if (!flag || threshold < 1 || threshold > publicKeyArr.length) {
                return
            }
            //TODO:检查所有的publickey是否为32位，如果不是则return

            //创建对应的地址和解锁脚本
            const pks: string[] = publicKeyArr.map(item => item.publicKey)
            const script = asm_builder(pks, threshold)
            const { p2tr, redeem } = p2tr_wallet(script, pks)

            //TODO:生成JSON并保存在LocalStroge中，并标记为（wallet + 编号 + 之前命名的名称）
            localStorage.setItem(walletName + '-address', JSON.stringify(p2tr));
            localStorage.setItem(walletName + '-reedem', JSON.stringify(redeem));
        }

        setStep(step + 1)
    }

    const handleCreate = () => {

    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(descriptor).then(() => {
            console.log('copy success')
        }).catch((err) => {
            console.error("copy error: ", err);
        });
    }

    return (
        <div>
            <h2 className="text-[30px] mb-6">Create Your Wallet</h2>
            <ul className="steps mb-9">
                <li className={`step ${step >= 1 ? 'step-primary' : ''}`}></li>
                <li className={`step ${step >= 2 ? 'step-primary' : ''}`}></li>
                <li className={`step ${step >= 3 ? 'step-primary' : ''}`}></li>
                <li className={`step ${step >= 4 ? 'step-primary' : ''}`}></li>
            </ul>

            {
                step === 1 ? <div>
                    <p className='font-bold mb-5'>Step 1: Connect</p>
                    <p>To protect your private key.</p>
                    <p className='my-2'>please assgin with a third-party wallet.</p>
                    <p>Or using descriptor to Import a wallet.</p>
                    <div className='flex mt-10'>
                        <button className='btn w-[150px] btn-primary mr-5' onClick={nextStep}>Next</button>
                        <button className='btn w-[150px] btn-neutral'>Import</button>
                    </div>
                </div> : step === 2 ? <div>
                    <p className='font-bold mb-5'>Step 2: Information</p>
                    <p>Choose the Name and Network of your new wallet.</p>
                    <label className="input input-bordered flex items-center gap-2 w-[400px] my-6">
                        <input type="text" className="grow" placeholder="" value={walletName} onChange={(e) => setWalletName(e.target.value)} />
                        <span className="badge badge-info">{network}</span>
                    </label>
                    <p>Please <span className='font-bold'>Confirm</span> your setting.</p>
                    <div className='flex mt-10'>
                        <button className='btn w-[150px] mr-5' onClick={() => setStep(step - 1)}>Back</button>
                        <button className='btn w-[150px] btn-primary' onClick={nextStep}>Confirm</button>
                    </div>
                </div> : step === 3 ? <div>
                    <p className='font-bold mb-5'>Step 3: Multi-Sig</p>
                    <p>Create Threshold Multi-Sig Wallet or Normal Wallet.</p>

                    <div className='my-5 w-[600px]'>
                        {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            publicKeyArr.map((item: any, index: number) => <div key={index} className='flex mb-3'>
                                <input type="text" placeholder="Tag" value={item.tag} onChange={(e) => changePK('tag', e.target.value, index)} className="input input-bordered w-[100px] mr-2" />
                                <input type="text" placeholder="Publick Key" disabled={index === 0} value={item.publicKey} onChange={(e) => changePK('publicKey', e.target.value, index)} className="input input-bordered flex-1" />
                                {
                                    index > 0 ? <button className="btn btn-circle ml-2" onClick={() => delPublicKey(index)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button> : <div className='w-[48px] h-[48px] ml-2'></div>
                                }
                            </div>)
                        }
                        <button className="btn btn-outline w-full text-[24px]" onClick={addPublicKey}>+</button>
                        <div className='my-10'>
                            <h3 className='font-bold mb-5'>Threshold</h3>
                            <div>
                                <input type='number' value={threshold} min={1} max={publicKeyArr.length} onChange={(e) => setThreshold(+e.target.value)} className='input input-bordered w-[80px] mr-3' />
                                <span>Out of {publicKeyArr.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className='flex mt-10'>
                        <button className='btn w-[150px] mr-5' onClick={() => setStep(step - 1)}>Back</button>
                        <button className='btn w-[150px] btn-primary' onClick={nextStep}>Confirm</button>
                    </div>
                </div> : <div>
                    <p className='font-bold mb-5'>Step 4: Success</p>
                    <p>To recover the wallet you MUST using the descriptor.</p>
                    <textarea className="textarea my-5 w-[600px] h-[150px]" value={descriptor} disabled></textarea>
                    <p>Copy and save the descriptor, then finish the creation.</p>
                    <div className='flex mt-10'>
                        <button className='btn w-[150px] mr-5' onClick={handleCreate}>Create</button>
                        <button className='btn w-[150px] btn-primary' onClick={copyToClipboard}>Copy</button>
                    </div>
                </div>
            }
        </div>
    )
}

export default CreateWallet
