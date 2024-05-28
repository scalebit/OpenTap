import { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom"
import { asm_builder, taproot_address_wallet } from 'opentap-v0.03/src/taproot/taproot_script_builder'
import { useStore } from '../store/index'
import { PublicKey } from '../config/interface'
import { invert_json_p2tr } from 'opentap-v0.03/src/taproot/utils'
// import { downloadJSON } from '../config/index'

const CreateWallet = () => {
    const navigate = useNavigate()

    const { network, publicKey } = useStore()

    const [isImport, setIsImport] = useState(false)

    const [step, setStep] = useState(1)

    const [walletName, setWalletName] = useState('')

    const [publicKeyArr, setPublicKeyArr] = useState<PublicKey[]>([{
        tag: '',
        publicKey: ''
    },
    {
        tag: '',
        publicKey: ''
    }])

    const [threshold, setThreshold] = useState(1)

    const [descriptor, setDescriptor] = useState('')

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

    const nextStep = (isImport_?: boolean) => {
        if (step === 1) {
            setIsImport(isImport_ || false)
        }

        if (isImport) {
            if (step === 2) {
                if (!descriptor) {
                    alert('Please enter descriptor!')
                    return
                }
                handleImport()
            } else if (step === 3) {
                if (!walletName) {
                    alert('Please enter wallet name!')
                    return
                }
            }
        } else {
            if (step === 2) {
                if (!walletName) {
                    alert('Please enter wallet name!')
                    return
                }
            } else if (step === 3) {
                const flag = publicKeyArr.every(item => item.tag && item.publicKey && item.publicKey.length === 66)
                if (!flag || threshold < 1 || threshold > publicKeyArr.length) {
                    alert('Data format error!')
                    return
                }
                handleCreate()
            }
        }
        if (step <= 3) {
            setStep(step + 1)
        }
    }

    const handleCreate = () => {
        if (isImport) {
            if (step === 4) {
                const flag = publicKeyArr.every(item => item.tag)
                if (!flag) {
                    return
                }
            }
        }
        //创建对应的地址和解锁脚本
        const pks: string[] = publicKeyArr.map(item => item.publicKey)
        const script = asm_builder(pks, threshold)

        const { p2tr, redeem } = taproot_address_wallet(script, pks, walletName, threshold)

        setDescriptor(p2tr.address || '')

        // 生成JSON并保存在LocalStroge中，并标记为（wallet + 编号 + 之前命名的名称）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let localWallet: any = localStorage.getItem('localWallet')
        if (localWallet) {
            localWallet = JSON.parse(localWallet)
            localStorage.setItem(`localWallet`, JSON.stringify({
                ...localWallet,
                [walletName]: {
                    p2tr,
                    redeem,
                    publicKeyArr,
                    threshold
                }
            }))
        } else {
            localStorage.setItem(`localWallet`, JSON.stringify({
                [walletName]: {
                    p2tr,
                    redeem,
                    publicKeyArr,
                    threshold
                }
            }))
        }
    }

    // 通过descriptor导入
    const handleImport = () => {
        const { p2pktr, stringArray } = invert_json_p2tr(descriptor)
        const import_threshold = p2pktr.m!
        console.log(p2pktr)
        console.log(stringArray)
        console.log(import_threshold)
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(descriptor).then(() => {
            alert('Successfully copied to clipboard!')
        }).catch((err) => {
            alert('Copy error!')
            console.error("Copy error: ", err);
        });
    }

    const Step2DOM = isImport ? <div>
        <p className='font-bold mb-5'>Step 2: Import</p>
        <p>Please input the descriptor in the box.</p>
        <textarea className="textarea input-bordered my-5 w-[600px] h-[150px]" value={descriptor} onChange={(e) => setDescriptor(e.target.value)}></textarea>
        <p>Only Support OpenTap Wallet.</p>
        <div className='flex mt-10'>
            <button className='btn w-[150px] mr-5' onClick={() => setStep(step - 1)}>Back</button>
            <button className='btn w-[150px] btn-primary' onClick={() => nextStep()}>Confirm</button>
        </div>
    </div> : <div>
        <p className='font-bold mb-5'>Step 2: Information</p>
        <p>Choose the Name and Network of your new wallet.</p>
        <label className="input input-bordered flex items-center gap-2 w-[400px] my-6">
            <input type="text" className="grow" placeholder="" value={walletName} onChange={(e) => setWalletName(e.target.value)} />
            <span className="badge badge-info">{network}</span>
        </label>
        <p>Please <span className='font-bold'>Confirm</span> your setting.</p>
        <div className='flex mt-10'>
            <button className='btn w-[150px] mr-5' onClick={() => setStep(step - 1)}>Back</button>
            <button className='btn w-[150px] btn-primary' onClick={() => nextStep()}>Confirm</button>
        </div>
    </div>

    const Step3DOM = isImport ? <div>
        <p className='font-bold mb-5'>Step 3: Information</p>
        <p>Choose the Name of your new wallet.</p>
        <label className="input input-bordered flex items-center gap-2 w-[400px] my-6">
            <input type="text" className="grow" placeholder="" value={walletName} onChange={(e) => setWalletName(e.target.value)} />
            <span className="badge badge-info">{network}</span>
        </label>
        <p>Please <span className='font-bold'>Confirm</span> your setting.</p>
        <div className='flex mt-10'>
            <button className='btn w-[150px] mr-5' onClick={() => setStep(step - 1)}>Back</button>
            <button className='btn w-[150px] btn-primary' onClick={() => nextStep()}>Confirm</button>
        </div>
    </div> : <div>
        <p className='font-bold mb-5'>Step 3: Multi-Sig</p>
        <p>Create Threshold Multi-Sig Wallet or Normal Wallet.</p>

        <div className='my-5 w-[600px]'>
            {
                publicKeyArr.map((item: PublicKey, index: number) => <div key={index} className='flex mb-3'>
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
            <button className='btn w-[150px] btn-primary' onClick={() => nextStep()}>Create</button>
        </div>
    </div>

    const Step4DOM = isImport ? <div>
        <p className='font-bold mb-5'>Step 4: Tag</p>
        <p>Create Threshold Multi-Sig Wallet or Normal Wallet.</p>

        <div className='my-5 w-[600px]'>
            {
                publicKeyArr.map((item: PublicKey, index: number) => <div key={index} className='flex mb-3'>
                    <input type="text" placeholder="Tag" value={item.tag} onChange={(e) => changePK('tag', e.target.value, index)} className="input input-bordered w-[100px] mr-2" />
                    <input type="text" placeholder="Publick Key" disabled value={item.publicKey} onChange={(e) => changePK('publicKey', e.target.value, index)} className="input input-bordered flex-1" />
                </div>)
            }
            <div className='my-10'>
                <h3 className='font-bold mb-5'>Threshold</h3>
                <div>
                    <input type='number' value={threshold} disabled min={1} max={publicKeyArr.length} onChange={(e) => setThreshold(+e.target.value)} className='input input-bordered w-[80px] mr-3' />
                    <span>Out of {publicKeyArr.length}</span>
                </div>
            </div>
        </div>

        <div className='flex mt-10'>
            <button className='btn w-[150px] mr-5' onClick={() => setStep(step - 1)}>Back</button>
            <button className='btn w-[150px] btn-primary' onClick={() => nextStep()}>create</button>
        </div>
    </div> : <div>
        <p className='font-bold mb-5'>Step 4: Success</p>
        <p>To recover the wallet you MUST using the descriptor.</p>
        <textarea className="textarea my-5 w-[600px] h-[150px]" value={descriptor} disabled></textarea>
        <p>Copy and save the descriptor, then finish the creation.</p>
        <div className='flex mt-10'>
            <button className='btn w-[150px] mr-5' onClick={() => navigate('/')}>Go Home</button>
            <button className='btn w-[150px] btn-primary' onClick={copyToClipboard}>Copy</button>
        </div>
    </div>

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
                        <button className='btn w-[150px] btn-primary mr-5' onClick={() => nextStep(false)}>Next</button>
                        <button className='btn w-[150px] btn-neutral' onClick={() => nextStep(true)}>Import</button>
                    </div>
                </div> : step === 2 ? Step2DOM : step === 3 ? Step3DOM : Step4DOM
            }
        </div>
    )
}

export default CreateWallet
