import { createBrowserRouter } from 'react-router-dom'
import Layout from '../Layout'
import CreateWallet from '../pages/CreateWallet'
import OpenExsitingWallet from '../pages/OpenExsitingWallet'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <CreateWallet />
      },
      {
        path: '/open-exsiting-wallet',
        element: <OpenExsitingWallet />
      },
    ]
  }
])
