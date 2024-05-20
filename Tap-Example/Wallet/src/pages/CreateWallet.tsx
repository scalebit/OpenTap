import { useState } from "react"

// eslint-disable-next-line react-refresh/only-export-components
export default () => {
    const [step, setStep] = useState(1)
    const confirm = () => {
        setStep(2)
    }

    const [keyNumber, setKeyNumber] = useState<number>(1)
    const UpdateKeyNumber = (e: any) => {
        if (e.target.value >= 1) {
            setKeyNumber(e.target.value)
            setThreshold(1)

            const newValues = Array(+e.target.value).fill('').map((_, i) => publicKeyArr[i] || '');
            setPublicKeyArr(newValues);
        }
    }

    const [threshold, setThreshold] = useState<number>(1)
    const UpdateThreshold = (e: any) => {
        if (e.target.value >= 1) {
            setThreshold(e.target.value)
        }
    }

    const [publicKeyArr, setPublicKeyArr] = useState<string[]>(Array(keyNumber).fill(''));

    const UpdatePublicKeyArr = (index: number, value: string) => {
        const newValues = [...publicKeyArr]
        newValues[index] = value
        setPublicKeyArr(newValues)
    }

    return (
        <div className="create-wallet">
            <div>
                {
                    step === 1 ? <section>
                        <div className="flex justify-between items-center mb-3">
                            <label className="w-[100px] block">Key Number</label>
                            <input type="range" min={1} max={9} value={keyNumber} onChange={UpdateKeyNumber} className="range range-xs mx-10 flex-1 range-info" />
                            <input type="number" min={1} max={9} placeholder="" value={keyNumber} onChange={UpdateKeyNumber} className="input input-bordered w-[100px] input-md" />
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="w-[100px] block">Threshold</label>
                            <input type="range" min={1} max={keyNumber} value={threshold} onChange={UpdateThreshold} className="range range-xs mx-10 flex-1 range-info" />
                            <input type="number" min={1} max={keyNumber} placeholder="" value={threshold} onChange={UpdateThreshold} className="input input-bordered w-[100px] input-md" />
                        </div>
                        <div className="">
                            <label className="w-[100px] block mb-3">Public Key</label>
                            <div className="h-[240px] overflow-y-auto pr-1">
                                {
                                    Array.from({ length: keyNumber }, (_, index) => (
                                        <input type="text" key={index} value={publicKeyArr[index] || ''} placeholder="" onChange={(e) => UpdatePublicKeyArr(index, e.target.value)} className="input input-bordered w-full input-md mt-3" />
                                    ))
                                }
                            </div>
                        </div>
                        <button className="btn btn-primary btn-wide mt-10 mx-auto block" onClick={confirm}>Confirm</button>
                    </section> : <section className="recipet">
                        <p className="text-center mb-6">This is your new wallet Please remember the recipet</p>
                        <div>
                            <p className="title">Private Key</p>
                            <div className="inline-block m-auto badge_">styklkjhgfsdflkj2345678iokjbfr678ikde567ikjgfrtiknbfr567uik</div>
                        </div>
                        <div>
                            <p className="title">Passphrase</p>
                            <p className="flex flex-wrap">
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                                <span className="badge_">about</span>
                            </p>
                        </div>
                        <div>
                            <p className="title">Descriptor</p>
                            <p className="inline-block m-auto badge_">styklkjhgfsdflkj2345678iokjbfr678ikde567ikjgfrtiknbfr567uik</p>
                        </div>
                        <div className="mt-10 flex justify-center">
                            <button className="btn mt-10 block mr-10">Return</button>
                            <button className="btn mt-10 block">Login</button>
                        </div>
                    </section>
                }

            </div>

        </div>
    )
}
