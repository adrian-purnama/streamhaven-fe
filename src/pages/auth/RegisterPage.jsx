import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import apiHelper, { baseURL } from '../../helper/apiHelper'
import { useImage } from '../../context/ImageContext'
import { useAuth } from '../../context/AuthContext'
import {
  getGuestSaved,
  migrateGuestSavedToAccount,
  migrateGuestSavedToAccountCustom,
  clearGuestSaved,
} from '../../helper/savedHelper'

const RegisterPage = () => {
  const { logo } = useImage()
  const { verifyToken } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [registrationOpen, setRegistrationOpen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('form') // 'form' | 'import'
  const [importChoice, setImportChoice] = useState(null) // null | 'all' | 'none' | 'custom'
  const [customSelectedFolders, setCustomSelectedFolders] = useState(() => new Set())
  const [customSelectedItems, setCustomSelectedItems] = useState(() => ({})) // { [folderId]: Set<itemId> }
  const [importing, setImporting] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)

  const guestData = getGuestSaved()
  const hasGuestSaved = (guestData.folders || []).length > 0

  useEffect(() => {
    if (otpCooldown <= 0) return
    const id = setInterval(() => setOtpCooldown((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [otpCooldown])

  useEffect(() => {
    const checkRegistration = async () => {
      const t = toast.loading('Checking registration...')
      try {
        const { data } = await apiHelper.get('/auth/check-registration')
        setRegistrationOpen(data.success === true)
      } catch {
        setRegistrationOpen(false)
      } finally {
        setLoading(false)
        toast.dismiss(t)
      }
    }
    checkRegistration()
  }, [])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Email is required')
      return
    }
    const t = toast.loading('Sending OTP...')
    try {
      const { data } = await apiHelper.post('/auth/send-otp', { email })
      toast.success(data.message || 'OTP sent', { id: t })
      setOtpCooldown(120) // 2 minutes
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP'
      toast.error(msg, { id: t })
    }
  }

  const loginAfterRegister = async (userEmail, userPassword) => {
    const { data } = await apiHelper.post('/auth/login', { email: userEmail, password: userPassword })
    if (data?.data?.token) {
      localStorage.setItem('fc-token', data.data.token)
    }
    await verifyToken()
  }

  const finishImportAndGoHome = async () => {
    await verifyToken()
    setStep('form')
    navigate('/home')
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!agreeToTerms) {
      toast.error('Please agree to the Terms and Conditions and Privacy Policy')
      return
    }
    if (!email || !password || !otp) {
      toast.error('Email, password and OTP are required')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Password and confirm password do not match')
      return
    }
    const t = toast.loading('Registering...')
    try {
      await apiHelper.post('/auth/register', { email, password, otp })
      toast.success('Registered successfully', { id: t })
      setOtp('')
      await loginAfterRegister(email, password)
      if (hasGuestSaved) {
        setStep('import')
      } else {
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        navigate('/home')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed'
      toast.error(msg, { id: t })
    }
  }

  const handleImportAll = async () => {
    setImporting(true)
    try {
      const { migrated, foldersCreated } = await migrateGuestSavedToAccount(apiHelper)
      toast.success(`Imported ${foldersCreated} folder(s) and ${migrated} item(s)`)
      await finishImportAndGoHome()
    } catch (err) {
      toast.error(err?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleDontImport = async () => {
    clearGuestSaved()
    toast.success('Account ready. Your local lists were not imported.')
    await finishImportAndGoHome()
  }

  const toggleCustomFolder = (folderId) => {
    setCustomSelectedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const toggleCustomItem = (folderId, itemId) => {
    setCustomSelectedItems((prev) => {
      const set = new Set(prev[folderId] || [])
      if (set.has(itemId)) {
        set.delete(itemId)
      } else {
        set.add(itemId)
      }
      const next = { ...prev }
      if (set.size) next[folderId] = set
      else delete next[folderId]
      return next
    })
  }

  const selectAllInFolder = (folder) => {
    const itemIds = (folder.saved || []).map((s) => s.id)
    setCustomSelectedFolders((prev) => new Set(prev).add(folder.id))
    setCustomSelectedItems((prev) => ({ ...prev, [folder.id]: new Set(itemIds) }))
  }

  const handleCustomImport = async () => {
    const folderIds = Array.from(customSelectedFolders)
    const itemsByFolder = {}
    folderIds.forEach((fid) => {
      const s = customSelectedItems[fid]
      itemsByFolder[fid] = s && s.size ? Array.from(s) : []
    })
    const totalItems = Object.values(itemsByFolder).reduce((sum, arr) => sum + arr.length, 0)
    if (folderIds.length === 0) {
      toast.error('Select at least one folder')
      return
    }
    if (totalItems === 0) {
      toast.error('Select at least one item to import')
      return
    }
    setImporting(true)
    try {
      const { migrated, foldersCreated } = await migrateGuestSavedToAccountCustom(apiHelper, {
        folderIds,
        itemsByFolder,
      })
      toast.success(`Imported ${foldersCreated} folder(s) and ${migrated} item(s)`)
      await finishImportAndGoHome()
    } catch (err) {
      toast.error(err?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!registrationOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
          <p className="text-red-400 font-medium">Registration is disabled. Contact admin.</p>
        </div>
      </div>
    )
  }

  if (step === 'import') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl w-full max-w-lg">
          <h2 className="text-xl font-semibold text-gray-100 mb-2">Import your saved lists?</h2>
          <p className="text-gray-400 text-sm mb-6">
            You have {guestData.folders.length} folder(s) with saved items. Choose how to import them to your new account.
          </p>

          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={handleImportAll}
              disabled={importing}
              className="w-full py-3 px-4 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-400 font-medium hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            >
              Import all — bring all folders and movies into my account
            </button>
            <button
              type="button"
              onClick={handleDontImport}
              disabled={importing}
              className="w-full py-3 px-4 rounded-lg border border-gray-600 bg-gray-700/50 text-gray-200 font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Don&apos;t import — start with an empty list
            </button>
            <div>
              <button
                type="button"
                onClick={() => setImportChoice(importChoice === 'custom' ? null : 'custom')}
                className="w-full py-3 px-4 rounded-lg border border-gray-600 bg-gray-700/50 text-gray-200 font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-left flex items-center justify-between"
              >
                <span>Custom — choose which folders and items to import</span>
                <span className="text-gray-500">{importChoice === 'custom' ? '▼' : '▶'}</span>
              </button>

              {importChoice === 'custom' && (
                <div className="mt-3 p-4 rounded-lg bg-gray-900/80 border border-gray-700 max-h-64 overflow-y-auto space-y-3">
                  {guestData.folders.map((folder) => (
                    <div key={folder.id} className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customSelectedFolders.has(folder.id)}
                          onChange={() => toggleCustomFolder(folder.id)}
                          className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="font-medium text-gray-200">{folder.name}</span>
                        <span className="text-gray-500 text-sm">({(folder.saved || []).length} items)</span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); selectAllInFolder(folder) }}
                          className="text-xs text-amber-400 hover:underline ml-auto"
                        >
                          Select all
                        </button>
                      </label>
                      <div className="pl-6 space-y-1">
                        {(folder.saved || []).map((item) => (
                          <label key={item.id} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={(customSelectedItems[folder.id] || new Set()).has(item.id)}
                              onChange={() => toggleCustomItem(folder.id, item.id)}
                              className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-gray-300 truncate">{item.title || 'Untitled'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleCustomImport}
                    disabled={importing || customSelectedFolders.size === 0}
                    className="w-full mt-3 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                  >
                    {importing ? 'Importing…' : 'Import selected'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl w-full max-w-sm">
        <div className="flex justify-between">
          <h1 className="text-xl font-semibold mb-4 text-gray-100">Register</h1>
          <img src={logo} alt="Logo" className="w-20" />
        </div>

        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Email"
            />
          </div>

          <div className="mb-4 flex gap-2">
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="OTP"
            />
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpCooldown > 0}
              className="px-4 py-2 rounded bg-gray-600 text-gray-200 font-medium hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {otpCooldown > 0
                ? `${Math.floor(otpCooldown / 60)}:${String(otpCooldown % 60).padStart(2, '0')}`
                : 'Send OTP'}
            </button>
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Confirm password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 mb-4 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              className="mt-1 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-400 group-hover:text-gray-300">
              I agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                Terms and Conditions
              </Link>
              {' '}and{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={!agreeToTerms}
            className="w-full bg-amber-500 text-gray-900 py-2 rounded font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Register
          </button>

          <div className="relative my-4">
            <span className="block text-center text-xs text-gray-500">or</span>
          </div>

          <a
            href={`${baseURL}/auth/google`}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-gray-600 bg-gray-700/50 text-gray-200 font-medium hover:bg-gray-700 hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </a>
        </form>

        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-400 hover:underline font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
