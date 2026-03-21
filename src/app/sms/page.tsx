'use client'

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import { getSmsSettings, saveSmsSettings } from "@/lib/supabase/smsService"
import { toast } from "sonner"

export default function SmsSettingsPage() {
    const [smsSettings, setSmsSettings] = useState({
        senderNumber: "",
        confirmedBookingMessage: "",
        reminderMessage: "",
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [filterStatus, setFilterStatus] = useState<"all" | "sent" | "pending">("all")

    // Load settings from Supabase on mount
    useEffect(() => {
        async function load() {
            const settings = await getSmsSettings()
            setSmsSettings(settings)
            setLoading(false)
        }
        load()
    }, [])

    // Mock SMS message data — content is generated dynamically from the templates
    const mockPatients = [
        { name: "Sarah Johnson", phone: "+1 (555) 123-4567", date: "Nov 12", time: "2:00 PM", type: "confirmation" as const, status: "sent" as const, sentTime: "2024-11-11 10:30 AM" },
        { name: "Michael Chen", phone: "+1 (555) 234-5678", date: "Nov 11", time: "3:00 PM", type: "reminder" as const, status: "sent" as const, sentTime: "2024-11-11 10:15 AM" },
        { name: "Emily Davis", phone: "+1 (555) 345-6789", date: "Nov 13", time: "9:00 AM", type: "confirmation" as const, status: "pending" as const, sentTime: "2024-11-11 11:00 AM" },
        { name: "James Wilson", phone: "+1 (555) 456-7890", date: "Nov 11", time: "1:00 PM", type: "reminder" as const, status: "sent" as const, sentTime: "2024-11-11 09:45 AM" },
        { name: "Lisa Anderson", phone: "+1 (555) 567-8901", date: "Nov 15", time: "4:00 PM", type: "confirmation" as const, status: "pending" as const, sentTime: "2024-11-11 10:50 AM" },
    ]

    // Build messages dynamically from templates
    const messages = mockPatients.map((p, i) => {
        const template = p.type === "confirmation"
            ? smsSettings.confirmedBookingMessage
            : smsSettings.reminderMessage

        const content = template
            .replace(/{patient_name}/g, p.name)
            .replace(/{appointment_date}/g, p.date)
            .replace(/{appointment_time}/g, p.time)

        return {
            id: i + 1,
            patientName: p.name,
            patientPhone: p.phone,
            messageType: p.type,
            content,
            status: p.status,
            sentTime: p.sentTime,
        }
    })

    const filteredMessages = messages.filter((msg) => filterStatus === "all" || msg.status === filterStatus)

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
                                <p className="text-xs text-muted-foreground mt-1">
                                    Include country code (e.g., +63 for PH)
                                </p>
                            </div>
                            <div>
                            </div>
                        </div>
                    </div>

                    {/* SMS Message Templates */}
                    <div className="border-t border-border pt-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Message Templates</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Available variables: <code className="bg-gray-100 px-1 rounded">{"{patient_name}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{appointment_date}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{appointment_time}"}</code>
                        </p>

                        {/* Booking Confirmation */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">Booking Confirmation Message</label>
                            <textarea
                                value={smsSettings.confirmedBookingMessage}
                                onChange={(e) => handleSmsChange("confirmedBookingMessage", e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Reminder Message */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Reminder Message (5 hours before)
                            </label>
                            <textarea
                                value={smsSettings.reminderMessage}
                                onChange={(e) => handleSmsChange("reminderMessage", e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="border-t border-border pt-6">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
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
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                    {["all", "sent", "pending"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status as "all" | "sent" | "pending")}
                            className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === status ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)} ({status === "all"
                                ? messages.length
                                : messages.filter((m) => m.status === status).length})
                        </button>
                    ))}
                </div>

                {/* Messages List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredMessages.map((msg) => (
                        <div key={msg.id} className="border border-border rounded-lg p-4 hover:bg-gray-50 transition">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                                <div>
                                    <h3 className="font-semibold text-foreground">{msg.patientName}</h3>
                                    <p className="text-sm text-muted-foreground">{msg.patientPhone}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${msg.status === "sent" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                            }`}
                                    >
                                        {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{msg.sentTime}</span>
                                </div>
                            </div>
                            <p className="text-sm text-foreground mb-2">{msg.content}</p>
                            <div className="flex items-center gap-2">
                                <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-medium">
                                    {msg.messageType === "confirmation" ? "Booking Confirmation" : "Reminder"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
}
