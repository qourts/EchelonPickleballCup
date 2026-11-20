import { useEffect, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { EVENT } from '../config/event.ts'
import { isSectionPublished } from '../domain/publication.ts'
import type { PortalSection } from '../config/publication.ts'
import { usePortal } from '../hooks/portalContext.ts'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import { BracketIcon, CalendarIcon, GuideIcon, HomeIcon, LiveIcon, TrophyIcon } from './icons.tsx'
import { RegisterButton } from './ui.tsx'

interface NavItem {
  readonly to: string
  readonly label: string
  readonly section: PortalSection
  readonly icon: ReactNode
  readonly end?: boolean
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Home', section: 'home', icon: <HomeIcon />, end: true },
  { to: '/guide', label: 'Guide', section: 'guide', icon: <GuideIcon /> },
  { to: '/schedule', label: 'Schedule', section: 'schedule', icon: <CalendarIcon /> },
  { to: '/brackets', label: 'Brackets', section: 'brackets', icon: <BracketIcon /> },
  { to: '/live', label: 'Live', section: 'live', icon: <LiveIcon /> },
  { to: '/standings', label: 'Results', section: 'standings', icon: <TrophyIcon /> },
]

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function Layout() {
  const { phase } = usePortal()
  const { pathname } = useLocation()
  const items = NAV_ITEMS.filter((item) => isSectionPublished(item.section, phase))
  const base = import.meta.env.BASE_URL

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label={`${EVENT.name} home`}>
            <img src={`${base}assets/logo-echelon-eagles.jpg`} alt="" width="44" height="44" className="brand-logo" />
            <span className="brand-text">
              <span className="brand-name">Echelon Pickleball Cup</span>
              <span className="brand-year">2026 · Player Portal</span>
            </span>
          </Link>
          <nav className="nav-desktop" aria-label="Main">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-cta">
            <RegisterButton />
          </div>
        </div>
      </header>

      <ScrollToTop />
      <main id="main" className="container main" tabIndex={-1}>
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-logos">
            <img src={`${base}assets/logo-echelon-eagles.jpg`} alt="Echelon Eagles Club logo" width="56" height="56" />
            <img src={`${base}assets/logo-tfoe.png`} alt="The Fraternal Order of Eagles, Philippine Eagles logo" width="56" height="56" />
          </div>
          <div>
            <p className="footer-title">{EVENT.name}</p>
            <p>
              {EVENT.dateLabel} · {EVENT.venue}, {EVENT.address}
            </p>
            <p>{EVENT.charityStatement}</p>
            <p className="footer-muted">
              Public, read-only portal. Registration and tournament administration are handled outside this website.
              Service technology provider: {EVENT.serviceProvider}.
            </p>
          </div>
        </div>
      </footer>

      <nav className="nav-mobile" aria-label="Main">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="nav-tab">
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
