import { create } from 'zustand'

interface IBalance {
  confirmed: number,
  unconfirmed: number
  total: number
}

type State = {
  unisatInstalled: boolean
  connected: boolean
  accounts: string[]
  publicKey: string
  address: string
  balance: IBalance
  network: string
}

type Actions = {
  setUnisatInstalled: (payload: boolean) => void
  setConnected: (payload: boolean) => void
  setAccounts: (payload: string[]) => void
  setPublicKey: (payload: string) => void
  setAddress: (payload: string) => void
  setBalance: (payload: IBalance) => void
  setNetwork: (payload: string) => void
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
}))
