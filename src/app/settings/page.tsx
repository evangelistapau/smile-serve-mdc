'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Pencil, Check, X, History, Mail, Database } from 'lucide-react'
import {
    getAccountInfo,
    updateDisplayName,
    getLoginHistory,
    getBrevoEmailLimit,
    getDbSize,
    AccountInfo,
    LoginHistoryEntry,
    BrevoEmailLimit,
    DbSizeInfo,
} from '@/lib/supabase/settingsService'

// ═════════════════════════════════════════════════════════════
//  Settings Page
// ═════════════════════════════════════════════════════════════

export default function SettingsPage() {
    const router = useRouter()
    const [account, setAccount] = useState<AccountInfo | null>(null)
    const [loadingAccount, setLoadingAccount] = useState(true)
    const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])
    const [loadingHistory, setLoadingHistory] = useState(true)
    const [brevo, setBrevo] = useState<BrevoEmailLimit | null>(null)
    const [loadingBrevo, setLoadingBrevo] = useState(true)
    const [dbSize, setDbSize] = useState<DbSizeInfo | null>(null)
    const [loadingDbSize, setLoadingDbSize] = useState(true)

    // Edit state
    const [editing, setEditing] = useState(false)
    const [editName, setEditName] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        getAccountInfo().then((info) => {
            setAccount(info)
            setLoadingAccount(false)
        })
        getLoginHistory().then((entries) => {
            setLoginHistory(entries)
            setLoadingHistory(false)
        })
        getBrevoEmailLimit().then((limit) => {
            setBrevo(limit)
            setLoadingBrevo(false)
        })
        getDbSize().then((size) => {
            setDbSize(size)
            setLoadingDbSize(false)
        })
    }, [])

    const handleEditStart = () => {
        setEditName(account?.displayName || '')
        setEditing(true)
    }

    const handleEditCancel = () => {
        setEditing(false)
        setEditName('')
    }

    const handleEditSave = async () => {
        if (!editName.trim()) return
        setSaving(true)
        const success = await updateDisplayName(editName.trim())
        if (success && account) {
            setAccount({ ...account, displayName: editName.trim() })
        }
        setSaving(false)
        setEditing(false)
    }

    const displayName = account?.displayName
    const needsSetup = !displayName

    return (
        <div className="w-full space-y-6">
            {/* ═══ Account Information ═══ */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100">
                    <User className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-bold text-gray-900">Account Information</h3>
                </div>

                <div className="px-6 py-6">
                    {loadingAccount ? (
                        <div className="flex items-center gap-3 py-4">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-400">Loading account info…</span>
                        </div>
                    ) : account ? (
                        <>
                            {/* Setup prompt for new users */}
                            {needsSetup && !editing && (
                                <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                                    <p className="text-sm text-amber-700">
                                        <span className="font-semibold">Welcome!</span> Set up your display name to get started.
                                    </p>
                                    <button
                                        onClick={handleEditStart}
                                        className="text-sm font-medium text-amber-700 hover:text-amber-800 underline"
                                    >
                                        Set up now
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-6">
                                {/* Display Name */}
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Display Name</p>
                                    {editing ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                placeholder="Enter your name"
                                                autoFocus
                                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                                            />
                                            <button
                                                onClick={handleEditSave}
                                                disabled={saving || !editName.trim()}
                                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition disabled:opacity-40"
                                                title="Save"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={handleEditCancel}
                                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition"
                                                title="Cancel"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <p className="text-base font-semibold text-gray-900">
                                                {displayName || <span className="text-gray-300 italic font-normal">Not set</span>}
                                            </p>
                                            <button
                                                onClick={handleEditStart}
                                                className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition"
                                                title="Edit name"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Email */}
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Email</p>
                                    <p className="text-base font-semibold text-gray-900">{account.email}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => router.push('/reset-password')}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                            >
                                <Lock className="w-4 h-4" />
                                Reset Password
                            </button>
                        </>
                    ) : (
                        <p className="text-sm text-gray-400">Unable to load account information.</p>
                    )}
                </div>
            </div>

            {/* ═══ Email Sending Limit (Brevo) ═══ */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100">
                    <Mail className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-bold text-gray-900">Email Sending Limit</h3>
                    <span className="ml-auto text-xs text-gray-400">via Brevo</span>
                </div>

                <div className="px-6 py-6">
                    {loadingBrevo ? (
                        <div className="flex items-center gap-3 py-4">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-400">Loading sending limit…</span>
                        </div>
                    ) : brevo ? (
                        <div className="flex flex-wrap items-center gap-8">
                            {/* Credits */}
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Send Limit</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {brevo.credits === null ? '∞' : brevo.credits.toLocaleString()}
                                    <span className="text-sm font-normal text-gray-400 ml-1">emails / day</span>
                                </p>
                            </div>

                            {/* Plan badge */}
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Plan</p>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize border
                                    ${brevo.planType === 'free'
                                        ? 'bg-gray-50 text-gray-600 border-gray-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                    {brevo.planType}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Unable to load Brevo account info.</p>
                    )}
                </div>
            </div>

            {/* ═══ Database Size (Supabase) ═══ */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100">
                    <Database className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-bold text-gray-900">Database Size</h3>
                    <span className="ml-auto text-xs text-gray-400">via Supabase</span>
                </div>

                <div className="px-6 py-6">
                    {loadingDbSize ? (
                        <div className="flex items-center gap-3 py-4">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-400">Loading database size…</span>
                        </div>
                    ) : dbSize ? (
                        <div className="flex flex-wrap items-end gap-8">
                            {/* Human-readable size */}
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Current Size</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {dbSize.pretty}
                                </p>
                            </div>

                            {/* Free tier indicator — Supabase free tier is 500 MB */}
                            <div className="mb-0.5 flex-1 min-w-48">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Free tier usage</span>
                                    <span>{((dbSize.bytes / (500 * 1024 * 1024)) * 100).toFixed(1)}% of 500 MB</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div
                                        className={`h-1.5 rounded-full transition-all ${dbSize.bytes / (500 * 1024 * 1024) > 0.8
                                            ? 'bg-red-500'
                                            : dbSize.bytes / (500 * 1024 * 1024) > 0.6
                                                ? 'bg-amber-400'
                                                : 'bg-green-500'
                                            }`}
                                        style={{ width: `${Math.min((dbSize.bytes / (500 * 1024 * 1024)) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Unable to load database size.</p>
                    )}
                </div>
            </div>

            {/* ═══ Login History ═══ */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100">
                    <History className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-bold text-gray-900">Login History</h3>
                </div>

                <div className="px-6 py-6">
                    {loadingHistory ? (
                        <div className="flex items-center gap-3 py-4">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-400">Loading login history…</span>
                        </div>
                    ) : loginHistory.length === 0 ? (
                        <p className="text-sm text-gray-400 py-4">No login history found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Date & Time</th>
                                        <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Device</th>
                                        <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">IP Address</th>
                                        <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loginHistory.map((entry) => (
                                        <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                                            <td className="py-3 px-2 text-gray-700">
                                                {new Date(entry.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}{' '}
                                                <span className="text-gray-400">
                                                    {new Date(entry.createdAt).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 text-gray-700">{entry.device}</td>
                                            <td className="py-3 px-2 text-gray-500 font-mono text-xs">{entry.ipAddress}</td>
                                            <td className="py-3 px-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                    {entry.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
