import { useState } from "react"

// eslint-disable-next-line react-refresh/only-export-components
export default () => {
    const [step, setStep] = useState(1)
    const confirm = () => {
        setStep(2)
    }

    const [keyNumber, setKeyNumber] = useState(1)
    const UpdateKeyNumber = (e: any) => {
        setKeyNumber(e.target.value)
        setThreshold(1)
    }

    const [threshold, setThreshold] = useState(1)
    const UpdateThreshold = (e: any) => {
        setThreshold(e.target.value)
    }

    return (
        <div className="create-wallet">
            <div>
                {
                    step === 1 ? <section>
                        <div className="flex justify-between items-center mb-3">
                            <label className="w-[100px] block">Key Number</label>
                            <input type="range" min={1} max={10} value={keyNumber} onChange={UpdateKeyNumber} className="range range-xs mx-10 flex-1 range-info" />
                            <input type="number" placeholder="" value={keyNumber} className="input input-bordered w-[100px] input-md" />
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="w-[100px] block">Threshold</label>
                            <input type="range" min={1} max={keyNumber} value={threshold} onChange={UpdateThreshold} className="range range-xs mx-10 flex-1 range-info" />
                            <input type="number" placeholder="" value={threshold} className="input input-bordered w-[100px] input-md" />
                        </div>
                        <div className="">
                            <label className="w-[100px] block mb-3">Public Key</label>
                            <input type="text" placeholder="" className="input input-bordered w-full input-md mb-3" />
                            <input type="text" placeholder="" className="input input-bordered w-full input-md mb-3" />
                            <input type="text" placeholder="" className="input input-bordered w-full input-md mb-3" />
                            <input type="text" placeholder="" className="input input-bordered w-full input-md mb-3" />
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
