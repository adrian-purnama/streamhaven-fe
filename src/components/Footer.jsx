import { Link } from 'react-router-dom'
import { useImage } from '../context/ImageContext'

const NAV_LINKS = [
  { to: '/home', label: 'Home' },
  { to: '/discover', label: 'Discover' },
  { to: '/movie', label: 'Movies' },
  { to: '/tv', label: 'TV Shows' },
  { to: '/search', label: 'Search' },
]

export default function Footer() {
  const { appName, logo } = useImage()
  const year = new Date().getFullYear()

  return (
    <footer className="relative mt-auto overflow-hidden">
      {/* Gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-24 bg-amber-500/5 blur-3xl pointer-events-none" />

      <div className="relative bg-gradient-to-b from-gray-800/90 to-gray-900">
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-8">
          {/* Top row: logo + nav */}
          <div className="flex flex-col items-center gap-8">
            {/* Logo */}
            <Link
              to="/home"
              className="group flex items-center gap-3 transition-transform duration-300 hover:scale-105"
              aria-label="Home"
            >
              {logo ? (
                <img
                  src={logo}
                  alt={appName}
                  className="max-h-20 drop-shadow-lg brightness-90 group-hover:brightness-110 transition-all duration-300"
                />
              ) : (
                <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                  {appName}
                </span>
              )}
            </Link>

            {/* Nav links */}
            <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="relative px-4 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white transition-all duration-300 hover:bg-white/5 group"
                >
                  <span className="relative z-10">{label}</span>
                  <span className="absolute inset-x-0 -bottom-px mx-auto w-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-300 group-hover:w-3/4" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Divider */}
          <div className="mt-8 mb-6 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />

          {/* Legal links */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-4">
            <Link
              to="/terms"
              className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              to="/privacy"
              className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>

          {/* Bottom row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-xs">
              © {year} {appName}. All rights reserved.
            </p>
            <p className="text-gray-600 text-xs flex items-center gap-1.5">
              Made with <span className="text-red-400 animate-pulse text-sm">&#9829;</span> by the {appName} Creator
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
