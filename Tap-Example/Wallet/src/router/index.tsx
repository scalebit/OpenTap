import { createBrowserRouter } from 'react-router-dom'
import Layout from '../Layout'
import CreateWallet from '../pages/CreateWallet'
import WalletDetail from '../pages/walletDetail'
import NoWallet from '../pages/NoWallet'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <NoWallet />
      },
      {
        path: '/create-wallet',
        element: <CreateWallet />
      },
      {
        path: '/wallet/:address',
        element: <WalletDetail />
      },
    ]
  }
])
