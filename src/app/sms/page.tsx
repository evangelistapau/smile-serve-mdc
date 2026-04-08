'use client'

import { useState, useEffect, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Bell, RefreshCw } from "lucide-react"
import { getSmsSettings, saveSmsSettings, getSmsLogs, SmsLog } from "@/lib/supabase/smsService"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

type FilterStatus = "all" | "sent" | "pending" | "failed"

export default function SmsSettingsPage() {
    const [smsSettings, setSmsSettings] = useState({
        senderNumber: "",
        confirmedBookingMessage: "",
        reminderMessage: "",
    })
    const originalSettings = useRef(smsSettings)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [logs, setLogs] = useState<SmsLog[]>([])
    const [logsLoading, setLogsLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")

    // ─── Load settings & logs on mount ─────────────────────────
    const fetchLogs = useCallback(async () => {
        setLogsLoading(true)
        try {
            const data = await getSmsLogs(100)
            setLogs(data)
        } catch (err) {
            // Silently fail for refresh/realtime — initial load error handled below
        }
        setLogsLoading(false)
    }, [])

    useEffect(() => {
        async function loadAll() {
            const [settingsRes, logsRes] = await Promise.allSettled([
                getSmsSettings(),
                getSmsLogs(100),
            ])

            if (settingsRes.status === 'fulfilled') {
                setSmsSettings(settingsRes.value)
                originalSettings.current = settingsRes.value
            }
            setLoading(false)

            if (logsRes.status === 'fulfilled') setLogs(logsRes.value)
            setLogsLoading(false)

            const hasFailure = [settingsRes, logsRes].some(r => r.status === 'rejected')
            if (hasFailure) {
                toast.error('Network error. Some SMS data could not be loaded.')
            }
        }
        loadAll()
    }, [])

    // ─── Realtime subscription on sms_logs ───────────────────
    useEffect(() => {
        const channel = supabase
            .channel('sms_logs_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sms_logs' },
                () => { fetchLogs() }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [fetchLogs])

    // ─── Filtered logs ────────────────────────────────────────
    const filteredLogs = filterStatus === "all"
        ? logs
        : logs.filter((m) => m.status === filterStatus)

    const countFor = (s: FilterStatus) =>
        s === "all" ? logs.length : logs.filter((m) => m.status === s).length

    // ─── Save settings ────────────────────────────────────────
    const handleSmsChange = (field: string, value: string) => {
        setSmsSettings((prev) => ({ ...prev, [field]: value }))
    }

    const hasChanges =
        smsSettings.senderNumber !== originalSettings.current.senderNumber ||
        smsSettings.confirmedBookingMessage !== originalSettings.current.confirmedBookingMessage ||
        smsSettings.reminderMessage !== originalSettings.current.reminderMessage

    const handleSave = async () => {
        setSaving(true)
        try {
            const success = await saveSmsSettings(smsSettings)
            setSaving(false)
            if (success) {
                originalSettings.current = { ...smsSettings }
                toast.success("SMS settings saved successfully")
            } else {
                toast.error("Failed to save SMS settings")
            }
        } catch (err) {
            setSaving(false)
            toast.error('Network error. Could not save SMS settings.')
        }
    }

    // ─── Status badge ─────────────────────────────────────────
    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            sent: "bg-green-50 text-green-700 border-green-200",
            pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
            failed: "bg-red-50 text-red-700 border-red-200",
        }
        return (
            <span className={`px-2 py-0.5 border rounded-full text-[9px] md:text-xs font-semibold ${styles[status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        )
    }

    if (loading) {
        return <LoadingSpinner fullPage message="Loading SMS settings…" />
    }

    return (
        <div className="space-y-6">
            {/* SMS Configuration Card */}
            <div className="bg-white border border-blue-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-2.5 px-6 py-5 border-b border-blue-100/60">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">SMS Configuration</h3>
                </div>

                <div className="px-6 py-6 space-y-6">
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] md:text-sm font-semibold text-gray-700 mb-1.5">Sender Phone Number</label>
                                <input
                                    type="tel"
                                    value={smsSettings.senderNumber}
                                    onChange={(e) => handleSmsChange("senderNumber", e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-[10px] md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                                    placeholder="+639123456789"
                                />
                                <p className="text-[10px] md:text-xs text-blue-500 mt-1.5 font-medium">Include country code (e.g., +63 for PH)</p>
                            </div>
                        </div>
                    </div>

                    {/* SMS Message Templates */}
                    <div className="border-t border-blue-50 pt-6">
                        <h4 className="text-[10px] md:text-sm font-semibold text-gray-900 mb-2">Message Templates</h4>
                        <p className="text-[9px] md:text-xs text-gray-500 mb-4">
                            Available variables: <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">{"{patient_name}"}</code> <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">{"{appointment_date}"}</code> <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{"{appointment_time}"}</code>
                        </p>

                        <div className="mb-5">
                            <label className="block text-[10px] md:text-xs font-semibold text-gray-700 mb-1.5">Booking Confirmation Message</label>
                            <textarea
                                value={smsSettings.confirmedBookingMessage}
                                onChange={(e) => handleSmsChange("confirmedBookingMessage", e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-[10px] md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] md:text-xs font-semibold text-gray-700 mb-1.5">Reminder Message <span className="text-gray-400 font-normal ml-0.5">(2 hours before)</span></label>
                            <textarea
                                value={smsSettings.reminderMessage}
                                onChange={(e) => handleSmsChange("reminderMessage", e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-[10px] md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="border-t border-blue-50 pt-6">
                        <Button onClick={handleSave} disabled={saving || !hasChanges} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 text-[10px] md:text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? "Saving..." : "Save SMS Settings"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* SMS Messages History */}
            <div className="bg-white border border-blue-100 rounded-xl shadow-sm">
                <div className="flex items-center justify-between px-6 py-5 border-b border-blue-100/60">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Bell className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Message History</h3>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-1.5 rounded-md hover:bg-blue-50 hover:text-blue-600 transition text-gray-400"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 md:w-4.5 md:h-4.5 ${logsLoading ? 'animate-spin text-blue-500' : ''}`} />
                    </button>
                </div>

                <div className="px-5 md:px-6 py-5 border-b border-blue-50/50">
                    {/* Filter Tabs */}
                    <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                        {(["all", "sent", "pending", "failed"] as FilterStatus[]).map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm rounded-lg font-semibold transition whitespace-nowrap border ${filterStatus === s
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"}`}
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1)} <span className="opacity-80 ml-0.5 font-medium">({countFor(s)})</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-5 md:px-6 py-4">
                    {/* Messages List */}
                    {logsLoading ? (
                        <LoadingSpinner message="Loading messages..." />
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                                <Bell className="w-5 h-5 text-blue-300" />
                            </div>
                            <p className="text-[10px] md:text-sm text-gray-400 max-w-sm mx-auto">
                                {logs.length === 0
                                    ? "No SMS messages sent yet. Messages will appear here after booking confirmations are sent."
                                    : "No messages match this filter."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                            {filteredLogs.map((msg) => (
                                <div key={msg.id} className="border border-blue-50 rounded-xl p-4 bg-white hover:bg-blue-50/40 transition shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                                        <div>
                                            <h3 className="text-xs md:text-sm font-bold text-gray-900">
                                                {msg.patient_name ?? "Unknown patient"}
                                            </h3>
                                            <p className="text-[10px] md:text-xs font-semibold text-gray-500 mt-0.5">{msg.patient_phone}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {statusBadge(msg.status)}
                                            <span className="text-[9px] md:text-xs font-semibold text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                                                {new Date(msg.sent_at).toLocaleString('en-PH', {
                                                    month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    {msg.content && (
                                        <p className="text-[10px] md:text-xs text-gray-700 mb-3 bg-gray-50 border border-gray-100 p-3 rounded-lg leading-relaxed shadow-sm font-medium">{msg.content}</p>
                                    )}
                                    <span className="inline-flex px-2 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-[9px] md:text-xs rounded font-bold tracking-wide">
                                        {msg.message_type === "confirmation" ? "Booking Confirmation" : "Reminder"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
