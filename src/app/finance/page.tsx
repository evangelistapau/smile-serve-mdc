'use client'

import { useEffect, useState, useMemo } from 'react'
import { getFinanceData, FinanceData, EarningsSummary } from '@/lib/supabase/financeService'
import { PatientHistory } from '@/types/patient_history'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
    TrendingUp,
    Banknote,
    Smartphone,
    CalendarDays,
    CalendarRange,
    Calendar,
    RefreshCw,
    CircleDollarSign,
    ChevronDown,
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function periodLabel(period: 'daily' | 'weekly' | 'monthly' | 'allTime') {
    return {
        daily: 'Today',
        weekly: 'This Week',
        monthly: 'This Month',
        allTime: 'All Time',
    }[period]
}

/** Format a "YYYY-MM" key into a human-readable label, e.g. "September 2025" */
function monthLabel(ym: string) {
    const [y, m] = ym.split('-')
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-PH', { month: 'long', year: 'numeric' })
}

// ─── EarningsCard ─────────────────────────────────────────────────────────────

interface EarningsCardProps {
    period: 'daily' | 'weekly' | 'monthly' | 'allTime'
    summary: EarningsSummary
    icon: React.ReactNode
    accent: string
    borderColor: string
}

function EarningsCard({ period, summary, icon, accent, borderColor }: EarningsCardProps) {
    return (
        <div className={`relative bg-white rounded-2xl shadow-sm border ${borderColor} overflow-hidden`}>
            <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />
            <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                            {periodLabel(period)}
                        </p>
                        <p className="text-3xl font-extrabold text-gray-900">{fmt(summary.total)}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow`}>
                        {icon}
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                        <span className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                            <Banknote className="w-4 h-4 text-emerald-500" />
                            Cash
                        </span>
                        <span className="text-sm font-bold text-gray-800">{fmt(summary.cash)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                        <span className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                            <Smartphone className="w-4 h-4 text-blue-500" />
                            GCash
                        </span>
                        <span className="text-sm font-bold text-gray-800">{fmt(summary.gcash)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── MajorTotalBanner ─────────────────────────────────────────────────────────

function MajorTotalBanner({ allTime }: { allTime: EarningsSummary }) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 text-white shadow-lg p-8">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
            <div className="absolute -bottom-14 -right-4 w-64 h-64 rounded-full bg-white/5" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-widest text-blue-100 mb-1">
                        Clinic Total Revenue (All-Time)
                    </p>
                    <p className="text-5xl font-black tracking-tight">{fmt(allTime.total)}</p>
                    <p className="text-blue-200 text-sm mt-2">Based on all paid transactions</p>
                </div>
                <div className="flex flex-col gap-3 min-w-[200px]">
                    <div className="flex items-center justify-between bg-white/15 backdrop-blur rounded-xl px-4 py-3">
                        <span className="flex items-center gap-2 text-sm font-medium text-white">
                            Total Cash:
                        </span>
                        <span className="text-sm font-bold">{fmt(allTime.cash)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/15 backdrop-blur rounded-xl px-4 py-3">
                        <span className="flex items-center gap-2 text-sm font-medium text-white">
                            Total GCash:
                        </span>
                        <span className="text-sm font-bold">{fmt(allTime.gcash)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── PreviousMonthLookup ──────────────────────────────────────────────────────

interface PreviousMonthLookupProps {
    allRecords: PatientHistory[]
}

function computeSummaryFromRecords(records: PatientHistory[]): EarningsSummary {
    const cash = records
        .filter(r => r.payment_method === 'Cash')
        .reduce((sum, r) => sum + (r.amount ?? 0), 0)
    const gcash = records
        .filter(r => r.payment_method === 'GCash')
        .reduce((sum, r) => sum + (r.amount ?? 0), 0)
    return { cash, gcash, total: cash + gcash }
}

function PreviousMonthLookup({ allRecords }: PreviousMonthLookupProps) {
    // Build sorted list of distinct "YYYY-MM" months that appear in records
    // Exclude the current month so this panel is purely for previous months
    const currentYM = (() => {
        const n = new Date()
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
    })()

    const availableMonths = useMemo(() => {
        const set = new Set<string>()
        allRecords.forEach(r => {
            if (r.date) {
                const ym = r.date.substring(0, 7) // "YYYY-MM"
                if (ym < currentYM) set.add(ym)   // only previous months
            }
        })
        return Array.from(set).sort().reverse() // newest first
    }, [allRecords, currentYM])

    const [selectedMonth, setSelectedMonth] = useState<string>('')

    // Compute summary for selected month
    const selectedSummary = useMemo<EarningsSummary | null>(() => {
        if (!selectedMonth) return null
        const filtered = allRecords.filter(r => r.date?.startsWith(selectedMonth))
        return computeSummaryFromRecords(filtered)
    }, [selectedMonth, allRecords])

    // Transactions for the selected month
    const selectedRecords = useMemo(() => {
        if (!selectedMonth) return []
        return allRecords.filter(r => r.date?.startsWith(selectedMonth))
    }, [selectedMonth, allRecords])

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-violet-500" />
                    Previous Month Earnings
                </h3>

                {/* Month picker */}
                {availableMonths.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">No previous month data available.</span>
                ) : (
                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 transition cursor-pointer"
                        >
                            <option value="">— Select a month —</option>
                            {availableMonths.map(ym => (
                                <option key={ym} value={ym}>{monthLabel(ym)}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                )}
            </div>

            {/* Body */}
            {!selectedMonth ? (
                <div className="py-14 text-center">
                    <CalendarRange className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Select a previous month to view its earnings.</p>
                </div>
            ) : selectedSummary && (
                <div className="p-6">
                    {/* Summary cards for the month */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Total */}
                        <div className="col-span-1 sm:col-span-1 bg-gradient-to-br from-violet-500 to-violet-700 text-white rounded-2xl p-5 flex flex-col justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-2">
                                Total — {monthLabel(selectedMonth)}
                            </p>
                            <p className="text-3xl font-extrabold">{fmt(selectedSummary.total)}</p>
                            <p className="text-violet-200 text-xs mt-2">{selectedRecords.length} paid transaction{selectedRecords.length !== 1 ? 's' : ''}</p>
                        </div>

                        {/* Cash */}
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex flex-col justify-between">
                            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-2">
                                <Banknote className="w-4 h-4" /> Cash
                            </span>
                            <p className="text-2xl font-extrabold text-emerald-700">{fmt(selectedSummary.cash)}</p>
                            <p className="text-emerald-400 text-xs mt-1">
                                {selectedRecords.filter(r => r.payment_method === 'Cash').length} transaction{selectedRecords.filter(r => r.payment_method === 'Cash').length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        {/* GCash */}
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex flex-col justify-between">
                            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-600 mb-2">
                                <Smartphone className="w-4 h-4" /> GCash
                            </span>
                            <p className="text-2xl font-extrabold text-blue-700">{fmt(selectedSummary.gcash)}</p>
                            <p className="text-blue-400 text-xs mt-1">
                                {selectedRecords.filter(r => r.payment_method === 'GCash').length} transaction{selectedRecords.filter(r => r.payment_method === 'GCash').length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── RecentTransactions ───────────────────────────────────────────────────────

function RecentTransactions({ records }: { records: PatientHistory[] }) {
    const recent = records.slice(0, 15)

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Recent Paid Transactions
                </h3>
                <span className="text-xs text-gray-400">{records.length} total record{records.length !== 1 ? 's' : ''}</span>
            </div>

            {recent.length === 0 ? (
                <div className="py-16 text-center">
                    <CircleDollarSign className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No paid transactions yet.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-50">
                    {recent.map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition">
                            <div className="flex-1 min-w-0 pr-4">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                    {r.service || 'Dental Service'}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{r.date || '—'}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${r.payment_method === 'GCash'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        }`}
                                >
                                    {r.payment_method === 'GCash'
                                        ? <Smartphone className="w-3 h-3" />
                                        : <Banknote className="w-3 h-3" />}
                                    {r.payment_method || 'N/A'}
                                </span>
                                <span className="text-sm font-bold text-gray-900 min-w-[90px] text-right">
                                    {r.amount != null ? fmt(r.amount) : '—'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── FinancePage ──────────────────────────────────────────────────────────────

export default function FinancePage() {
    const [financeData, setFinanceData] = useState<FinanceData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    const load = async () => {
        setLoading(true)
        const { data, error } = await getFinanceData()
        if (error) setError(error)
        else setFinanceData(data)
        setLoading(false)
    }

    const refresh = async () => {
        setRefreshing(true)
        const { data, error } = await getFinanceData()
        if (error) setError(error)
        else setFinanceData(data)
        setRefreshing(false)
    }

    useEffect(() => {
        load()
    }, [])

    if (loading) return <LoadingSpinner fullPage message="Loading financial data…" />

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900">Finance</h1>
                    <p className="text-sm text-gray-500 mt-1">Clinic earnings based on paid patient transactions</p>
                </div>
                <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm disabled:opacity-60"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex justify-between items-center">
                    <span>❌ {error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
            )}

            {financeData && (
                <>
                    {/* Major Total Banner */}
                    <MajorTotalBanner allTime={financeData.allTime} />

                    {/* Period Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        <EarningsCard
                            period="daily"
                            summary={financeData.daily}
                            icon={<CalendarDays className="w-6 h-6" />}
                            accent="from-teal-400 to-teal-600"
                            borderColor="border-teal-100"
                        />
                        <EarningsCard
                            period="weekly"
                            summary={financeData.weekly}
                            icon={<CalendarRange className="w-6 h-6" />}
                            accent="from-violet-400 to-violet-600"
                            borderColor="border-violet-100"
                        />
                        <EarningsCard
                            period="monthly"
                            summary={financeData.monthly}
                            icon={<Calendar className="w-6 h-6" />}
                            accent="from-orange-400 to-orange-500"
                            borderColor="border-orange-100"
                        />
                    </div>

                    {/* Previous Month Lookup */}
                    <PreviousMonthLookup allRecords={financeData.records} />

                    {/* Recent Transactions */}
                    <RecentTransactions records={financeData.records} />
                </>
            )}
        </div>
    )
}
