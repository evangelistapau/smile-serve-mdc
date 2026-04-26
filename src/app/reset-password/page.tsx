'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function ResetPassword() {
    const router = useRouter()
    const [currentPassword, setCurrentPassword] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sessionReady, setSessionReady] = useState(false)
    const [isRecoveryFlow, setIsRecoveryFlow] = useState(false)

    useEffect(() => {
        let redirectTimer: NodeJS.Timeout

        if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
            setIsRecoveryFlow(true)
        }

        // Supabase automatically picks up the recovery token from the URL hash
        // and establishes a session. We listen for that event.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event) => {
                if (event === 'PASSWORD_RECOVERY') {
                    clearTimeout(redirectTimer)
                    setIsRecoveryFlow(true)
                    setSessionReady(true)
                }
            }
        )

        // Also check if a session already exists (e.g. page was refreshed)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                clearTimeout(redirectTimer)
                setSessionReady(true)
            }
        })

        // If no recovery session is established within 5 seconds, redirect to login
        redirectTimer = setTimeout(() => {
            router.push('/')
        }, 5000)

        return () => {
            clearTimeout(redirectTimer)
            subscription.unsubscribe()
        }
    }, [router])

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Verify current password when coming from Settings (not email recovery)
        if (!isRecoveryFlow) {
            if (!currentPassword) {
                setError('Please enter your current password.')
                return
            }

            // Get current user email to verify credentials
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.email) {
                setError('Unable to verify identity. Please try again.')
                return
            }

            setLoading(true)
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            })

            if (signInError) {
                setLoading(false)
                setError('Current password is incorrect.')
                return
            }
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({ password })

            setLoading(false)

            if (error) {
                setError(error.message)
            } else {
                toast.success('Password changed successfully. Please log in again for security.')
                await supabase.auth.signOut({ scope: 'global' })
                router.push('/')
                return
            }
        } catch (err) {
            setLoading(false)
            toast.error('Network error. Please check your internet connection and try again.')
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                        <span className="text-blue-500 font-semibold text-sm">SmileServe</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Set New Password</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        {isRecoveryFlow ? 'Enter your new password below.' : 'Verify your current password, then set a new one.'}
                    </p>
                </div>

                {!sessionReady ? (
                    <p className="text-sm text-gray-500 text-center">
                        Verifying your reset link…
                    </p>
                ) : (
                    <form onSubmit={handleReset} className="space-y-4">
                        {/* Current Password — only shown when navigating from Settings */}
                        {!isRecoveryFlow && (
                            <div>
                                <label className="block text-sm text-gray-600 mb-2">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    >
                                        {showCurrentPassword ? (
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
                        )}

                        <div>
                            <label className="block text-sm text-gray-600 mb-2">New Password</label>
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

                        <div>
                            <label className="block text-sm text-gray-600 mb-2">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    {showConfirmPassword ? (
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

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg mt-2"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
