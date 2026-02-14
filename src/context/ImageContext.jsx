import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import apiHelper from '../helper/apiHelper'
import { formatImageUrl } from '../helper/formatHelper'

const ImageContext = createContext(null)

const DEFAULT_LOGO = '/SH.png'

export function ImageProvider({ children }) {
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFullUrl, setLogoFullUrl] = useState('')
  const [appName, setAppName] = useState('Stream Haven')
  const [tagLine, setTagLine] = useState('')
  const [imageLoading, setImageLoading] = useState(true)

  const fetchBranding = useCallback(async () => {
    try {
      const { data } = await apiHelper.get('/auth/branding')
      if (data?.success && data?.data) {
        const d = data.data
        setAppName(d.appName || 'Stream Haven')
        setLogoUrl(d.logoUrl ? (d.logoUrl.startsWith('/') ? formatImageUrl(d.logoUrl) : d.logoUrl) : '')
        setLogoFullUrl(d.logoFullUrl ? (d.logoFullUrl.startsWith('/') ? formatImageUrl(d.logoFullUrl) : d.logoFullUrl) : '')
        setTagLine(d.tagLine || '')
      }
    } catch {
      setLogoUrl('')
      setLogoFullUrl('')
      setAppName('Stream Haven')
      setTagLine('')
    } finally {
      setImageLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  // Keep the browser tab title in sync with the app name
  useEffect(() => {
    document.title = appName
  }, [appName])

  const logo = logoUrl || DEFAULT_LOGO
  const logoFull = logoFullUrl || logo

  const value = {
    logo,
    logoUrl,
    logoFull,
    logoFullUrl,
    appName,
    tagLine,
    imageLoading,
    refetchBranding: fetchBranding,
  }

  return <ImageContext.Provider value={value}>{children}</ImageContext.Provider>
}

export function useImage() {
  const ctx = useContext(ImageContext)
  if (!ctx) throw new Error('useImage must be used within ImageProvider')
  return ctx
}
