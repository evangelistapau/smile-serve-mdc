'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, X, Settings, Lock, Unlock, ExternalLink, Clock, User } from 'lucide-react'
import {
    getAppointmentsForDate,
    getAppointmentsForDateRange,
    getUnavailableSlots,
    getUnavailableSlotsForRange,
    setSlotUnavailable,
    removeSlotUnavailable,
    deleteAppointment,
    toDisplayTime,
    toDbTime,
} from '@/lib/supabase/appointmentService'
import type { Appointment } from '@/types/appointment'
import type { UnavailableSlot } from '@/lib/supabase/appointmentService'
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments'

// ─── Constants ───────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

const ALL_TIME_SLOTS = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
]

type ViewMode = 'calendar' | 'day' | 'week'

// ─── Helpers ─────────────────────────────────────────────────

const toDateStr = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

function getWeekRange(date: Date): { start: Date; end: Date } {
    const d = new Date(date)
    const day = d.getDay()
    const start = new Date(d)
    start.setDate(d.getDate() - day)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { start, end }
}

function getWeekDates(date: Date): Date[] {
    const { start } = getWeekRange(date)
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        return d
    })
}

// ═════════════════════════════════════════════════════════════
//  Main Page
// ═════════════════════════════════════════════════════════════

export default function AppointmentsPage() {
    const today = new Date()
    const searchParams = useSearchParams()

    // Read ?view=day|week|calendar from URL, default to 'calendar'
    const initialView = (searchParams.get('view') as ViewMode) ?? 'calendar'
    const validViews: ViewMode[] = ['calendar', 'day', 'week']
    const [viewMode, setViewMode] = useState<ViewMode>(
        validViews.includes(initialView) ? initialView : 'calendar'
    )

    const [selectedDate, setSelectedDate] = useState(today)
    const [calMonth, setCalMonth] = useState(today.getMonth())
    const [calYear, setCalYear] = useState(today.getFullYear())

    // Data
    const [dayAppointments, setDayAppointments] = useState<Appointment[]>([])
    const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([])
    const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([])
    const [unavailableSlots, setUnavailableSlots] = useState<UnavailableSlot[]>([])
    const [weekUnavailable, setWeekUnavailable] = useState<UnavailableSlot[]>([])
    const [loading, setLoading] = useState(false)

    // Modal
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
    const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null)

    const dateStr = toDateStr(selectedDate)

    // ─── Fetch day appointments ─────────────────────────────
    const loadDayData = useCallback(async () => {
        setLoading(true)
        const [appts, unavail] = await Promise.all([
            getAppointmentsForDate(dateStr),
            getUnavailableSlots(dateStr),
        ])
        setDayAppointments(appts)
        setUnavailableSlots(unavail)
        setLoading(false)
    }, [dateStr])

    useEffect(() => { loadDayData() }, [loadDayData])

    // ─── Fetch month appointments (for calendar badges) ─────
    const loadMonthData = useCallback(() => {
        const startDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
        const lastDay = new Date(calYear, calMonth + 1, 0).getDate()
        const endDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        getAppointmentsForDateRange(startDate, endDate).then(setMonthAppointments)
    }, [calYear, calMonth])

    useEffect(() => { loadMonthData() }, [loadMonthData])

    // ─── Fetch week data ────────────────────────────────────
    const loadWeekData = useCallback(() => {
        if (viewMode !== 'week') return
        const dates = getWeekDates(selectedDate)
        const startDate = toDateStr(dates[0])
        const endDate = toDateStr(dates[6])
        Promise.all([
            getAppointmentsForDateRange(startDate, endDate),
            getUnavailableSlotsForRange(startDate, endDate),
        ]).then(([appts, unavail]) => {
            setWeekAppointments(appts)
            setWeekUnavailable(unavail)
        })
    }, [viewMode, selectedDate])

    useEffect(() => { loadWeekData() }, [loadWeekData])

    // ─── Realtime ───────────────────────────────────────────
    const handleRealtimeUpdate = useCallback(() => {
        loadDayData()
        loadMonthData()
        loadWeekData()
    }, [loadDayData, loadMonthData, loadWeekData])

    useRealtimeAppointments(handleRealtimeUpdate)

    // ─── Navigation ─────────────────────────────────────────
    const handlePrev = () => {
        if (viewMode === 'calendar') {
            const newMonth = calMonth === 0 ? 11 : calMonth - 1
            const newYear = calMonth === 0 ? calYear - 1 : calYear
            setCalMonth(newMonth)
            setCalYear(newYear)
        } else if (viewMode === 'day') {
            const prev = new Date(selectedDate)
            prev.setDate(prev.getDate() - 1)
            setSelectedDate(prev)
        } else {
            const prev = new Date(selectedDate)
            prev.setDate(prev.getDate() - 7)
            setSelectedDate(prev)
        }
    }

    const handleNext = () => {
        if (viewMode === 'calendar') {
            const newMonth = calMonth === 11 ? 0 : calMonth + 1
            const newYear = calMonth === 11 ? calYear + 1 : calYear
            setCalMonth(newMonth)
            setCalYear(newYear)
        } else if (viewMode === 'day') {
            const next = new Date(selectedDate)
            next.setDate(next.getDate() + 1)
            setSelectedDate(next)
        } else {
            const next = new Date(selectedDate)
            next.setDate(next.getDate() + 7)
            setSelectedDate(next)
        }
    }

    const confirmDelete = async () => {
        if (!appointmentToDelete) return
        const success = await deleteAppointment(appointmentToDelete)
        if (success) {
            loadDayData()
            const startDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
            const lastDay = new Date(calYear, calMonth + 1, 0).getDate()
            const endDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
            getAppointmentsForDateRange(startDate, endDate).then(setMonthAppointments)
            if (viewMode === 'week') {
                const dates = getWeekDates(selectedDate)
                getAppointmentsForDateRange(toDateStr(dates[0]), toDateStr(dates[6])).then(setWeekAppointments)
            }
        }
        setAppointmentToDelete(null)
    }

    // ─── Header label ───────────────────────────────────────
    const headerLabel = viewMode === 'calendar'
        ? `${MONTH_NAMES[calMonth]} ${calYear}`
        : viewMode === 'day'
            ? `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
            : `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`

    // ─── Booking counts per date (for calendar view) ────────
    const bookingCounts: Record<string, number> = {}
    monthAppointments.forEach((a) => {
        bookingCounts[a.appointment_date] = (bookingCounts[a.appointment_date] || 0) + 1
    })

    // ─── Unavailable flags ───────────────────────────────────
    const isDayUnavailable = unavailableSlots.some((s) => s.time_slot === null)
    const unavailableTimeSlots = new Set(
        unavailableSlots.filter((s) => s.time_slot !== null).map((s) => s.time_slot!)
    )

    return (
        <div className="space-y-0">

            {/* ═══ Toolbar ═══ */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
                {/* View toggle + Book Appointment */}
                <div className="flex items-center gap-3">
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                        {(['calendar', 'day', 'week'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-2 text-sm font-medium transition ${viewMode === mode
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>

                    <a
                        href="/patient-booking"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-400 text-white text-sm font-medium rounded-lg hover:bg-blue-500 active:scale-[0.97] transition shadow-sm"
                    >
                        Book Appointment
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-3">
                    <button onClick={handlePrev} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700 min-w-[160px] text-center">{headerLabel}</span>
                    <button onClick={handleNext} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>


            </div>

            {/* ═══ Views ═══ */}
            {viewMode === 'calendar' && (
                <CalendarView
                    calYear={calYear}
                    calMonth={calMonth}
                    selectedDate={selectedDate}
                    bookingCounts={bookingCounts}
                    dayAppointments={dayAppointments}
                    isDayUnavailable={isDayUnavailable}
                    unavailableTimeSlots={unavailableTimeSlots}
                    loading={loading}
                    onDateChange={(d) => {
                        setSelectedDate(d)
                        setCalMonth(d.getMonth())
                        setCalYear(d.getFullYear())
                    }}
                    onCustomize={() => setShowAvailabilityModal(true)}
                    onDeleteAppointment={setAppointmentToDelete}
                />
            )}

            {viewMode === 'day' && (
                <DayView
                    selectedDate={selectedDate}
                    appointments={dayAppointments}
                    isDayUnavailable={isDayUnavailable}
                    unavailableTimeSlots={unavailableTimeSlots}
                    loading={loading}
                    onMakeDayUnavailable={async () => {
                        if (isDayUnavailable) {
                            await removeSlotUnavailable(dateStr)
                        } else {
                            await setSlotUnavailable(dateStr)
                        }
                        loadDayData()
                    }}
                    onDeleteAppointment={setAppointmentToDelete}
                />
            )}

            {viewMode === 'week' && (
                <WeekView
                    selectedDate={selectedDate}
                    appointments={weekAppointments}
                    unavailableSlots={weekUnavailable}
                    onDeleteAppointment={setAppointmentToDelete}
                />
            )}

            {/* ═══ Availability Modal ═══ */}
            {showAvailabilityModal && (
                <AvailabilityModal
                    date={selectedDate}
                    unavailableSlots={unavailableSlots}
                    onClose={() => {
                        setShowAvailabilityModal(false)
                        loadDayData()
                    }}
                />
            )}

            {/* ═══ Delete Confirmation Modal ═══ */}
            {appointmentToDelete && (
                <DeleteConfirmationModal
                    onConfirm={confirmDelete}
                    onCancel={() => setAppointmentToDelete(null)}
                />
            )}
        </div>
    )
}

// ═════════════════════════════════════════════════════════════
//  Calendar View
// ═════════════════════════════════════════════════════════════

function CalendarView({
    calYear,
    calMonth,
    selectedDate,
    bookingCounts,
    dayAppointments,
    isDayUnavailable,
    unavailableTimeSlots,
    loading,
    onDateChange,
    onCustomize,
    onDeleteAppointment,
}: {
    calYear: number
    calMonth: number
    selectedDate: Date
    bookingCounts: Record<string, number>
    dayAppointments: Appointment[]
    isDayUnavailable: boolean
    unavailableTimeSlots: Set<string>
    loading: boolean
    onDateChange: (d: Date) => void
    onCustomize: () => void
    onDeleteAppointment: (id: string) => void
}) {
    const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

    const cells: (Date | null)[] = []
    for (let i = 0; i < totalCells; i++) {
        const dayNum = i - firstDayOfMonth + 1
        cells.push(dayNum >= 1 && dayNum <= daysInMonth ? new Date(calYear, calMonth, dayNum) : null)
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const formattedSelectedDate = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    })

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-4 md:p-6">
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {DAY_LABELS.map((d) => (
                            <div key={d} className="text-center text-sm font-medium text-gray-400 py-2">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 md:gap-2">
                        {cells.map((date, i) => {
                            if (!date) return <div key={`e-${i}`} className="aspect-square bg-gray-50/50 rounded-lg" />

                            const ds = toDateStr(date)
                            const isSelected = isSameDay(date, selectedDate)
                            const isToday = isSameDay(date, todayStart)
                            const count = bookingCounts[ds] || 0

                            return (
                                <button
                                    key={ds}
                                    onClick={() => onDateChange(date)}
                                    className={`
                                        aspect-square flex flex-col items-center justify-center rounded-lg p-1 md:p-2 text-sm transition-colors
                                        ${isSelected
                                            ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-1'
                                            : 'bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer'}
                                    `}
                                >
                                    <div className={`font-medium ${isToday && !isSelected ? 'text-blue-600' : ''}`}>{date.getDate()}</div>
                                    {count > 0 && (
                                        <div className={`text-[10px] sm:text-xs mt-0.5 md:mt-1 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                                            <span className="hidden sm:inline">{count} booking{count > 1 ? 's' : ''}</span>
                                            <span className="sm:hidden">{count}</span>
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 self-start">
                <h3 className="text-base font-bold text-gray-900 mb-4">{formattedSelectedDate}</h3>

                <button
                    onClick={onCustomize}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition mb-5"
                >
                    <Settings className="w-4 h-4" />
                    Customize Availability
                </button>

                {loading ? (
                    <div className="flex items-center gap-2 py-4">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-400">Loading…</span>
                    </div>
                ) : isDayUnavailable ? (
                    <p className="text-sm text-red-500 font-medium">Day marked unavailable</p>
                ) : dayAppointments.length === 0 ? (
                    <p className="text-sm text-gray-400">No appointments for this day.</p>
                ) : (
                    <div className="space-y-3">
                        {dayAppointments.map((appt) => (
                            <div
                                key={appt.appointment_id}
                                className="border border-gray-200 rounded-lg p-3 bg-blue-50 relative group flex flex-col"
                            >
                                <button
                                    onClick={() => appt.appointment_id && onDeleteAppointment(appt.appointment_id)}
                                    className="absolute top-2 right-2 p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 md:opacity-100"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                                <div className="font-medium text-sm text-gray-900 pr-5">{appt.patient_name || 'Appointment'}</div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    {appt.appointment_time}
                                </div>
                                {appt.purpose && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <User className="w-3.5 h-3.5" />
                                        {appt.purpose}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════
//  Day View
// ═════════════════════════════════════════════════════════════

function DayView({
    selectedDate,
    appointments,
    isDayUnavailable,
    unavailableTimeSlots,
    loading,
    onMakeDayUnavailable,
    onDeleteAppointment,
}: {
    selectedDate: Date
    appointments: Appointment[]
    isDayUnavailable: boolean
    unavailableTimeSlots: Set<string>
    loading: boolean
    onMakeDayUnavailable: () => void
    onDeleteAppointment: (id: string) => void
}) {
    const dayLabel = selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })

    const apptByTime: Record<string, Appointment> = {}
    appointments.forEach((a) => { apptByTime[a.appointment_time] = a })

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden pb-5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <span className="text-base font-semibold text-gray-700">{dayLabel}</span>
                <button
                    onClick={onMakeDayUnavailable}
                    className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition ${isDayUnavailable ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
                >
                    {isDayUnavailable ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {isDayUnavailable ? 'Make Day Available' : 'Make Day Unavailable'}
                </button>
            </div>

            {loading ? (
                <div className="flex items-center gap-3 px-6 py-12 justify-center">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-400">Loading…</span>
                </div>
            ) : isDayUnavailable ? (
                <div className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-red-500">This entire day is marked unavailable.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-50 pt-4">
                    {ALL_TIME_SLOTS.map((time) => {
                        const appt = apptByTime[time]
                        const isUnavailable = unavailableTimeSlots.has(time)

                        return (
                            <div key={time} className="flex items-stretch">
                                <div className="w-20 sm:w-24 md:w-28 flex-shrink-0 flex items-center justify-end pr-2 md:pr-4 py-2">
                                    <span className="text-sm text-gray-500 font-medium whitespace-nowrap">{time}</span>
                                </div>
                                <div className="flex-1 py-1 pr-3 md:pr-4 overflow-hidden">
                                    {isUnavailable ? (
                                        <div className="bg-gray-100 rounded-md px-3 py-3 text-center h-full flex items-center justify-center">
                                            <span className="text-sm text-gray-400 font-medium">Unavailable</span>
                                        </div>
                                    ) : appt ? (
                                        <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-1.5 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 leading-tight">{appt.patient_name}</p>
                                                <p className="text-[11px] text-blue-500 mt-0.5"> {appt.purpose || 'Appointment'}</p>
                                            </div>
                                            <button
                                                onClick={() => appt.appointment_id && onDeleteAppointment(appt.appointment_id)}
                                                className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-green-50 border border-green-100 rounded-md px-3 py-3 text-center h-full flex items-center justify-center">
                                            <span className="text-sm text-green-600 font-medium">Available</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ═════════════════════════════════════════════════════════════
//  Week View
// ═════════════════════════════════════════════════════════════

function WeekView({
    selectedDate,
    appointments,
    unavailableSlots,
    onDeleteAppointment,
}: {
    selectedDate: Date
    appointments: Appointment[]
    unavailableSlots: UnavailableSlot[]
    onDeleteAppointment: (id: string) => void
}) {
    const weekDates = getWeekDates(selectedDate)

    const apptMap: Record<string, Record<string, Appointment>> = {}
    appointments.forEach((a) => {
        if (!apptMap[a.appointment_date]) apptMap[a.appointment_date] = {}
        apptMap[a.appointment_date][a.appointment_time] = a
    })

    const unavailSet = new Set<string>()
    unavailableSlots.forEach((s) => {
        if (s.time_slot === null) {
            unavailSet.add(`${s.date}|full`)
        } else {
            unavailSet.add(`${s.date}|${s.time_slot}`)
        }
    })

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-auto pb-5">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="w-24 px-3 py-4 text-right text-xs font-medium text-gray-400" />
                        {weekDates.map((d) => {
                            const ds = toDateStr(d)
                            const isToday = isSameDay(d, new Date())
                            return (
                                <th
                                    key={ds}
                                    className={`px-2 py-4 text-center ${isToday ? 'text-blue-600' : 'text-gray-600'}`}
                                >
                                    <div className="text-xs font-semibold uppercase">{DAY_LABELS_SHORT[d.getDay()]}</div>
                                    <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                                        {d.getDate()}
                                    </div>
                                </th>
                            )
                        })}
                    </tr>
                </thead>
                <tbody>
                    {ALL_TIME_SLOTS.map((time) => (
                        <tr key={time} className="border-b border-gray-50">
                            <td className="px-3 py-3 text-right text-xs font-medium text-gray-500 whitespace-nowrap">
                                {time}
                            </td>
                            {weekDates.map((d) => {
                                const ds = toDateStr(d)
                                const isDayFull = unavailSet.has(`${ds}|full`)
                                const isSlotUnavail = unavailSet.has(`${ds}|${time}`)
                                const appt = apptMap[ds]?.[time]

                                return (
                                    <td key={ds} className="px-1.5 py-1.5">
                                        {isDayFull || isSlotUnavail ? (
                                            <div className="bg-gray-100 rounded-md px-2 py-3 text-center h-full flex items-center justify-center">
                                                <span className="text-[11px] text-gray-400 font-medium">Unavailable</span>
                                            </div>
                                        ) : appt ? (
                                            <div className="bg-blue-50 border border-blue-100 rounded-md px-2 py-1.5 relative group">
                                                <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{appt.patient_name}</p>
                                                <p className="text-[11px] text-blue-500 mt-0.5 truncate">{appt.purpose || 'Appointment'}</p>
                                                <button
                                                    onClick={() => appt.appointment_id && onDeleteAppointment(appt.appointment_id)}
                                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center transition"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-green-50 border border-green-100 rounded-md px-2 py-3 text-center h-full flex items-center justify-center">
                                                <span className="text-[11px] text-green-600 font-medium">Available</span>
                                            </div>
                                        )}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════
//  Availability Modal
// ═════════════════════════════════════════════════════════════

function AvailabilityModal({
    date,
    unavailableSlots: initialSlots,
    onClose,
}: {
    date: Date
    unavailableSlots: UnavailableSlot[]
    onClose: () => void
}) {
    const dateStr = toDateStr(date)
    const [slots, setSlots] = useState<UnavailableSlot[]>(initialSlots)
    const [saving, setSaving] = useState<string | null>(null)

    const isDayUnavailable = slots.some((s) => s.time_slot === null)
    const unavailableSet = new Set(slots.filter((s) => s.time_slot !== null).map((s) => s.time_slot!))

    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    const handleMarkDayUnavailable = async () => {
        setSaving('day')
        if (isDayUnavailable) {
            await removeSlotUnavailable(dateStr)
        } else {
            await setSlotUnavailable(dateStr)
        }
        const updated = await getUnavailableSlots(dateStr)
        setSlots(updated)
        setSaving(null)
    }

    const handleToggleSlot = async (time: string) => {
        setSaving(time)
        if (unavailableSet.has(time)) {
            await removeSlotUnavailable(dateStr, time)
        } else {
            await setSlotUnavailable(dateStr, time)
        }
        const updated = await getUnavailableSlots(dateStr)
        setSlots(updated)
        setSaving(null)
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Availability: {formattedDate}</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-5 overflow-y-auto flex-1">
                    <button
                        onClick={handleMarkDayUnavailable}
                        disabled={saving === 'day'}
                        className={`w-full py-3 rounded-lg text-sm font-semibold transition mb-6 ${isDayUnavailable
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                            } disabled:opacity-50`}
                    >
                        {saving === 'day' ? 'Saving…' : isDayUnavailable ? 'Mark Day as Available' : 'Mark Entire Day as Unavailable'}
                    </button>

                    <hr className="border-gray-100 mb-5" />

                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Time Slot Availability</h3>

                    <div className="space-y-3">
                        {ALL_TIME_SLOTS.map((time) => {
                            const isUnavail = unavailableSet.has(time)
                            const isSaving = saving === time

                            return (
                                <div key={time} className="flex items-center justify-between px-4 py-3 border border-gray-100 rounded-lg">
                                    <span className="text-sm font-medium text-gray-700">{time}</span>
                                    <button
                                        onClick={() => handleToggleSlot(time)}
                                        disabled={isSaving || isDayUnavailable}
                                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${isUnavail
                                            ? 'bg-green-500 hover:bg-green-600 text-white'
                                            : 'bg-red-500 hover:bg-red-600 text-white'
                                            } disabled:opacity-50`}
                                    >
                                        {isSaving ? 'Saving…' : isUnavail ? 'Mark Available' : 'Mark Unavailable'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════
//  Delete Confirmation Modal
// ═════════════════════════════════════════════════════════════

function DeleteConfirmationModal({
    onConfirm,
    onCancel,
}: {
    onConfirm: () => void
    onCancel: () => void
}) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Remove Appointment</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to remove this appointment? This indicates that it has either been completed or canceled.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2 px-4 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                    >
                        No
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition"
                    >
                        Yes
                    </button>
                </div>
            </div>
        </div>
    )
}