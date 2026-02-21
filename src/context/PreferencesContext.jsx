import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import apiHelper from '../helper/apiHelper'

const STORAGE_KEY = 'streamhaven_display_preferences'

export const DEFAULT_PREFERENCES = {
  saveButtonPosition: 'bottom_center',
  showWatchButton: true,
  showTopPickOnHome: true,
  showPosterTitle: false,
  showPromoTicker: true,
  showAdFreeStatus: true,
}

const PreferencesContext = createContext(null)

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(raw)
    return {
      saveButtonPosition: ['bottom_center', 'top_right', 'hidden'].includes(parsed.saveButtonPosition)
        ? parsed.saveButtonPosition
        : DEFAULT_PREFERENCES.saveButtonPosition,
      showWatchButton: typeof parsed.showWatchButton === 'boolean' ? parsed.showWatchButton : DEFAULT_PREFERENCES.showWatchButton,
      showTopPickOnHome: typeof parsed.showTopPickOnHome === 'boolean' ? parsed.showTopPickOnHome : DEFAULT_PREFERENCES.showTopPickOnHome,
      showPosterTitle: typeof parsed.showPosterTitle === 'boolean' ? parsed.showPosterTitle : DEFAULT_PREFERENCES.showPosterTitle,
      showPromoTicker: typeof parsed.showPromoTicker === 'boolean' ? parsed.showPromoTicker : DEFAULT_PREFERENCES.showPromoTicker,
      showAdFreeStatus: typeof parsed.showAdFreeStatus === 'boolean' ? parsed.showAdFreeStatus : DEFAULT_PREFERENCES.showAdFreeStatus,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

function saveToStorage(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

export function PreferencesProvider({ children }) {
  const { isLoggedIn } = useAuth()
  const [preferences, setPreferencesState] = useState(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)

  const setPreferences = useCallback((next) => {
    setPreferencesState(next)
    if (!isLoggedIn) saveToStorage(next)
  }, [isLoggedIn])

  useEffect(() => {
    if (isLoggedIn) {
      setLoading(true)
      apiHelper
        .get('/api/users/me/preferences')
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            setPreferencesState({ ...DEFAULT_PREFERENCES, ...res.data.data })
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setPreferencesState(loadFromStorage())
      setLoading(false)
    }
  }, [isLoggedIn])

  const updatePreferences = useCallback(async (partial) => {
    const next = { ...preferences, ...partial }
    setPreferencesState(next)
    if (!isLoggedIn) {
      saveToStorage(next)
      return
    }
    try {
      await apiHelper.patch('/api/users/me/preferences', next)
    } catch {
      setPreferencesState(preferences)
    }
  }, [isLoggedIn, preferences])

  const updatePreference = useCallback(async (key, value) => {
    await updatePreferences({ [key]: value })
  }, [updatePreferences])


  const value = {
    preferences,
    setPreferences,
    updatePreferences,
    updatePreference,
    preferencesLoading: loading,
  }

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
