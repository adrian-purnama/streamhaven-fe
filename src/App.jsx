import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ImageProvider } from './context/ImageContext'
import { PreferencesProvider } from './context/PreferencesContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import RegisterPage from './pages/auth/RegisterPage'
import LoginPage from './pages/auth/LoginPage'
import AdminPage from './pages/auth/admin/AdminPage'
import SystemPage from './pages/auth/admin/SystemPage'
import UserPage from './pages/auth/admin/UserPage'
import GenrePage from './pages/auth/admin/GenrePage'
import MovieSyncPage from './pages/auth/admin/MovieSyncPage'
import TvSyncPage from './pages/auth/admin/TvSyncPage'
import ServerPage from './pages/auth/admin/ServerPage'
import SupportersPage from './pages/auth/admin/SupportersPage'
import FeedbackPage from './pages/auth/admin/FeedbackPage'
import WatchNowPage from './pages/WatchNowPage'
import ProfilePage from './pages/ProfilePage'
import SearchPage from './pages/SearchPage'
import DiscoverPage from './pages/DiscoverPage'
import MoviePage from './pages/MoviePage'
import TvPage from './pages/TvPage'
import PersonPage from './pages/PersonPage'
import SavePage from './pages/SavePage'
import TermsPage from './pages/legal/TermsPage'
import PrivacyPage from './pages/legal/PrivacyPage'
import NotFoundPage from './pages/NotFoundPage'

function AdminFab() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return null
  return (
    <Link
      to="/admin"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-amber-500 text-gray-900 font-medium shadow-lg hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-900"
      aria-label="Admin"
    >
      ⚙
    </Link>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [pathname])

  return null
}

function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ className: '!bg-gray-800 !text-gray-100 !border-gray-700' }} />
      <AuthProvider>
        <PreferencesProvider>
          <ImageProvider>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path='/home' element={<HomePage />} />
                <Route path='/profile' element={<ProfilePage />} />
                <Route path='/save' element={<SavePage />} />
                <Route path='/search' element={<SearchPage />} />
                <Route path='/discover' element={<DiscoverPage />} />
                <Route path='/movie' element={<MoviePage />} />
                <Route path='/movie/:category' element={<MoviePage />} />
                <Route path='/tv' element={<TvPage />} />
                <Route path='/tv/:category' element={<TvPage />} />
                <Route path='/person/:id' element={<PersonPage />} />
                <Route path='/watch/:mediaType/:id/:ss?/:eps?' element={<WatchNowPage />} />
                <Route path='/register' element={<RegisterPage />} />
                <Route path='/login' element={<LoginPage />} />
                <Route path='/terms' element={<TermsPage />} />
                <Route path='/privacy' element={<PrivacyPage />} />
                <Route path='/admin' element={<AdminPage />} />
                <Route path='/admin/system' element={<SystemPage />} />
                <Route path='/admin/users' element={<UserPage />} />
                <Route path='/admin/genres' element={<GenrePage />} />
                <Route path='/admin/movies' element={<MovieSyncPage />} />
                <Route path='/admin/tv' element={<TvSyncPage />} />
                <Route path='/admin/servers' element={<ServerPage />} />
                <Route path='/admin/supporters' element={<SupportersPage />} />
                <Route path='/admin/feedback' element={<FeedbackPage />} />
                <Route path='*' element={<NotFoundPage />} />
              </Routes>
            </div>
            <Footer />
          </div>
          <AdminFab />
          </ImageProvider>
        </PreferencesProvider>
      </AuthProvider>
    </>
  )
}

export default App
