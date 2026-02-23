import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useImage } from '../context/ImageContext'
import MultiSearch from './MultiSearch'

function Navbar() {
  const { isLoggedIn, email, authLoading, profileUrl, logout } = useAuth()
  const { logo } = useImage()
  const [mobileOpen, setMobileOpen] = useState(false)



  if (authLoading) {
    return (
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <span className="text-gray-400 text-sm">Loading...</span>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
        {/* Logo */}
        <Link
          to={isLoggedIn ? '/home' : '/'}
          className="shrink-0 font-semibold text-gray-100"
          aria-label="Home"
        >
          <img src={logo} alt="Logo" className="max-h-9 md:max-h-10" />
        </Link>

        {/* Search bar */}
        <div className="flex-1 min-w-0 max-w-[30rem]">
          <MultiSearch />
        </div>

        {/* Desktop links + profile, mobile menu button */}
        <div className="shrink-0 flex items-center gap-2">
          {/* Desktop links — visible from lg (1024px) up; collapsed menu on tablet */}
          <div className="hidden lg:flex items-center gap-1">
            <NavLink
              to="/home"
              end
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-gray-300 hover:text-amber-400 hover:bg-gray-700/50'}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/discover"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-gray-300 hover:text-amber-400 hover:bg-gray-700/50'}`
              }
            >
              Discover
            </NavLink>
            <NavLink
              to="/movie"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-gray-300 hover:text-amber-400 hover:bg-gray-700/50'}`
              }
            >
              Movies
            </NavLink>
            <NavLink
              to="/tv"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-gray-300 hover:text-amber-400 hover:bg-gray-700/50'}`
              }
            >
              Tv
            </NavLink>
            <NavLink
              to="/save"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-gray-300 hover:text-amber-400 hover:bg-gray-700/50'}`
              }
            >
              My list
            </NavLink>
          </div>

          {/* Desktop profile circle + logout */}
          <div className="hidden lg:flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-600 text-gray-100 font-semibold text-sm hover:bg-amber-500 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                  aria-label="Profile"
                  title={email}
                >
                  {profileUrl ? (
                    <img src={profileUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl font-medium">
                      {(email && email[0]) ? email[0].toUpperCase() : '?'}
                    </div>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-amber-400 hover:bg-gray-700/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" aria-hidden />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-gray-400 hover:text-amber-400 text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-gray-400 hover:text-amber-400 text-sm font-medium"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Hamburger / profile button — visible below lg (tablet + mobile) */}
          <button
            type="button"
            className="lg:hidden cursor-pointer inline-flex items-center rounded-full justify-center w-9 h-9 text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-800"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {profileUrl ? (
              <img src={profileUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-700 rounded-full text-3xl font-medium">
                {(email && email[0]) ? email[0].toUpperCase() : '?'}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Collapsed menu drawer — visible below lg (tablet + mobile) */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${
          mobileOpen ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0'
        } ${mobileOpen ? 'mt-3' : ''}`}
      >
        <div className="rounded-md bg-gray-900">
          <div className="max-w-5xl mx-auto py-3 px-1 space-y-2">
            <div className="flex flex-col gap-1">
              <NavLink
                to="/home"
                end
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-gray-200 hover:bg-gray-700/70 hover:text-amber-400'}`
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/discover"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-gray-200 hover:bg-gray-700/70 hover:text-amber-400'}`
                }
              >
                Discover
              </NavLink>
              <NavLink
                to="/movie"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-gray-200 hover:bg-gray-700/70 hover:text-amber-400'}`
                }
              >
                Movies
              </NavLink>
              <NavLink
                to="/tv"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-gray-200 hover:bg-gray-700/70 hover:text-amber-400'}`
                }
              >
                TV
              </NavLink>
              <NavLink
                to="/save"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-gray-200 hover:bg-gray-700/70 hover:text-amber-400'}`
                }
              >
                My list
              </NavLink>
            </div>

            <div className="pt-2 border-t border-gray-800 mt-2">
              {isLoggedIn ? (
                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-700/70 transition-colors">
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-gray-600 text-gray-100 font-semibold text-sm">
                      {profileUrl ? (
                        <img src={profileUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl font-medium">
                          {(email && email[0]) ? email[0].toUpperCase() : '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-gray-100">Profile</span>
                      <span className="text-xs text-gray-400 truncate max-w-48">
                        {email}
                      </span>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setMobileOpen(false); logout() }}
                    className="shrink-0 p-2 rounded-lg text-gray-300 hover:bg-gray-600/70 hover:text-amber-400 transition-colors"
                    aria-label="Logout"
                  >
                    <LogOut className="w-5 h-5" aria-hidden />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 px-1 pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-200 text-center border border-gray-700 hover:border-amber-400 hover:text-amber-400 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-900 text-center bg-amber-500 hover:bg-amber-400 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
