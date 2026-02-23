import { createContext, useContext, useState, useEffect } from 'react'
import apiHelper, { baseURL } from '../helper/apiHelper'

const AuthContext = createContext(null)

// Placeholder when user has no profile image (gray circle with person icon)
const PLACEHOLDER_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236b7280'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E"

export function AuthProvider({ children }) {
  const [email, setEmail] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState(null)
  const [profileUrl, setProfileUrl] = useState(PLACEHOLDER_AVATAR)
  const [authLoading, setAuthLoading] = useState(true)

  const verifyToken = async () => {
    const token = localStorage.getItem('fc-token')
    if (!token) {
      setEmail(null)
      setIsAdmin(false)
      setUserId(null)
      setProfileUrl(PLACEHOLDER_AVATAR)
      setAuthLoading(false)
      return
    }
    try {
      const { data } = await apiHelper.get('/auth/verify-token')
      if (data?.success && data?.data?.email) {
        setEmail(data.data.email)
        setIsAdmin(data.data.isAdmin)
        setUserId(data.data.id)
        const url = data.data.profile_url && data.data.profile_url.trim()
        const resolvedUrl = url
          ? (url.includes('googleusercontent') ? url : baseURL + url)
          : PLACEHOLDER_AVATAR
        setProfileUrl(resolvedUrl)
      } else {
        localStorage.removeItem('fc-token')
        setEmail(null)
        setIsAdmin(false)
        setUserId(null)
        setProfileUrl(PLACEHOLDER_AVATAR)
      }
    } catch {
      localStorage.removeItem('fc-token')
      setEmail(null)
      setIsAdmin(false)
      setUserId(null)
      setProfileUrl(PLACEHOLDER_AVATAR)
    } finally {
      setAuthLoading(false)
    }
  }

  useEffect(() => {
    verifyToken()
  }, [])

  const logout = () => {
    localStorage.removeItem('fc-token')
    setEmail(null)
    setIsAdmin(false)
    setUserId(null)
    setProfileUrl(PLACEHOLDER_AVATAR)
  }

  const value = {
    email,
    isAdmin,
    userId,
    profileUrl,
    setEmail,
    setProfileUrl,
    authLoading,
    verifyToken,
    logout,
    isLoggedIn: !!email,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
