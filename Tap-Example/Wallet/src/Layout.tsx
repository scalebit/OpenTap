import { useEffect } from "react"
import { Outlet, NavLink } from "react-router-dom"
import { useStore } from "./store"
import './layout.scss'
import { IWallet } from "./config/interface"
import { Toaster } from "@/components/ui/toaster"

function Layout() {

  const {
    connected,
    address,
    network,
    localWallet,
    setUnisatInstalled,
    setConnected,
    setAccounts,
    setPublicKey,
    setAddress,
    setBalance,
    setNetwork
  } = useStore()

  const unisat = (window as any).unisat;

  const getBasicInfo = async () => {
    const unisat = (window as any).unisat;
    const [address] = await unisat.getAccounts();
    setAddress(address);

    const publicKey = await unisat.getPublicKey();
    setPublicKey(publicKey);

    const balance = await unisat.getBalance();
    setBalance(balance);

    const network = await unisat.getNetwork();
    setNetwork(network);
  };

  const handleAccountsChanged = (_accounts: string[]) => {
    if (address === _accounts[0]) {
      return;
    }
    if (_accounts.length > 0) {
      setAccounts(_accounts);
      setConnected(true);

      setAddress(_accounts[0]);

      getBasicInfo();
    } else {
      setConnected(false);
    }
  };

  const handleNetworkChanged = (network: string) => {
    setNetwork(network);
    getBasicInfo();
  };

  useEffect(() => {

    async function checkUnisat() {
      let unisat = (window as any).unisat;

      for (let i = 1; i < 10 && !unisat; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100 * i));
        unisat = (window as any).unisat;
      }

      if (unisat) {
        setUnisatInstalled(true);
      } else if (!unisat)
        return;

      unisat.getAccounts().then((accounts: string[]) => {
        handleAccountsChanged(accounts);
      });

      unisat.on("accountsChanged", handleAccountsChanged);
      unisat.on("networkChanged", handleNetworkChanged);

      return () => {
        unisat.removeListener("accountsChanged", handleAccountsChanged);
        unisat.removeListener("networkChanged", handleNetworkChanged);
      };
    }

    checkUnisat().then();
  }, []);

  return (
    <div className='app layout'>
      <header className='h-[70px] px-10 flex items-center justify-between'>
        <div>OpenTap Wallet</div>
        {
          connected ? <div className="flex items-center">
            <p className="mr-5">{network}</p>
            <div className="dropdown dropdown-bottom dropdown-end">
              <div tabIndex={0} role="button" className="btn m-1">{address.slice(0, 5)}...{address.slice(-5)}</div>
              {/* <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                <li><a>Disconnect</a></li>
              </ul> */}
            </div>
          </div> : <button className="btn btn-primary" onClick={async () => {
            const result = await unisat.requestAccounts();
            handleAccountsChanged(result);
          }}>Connect</button>
        }
      </header>
      <div className="flex content">
        <nav className="menu bg-base-200 w-56 py-5">
          {
            localWallet.map((item: IWallet) => <li key={item.address}>
              <NavLink to={`/wallet/${item.address}`} className="text-center block">
                {item.walletName}
              </NavLink>
            </li>)
          }

          <li>
            <NavLink to="/create-wallet" className="add-wallet-btn text-center block">
              +
            </NavLink>
          </li>
        </nav>
        <div className="router-content w-[750px]">
          <Outlet />
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default Layout;
