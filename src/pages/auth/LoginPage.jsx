import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import apiHelper, { baseURL } from '../../helper/apiHelper'
import { useAuth } from '../../context/AuthContext'
import { useImage } from '../../context/ImageContext'

const LoginPage = () => {
  const { logo } = useImage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetStep, setResetStep] = useState(null)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [resetCooldown, setResetCooldown] = useState(0)
  const { setEmail: setAuthEmail, verifyToken } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (resetCooldown <= 0) return
    const id = setInterval(() => setResetCooldown((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [resetCooldown])

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')
    if (error === 'google') {
      toast.error('Google sign-in failed. Please try again.')
      setSearchParams({}, { replace: true })
      return
    }
    if (error === 'registration_closed') {
      toast.error('Registration is closed. Contact admin.')
      setSearchParams({}, { replace: true })
      return
    }
    if (token) {
      localStorage.setItem('fc-token', token)
      setSearchParams({}, { replace: true })
      verifyToken().then(() => navigate('/home', { replace: true }))
    }
  }, [searchParams, setSearchParams, verifyToken, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Email and password are required')
      return
    }
    const t = toast.loading('Logging in...')
    try {
      const { data } = await apiHelper.post('/auth/login', { email, password })
      if (data?.data?.token) {
        localStorage.setItem('fc-token', data.data.token)
      }
      if (data?.data?.email) {
        setAuthEmail(data.data.email)
      }
      toast.success(data.message || 'Login successful', { id: t })
      setEmail('')
      setPassword('')
      navigate('/home')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed'
      toast.error(msg, { id: t })
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Email is required')
      return
    }
    const t = toast.loading('Sending reset code...')
    try {
      await apiHelper.post('/auth/forgot-password', { email })
      toast.success('If an account exists with this email, you will receive a reset code shortly.', { id: t })
      setResetCooldown(120) // 2 minutes
      setResetStep('reset')
      setOtp('')
      setNewPassword('')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send reset code'
      toast.error(msg, { id: t })
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    if (!email || !otp || !newPassword) {
      toast.error('Email, reset code and new password are required')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    const t = toast.loading('Resetting password...')
    try {
      await apiHelper.post('/auth/reset-password', { email, otp, newPassword })
      toast.success('Password reset successfully. You can now log in.', { id: t })
      setResetStep(null)
      setOtp('')
      setNewPassword('')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to reset password'
      toast.error(msg, { id: t })
    }
  }

  if (resetStep === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl w-full max-w-sm">
          <div className="flex justify-between">
            <h1 className="text-xl font-semibold mb-4 text-gray-100">Reset password</h1>
            <img src={logo} alt="Logo" className="w-20" />
          </div>
          <p className="text-sm text-gray-400 mb-4">Enter your email and we&apos;ll send you a code to reset your password.</p>
          <form onSubmit={handleForgotSubmit}>
            <div className="mb-4">
              <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Email"
              />
            </div>
            <button
              type="submit"
              disabled={resetCooldown > 0}
              className="w-full bg-amber-500 text-gray-900 py-2 rounded font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetCooldown > 0
                ? `Resend in ${Math.floor(resetCooldown / 60)}:${String(resetCooldown % 60).padStart(2, '0')}`
                : 'Send reset code'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-400">
            <button type="button" onClick={() => setResetStep(null)} className="text-amber-400 hover:underline font-medium">
              Back to login
            </button>
          </p>
        </div>
      </div>
    )
  }

  if (resetStep === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl w-full max-w-sm">
          <div className="flex justify-between">
            <h1 className="text-xl font-semibold mb-4 text-gray-100">Set new password</h1>
            <img src={logo} alt="Logo" className="w-20" />
          </div>
          <p className="text-sm text-gray-400 mb-4">Enter the code we sent to <span className="text-gray-300">{email}</span> and your new password.</p>
          <form onSubmit={handleResetSubmit}>
            <div className="mb-4">
              <label htmlFor="reset-otp" className="block text-sm font-medium text-gray-300 mb-1">Reset code</label>
              <input
                id="reset-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-lg tracking-widest"
                placeholder="000000"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-300 mb-1">New password</label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-200 rounded"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" aria-hidden />
                  ) : (
                    <Eye className="w-5 h-5" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-amber-500 text-gray-900 py-2 rounded font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Set new password
            </button>
            <button
              type="button"
              onClick={handleForgotSubmit}
              disabled={resetCooldown > 0}
              className="w-full mt-3 py-2 rounded border border-gray-600 text-gray-300 text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetCooldown > 0
                ? `Resend code in ${Math.floor(resetCooldown / 60)}:${String(resetCooldown % 60).padStart(2, '0')}`
                : 'Resend code'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-400">
            <button type="button" onClick={() => setResetStep(null)} className="text-amber-400 hover:underline font-medium">
              Back to login
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl w-full max-w-sm">
        <div className='flex justify-between'>

        <h1 className="text-xl font-semibold mb-4 text-gray-100">Login</h1>
        <img src={logo} alt="Logo" className="w-20" />
        </div>

        <form onSubmit={handleSubmit}>
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

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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
                  <EyeOff className="w-5 h-5" aria-hidden />
                ) : (
                  <Eye className="w-5 h-5" aria-hidden />
                )}
              </button>
            </div>
          </div>

          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setResetStep('forgot')}
              className="text-sm text-amber-400 hover:underline font-medium"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 text-gray-900 py-2 rounded font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            Login
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
            Continue with Google
          </a>
        </form>

        <p className="mt-4 text-center text-sm text-gray-400">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-amber-400 hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
