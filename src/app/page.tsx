'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { recordLogin } from '../lib/supabase/settingsService'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('session_expired') === 'true') {
        toast.error('Your session has expired. Please log in again.');
        window.history.replaceState({}, '', '/');
      }
    }
  }, []);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      setLoading(false)

      if (error) {
        setError(error.message)
      } else {
        await recordLogin()
        router.push('/dashboard')
      }
    } catch (err) {
      setLoading(false)
      toast.error('Network error. Please check your internet connection and try again.')
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage(null)
    setResetError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      setResetLoading(false)

      if (error) {
        setResetError(error.message)
      } else {
        setResetMessage('Password reset instructions have been sent to your email.')
      }
    } catch (err) {
      setResetLoading(false)
      toast.error('Network error. Please check your internet connection and try again.')
    }
  }

  const openForgotModal = () => {
    setResetEmail('')
    setResetMessage(null)
    setResetError(null)
    setShowForgotModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="text-blue-500 font-semibold text-sm">SmileServe</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome back, Admin!</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@gmail.com"
              required
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={openForgotModal}
              className="text-blue-500 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg mt-6"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 className="text-lg font-bold text-gray-800 mb-2">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter your email address and we&apos;ll send you instructions to reset your password.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {resetError && (
                <p className="text-red-500 text-sm">{resetError}</p>
              )}
              {resetMessage && (
                <p className="text-green-600 text-sm">{resetMessage}</p>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
              >
                {resetLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}