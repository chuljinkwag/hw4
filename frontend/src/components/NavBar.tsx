import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.tsx'
import { Seal } from './Decor.tsx'

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link')

const TICKER = [
  'Officially licensed Yale merchandise',
  '57 Broadway, New Haven',
  'Open seven days a week',
  'Ask our assistant about any size or colour',
  'Screen printing & embroidery in store',
]

export default function NavBar() {
  const { user, ready, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Close the phone menu on navigation; state change keyed to the route, not an effect-set loop.
  const [menuPath, setMenuPath] = useState(pathname)
  if (menuPath !== pathname) {
    setMenuPath(pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const onLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className={scrolled ? 'site-header is-scrolled' : 'site-header'}>
      <div className="ticker" aria-label="Store information">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <ul key={copy} className="ticker-list" aria-hidden={copy === 1}>
              {TICKER.map((t) => <li key={t}>{t}</li>)}
            </ul>
          ))}
        </div>
      </div>
      <nav className="nav" aria-label="Main">
        <Link to="/" className="brand" aria-label="Campus Customs home">
          <Seal />
          <span className="brand-text">
            <span className="brand-name">Campus Customs</span>
            <span className="brand-sub">Yale Bulldog Blue · New Haven</span>
          </span>
        </Link>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="menu-toggle-bars" aria-hidden="true" />
          <span className="visually-hidden">Menu</span>
        </button>
        <div id="site-menu" className={menuOpen ? 'nav-menu open' : 'nav-menu'}>
          <ul className="nav-links">
            <li><NavLink to="/" end className={linkClass}>Home</NavLink></li>
            <li><NavLink to="/products" className={linkClass}>Products</NavLink></li>
            <li><NavLink to="/about" className={linkClass}>About Us</NavLink></li>
          </ul>
          <ul className="nav-account" aria-busy={!ready}>
            {user ? (
              <>
                <li className="nav-greeting">
                  <span className="avatar" aria-hidden="true">{user.first_name.charAt(0)}</span>
                  Hi, {user.first_name}
                </li>
                <li>
                  <button type="button" className="button button-small button-outline" onClick={onLogout}>Log out</button>
                </li>
              </>
            ) : (
              <>
                <li><NavLink to="/login" className={linkClass}>Log in</NavLink></li>
                <li><NavLink to="/create-account" className="button button-small">Create account</NavLink></li>
              </>
            )}
          </ul>
        </div>
      </nav>
    </header>
  )
}
