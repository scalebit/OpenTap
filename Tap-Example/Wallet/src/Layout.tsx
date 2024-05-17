import { Outlet, NavLink } from "react-router-dom"
import './layout.scss'

function Layout() {

  return (
    <div className='app px-10'>
      <header className='h-[70px] flex items-center justify-between'>
        <div>OpenTap Wallet</div>
        <button className="btn btn-primary">Connect</button>
      </header>
      <div className="flex mt-10 w-[1000px] m-auto h-[500px]">
        <nav className="menu bg-base-200 w-56 mr-[50px]">
          <li>
            <NavLink to="/">
              Create Wallet
            </NavLink>
          </li>
          <li>
            <NavLink to="/open-exsiting-wallet">
              Open Exsiting Wallet
            </NavLink>
          </li>
        </nav>
        <div className="router-content w-[750px]">
          <Outlet />
        </div>
      </div>

    </div>
  );
}

export default Layout;
