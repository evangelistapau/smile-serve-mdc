'use client'

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [logs, setLogs] = useState<SmsLog[]>([])
    const [logsLoading, setLogsLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")

    // ─── Load settings ────────────────────────────────────────
    useEffect(() => {
        async function load() {
            const settings = await getSmsSettings()
            setSmsSettings(settings)
            setLoading(false)
        }
        load()
    }, [])

    // ─── Load SMS logs ────────────────────────────────────────
    const fetchLogs = useCallback(async () => {
        setLogsLoading(true)
        const data = await getSmsLogs(100)
        setLogs(data)
        setLogsLoading(false)
    }, [])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

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

    const handleSave = async () => {
        setSaving(true)
        const success = await saveSmsSettings(smsSettings)
        setSaving(false)
        if (success) {
            toast.success("SMS settings saved successfully")
        } else {
            toast.error("Failed to save SMS settings")
        }
    }

    // ─── Status badge ─────────────────────────────────────────
    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            sent: "bg-green-100 text-green-700",
            pending: "bg-yellow-100 text-yellow-700",
            failed: "bg-red-100 text-red-600",
        }
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-gray-400">Loading SMS settings…</span>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* SMS Configuration Card */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">SMS Configuration</h2>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Sender Phone Number</label>
                                <input
                                    type="tel"
                                    value={smsSettings.senderNumber}
                                    onChange={(e) => handleSmsChange("senderNumber", e.target.value)}
                                    className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="+639123456789"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Include country code (e.g., +63 for PH)</p>
                            </div>
                        </div>
                    </div>

                    {/* SMS Message Templates */}
                    <div className="border-t border-border pt-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Message Templates</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Available variables: <code className="bg-gray-100 px-1 rounded">{"{patient_name}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{appointment_date}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{appointment_time}"}</code>
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">Booking Confirmation Message</label>
                            <textarea
                                value={smsSettings.confirmedBookingMessage}
                                onChange={(e) => handleSmsChange("confirmedBookingMessage", e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Reminder Message (2 hours before)</label>
                            <textarea
                                value={smsSettings.reminderMessage}
                                onChange={(e) => handleSmsChange("reminderMessage", e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="border-t border-border pt-6">
                        <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
                            {saving ? "Saving..." : "Save SMS Settings"}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* SMS Messages History */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Bell className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-bold text-foreground">Message History</h2>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                    {(["all", "sent", "pending", "failed"] as FilterStatus[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)} ({countFor(s)})
                        </button>
                    ))}
                </div>

                {/* Messages List */}
                {logsLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="ml-3 text-sm text-gray-400">Loading messages…</span>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-10">
                        <Bell className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">
                            {logs.length === 0
                                ? "No SMS messages sent yet. Messages will appear here after booking confirmations are sent."
                                : "No messages match this filter."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredLogs.map((msg) => (
                            <div key={msg.id} className="border border-border rounded-lg p-4 hover:bg-gray-50 transition">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                                    <div>
                                        <h3 className="font-semibold text-foreground">
                                            {msg.patient_name ?? "Unknown patient"}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">{msg.patient_phone}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {statusBadge(msg.status)}
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(msg.sent_at).toLocaleString('en-PH', {
                                                month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>
                                {msg.content && (
                                    <p className="text-sm text-foreground mb-2 line-clamp-2">{msg.content}</p>
                                )}
                                <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-medium">
                                    {msg.message_type === "confirmation" ? "Booking Confirmation" : "Reminder"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}
