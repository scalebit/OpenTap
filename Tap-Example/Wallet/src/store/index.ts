import { create } from 'zustand'
import { IBalance, IWallet } from '../config/interface'


type State = {
  unisatInstalled: boolean
  connected: boolean
  accounts: string[]
  publicKey: string
  address: string
  balance: IBalance
  network: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  localWallet: any[]
}

type Actions = {
  setUnisatInstalled: (payload: boolean) => void
  setConnected: (payload: boolean) => void
  setAccounts: (payload: string[]) => void
  setPublicKey: (payload: string) => void
  setAddress: (payload: string) => void
  setBalance: (payload: IBalance) => void
  setNetwork: (payload: string) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setLocalWallet: (payload: IWallet[]) => void
}

const localWallet: IWallet[] = []
const localWalletStr: string = localStorage.getItem('localWallet') || ''
if (localWalletStr) {
  for (const key in JSON.parse(localWalletStr)) {
    const obj_: any = JSON.parse(localWalletStr)[key]
    localWallet.push({
      walletName: key,
      address: obj_.p2tr.address
    })
  }
}
export const useStore: any = create<State & Actions>(set => ({
  unisatInstalled: false,
  connected: false,
  accounts: [],
  publicKey: '',
  address: '',
  balance: {
    confirmed: 0,
    unconfirmed: 0,
    total: 0,
  },
  network: 'livenet',
  localWallet,

  setUnisatInstalled: async (payload: boolean) => {
    set(() => ({ unisatInstalled: payload }))
  },
  setConnected: async (payload: boolean) => {
    set(() => ({ connected: payload }))
  },
  setAccounts: async (payload: string[]) => {
    set(() => ({ accounts: payload }))
  },
  setPublicKey: async (payload: string) => {
    set(() => ({ publicKey: payload }))
  },
  setAddress: async (payload: string) => {
    set(() => ({ address: payload }))
  },
  setBalance: async (payload: IBalance) => {
    set(() => ({ balance: payload }))
  },
  setNetwork: async (payload: string) => {
    set(() => ({ network: payload }))
  },
  setLocalWallet: async (payload: IWallet[]) => {
    set(() => ({ localWallet: payload }))
  }
}))
