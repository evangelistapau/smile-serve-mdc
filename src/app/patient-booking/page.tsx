'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'
import {
    getBookedTimeSlots,
    createAppointment,
    isPastOperatingHours,
    isDateFullyBooked,
    getUnavailableSlots,
} from '@/lib/supabase/appointmentService'
import { sendBookingConfirmationSms, sendBookingReminderSms } from '@/lib/supabase/smsService'
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments'

// ─── Constants ───────────────────────────────────────────────

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

const ALL_TIME_SLOTS = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
]
const LAST_TIME_SLOT = '5:00 PM'

// ─── Helpers ─────────────────────────────────────────────────

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

const toDateStr = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function isTimeSlotPast(time: string, selectedDate: Date) {
    const now = new Date()
    if (!isSameDay(selectedDate, now)) return false

    const [timeStr, period] = time.split(' ')
    const [hours, minutes] = timeStr.split(':').map(Number)
    let slotHour = hours
    if (period === 'PM' && hours !== 12) slotHour += 12
    else if (period === 'AM' && hours === 12) slotHour = 0

    const slotDate = new Date(now)
    slotDate.setHours(slotHour, minutes, 0, 0)
    return slotDate.getTime() - now.getTime() < 60 * 60 * 1000
}

// ═════════════════════════════════════════════════════════════
//  Main Page
// ═════════════════════════════════════════════════════════════

export default function PatientBookingPage() {
    const today = new Date()
    const [currentDate, setCurrentDate] = useState(today)
    const [selectedDate, setSelectedDate] = useState(today)
    const [selectedTime, setSelectedTime] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [bookedSlots, setBookedSlots] = useState<string[]>([])
    const [unavailSlots, setUnavailSlots] = useState<string[]>([])
    const [isDayBlocked, setIsDayBlocked] = useState(false)
    const [loadingSlots, setLoadingSlots] = useState(false)

    // Dates that are disabled (past / past operating hours)
    const [disabledDates, setDisabledDates] = useState<Set<string>>(new Set())
    // Dates that are fully booked (all 9 slots taken)
    const [fullyBookedDates, setFullyBookedDates] = useState<Set<string>>(new Set())

    const dateString = toDateStr(selectedDate)
    const calYear = currentDate.getFullYear()
    const calMonth = currentDate.getMonth()

    // ─── Fetch booked slots + unavailable when date changes ──
    const loadSlots = useCallback(async () => {
        setLoadingSlots(true)
        const [slots, unavail] = await Promise.all([
            getBookedTimeSlots(dateString),
            getUnavailableSlots(dateString),
        ])
        setBookedSlots(slots)
        const dayBlocked = unavail.some((s) => s.time_slot === null)
        setIsDayBlocked(dayBlocked)
        setUnavailSlots(dayBlocked ? [] : unavail.filter((s) => s.time_slot !== null).map((s) => s.time_slot!))
        setLoadingSlots(false)
    }, [dateString])

    useEffect(() => {
        setBookedSlots([])
        setUnavailSlots([])
        setIsDayBlocked(false)
        loadSlots()
    }, [loadSlots])

    // ─── Fetch disabled & fully booked dates per month ────────
    const loadMonthData = useCallback(async () => {
        const disabled = new Set<string>()
        const fullyBooked = new Set<string>()
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(calYear, calMonth, day)
            const ds = toDateStr(d)

            if (d < todayStart) { disabled.add(ds); continue }
            if (isPastOperatingHours(d, LAST_TIME_SLOT)) { disabled.add(ds); continue }

            const isFull = await isDateFullyBooked(ds, ALL_TIME_SLOTS)
            if (isFull) {
                fullyBooked.add(ds)
                disabled.add(ds)
            }
        }

        setDisabledDates(disabled)
        setFullyBookedDates(fullyBooked)
    }, [calYear, calMonth])

    useEffect(() => { loadMonthData() }, [loadMonthData])

    // ─── Realtime: re-fetch when any appointment changes ─────
    const handleRealtimeUpdate = useCallback(() => {
        loadSlots()
        loadMonthData()
    }, [loadSlots, loadMonthData])

    useRealtimeAppointments(handleRealtimeUpdate)

    // ─── Handlers ────────────────────────────────────────────
    const handleTimeSlotSelect = (time: string) => {
        setSelectedTime(time)
        setShowForm(true)
    }

    const handleFormClose = () => {
        setShowForm(false)
        setSelectedTime(null)
    }

    const handleBookingSuccess = async () => {
        // Optimistic update
        if (selectedTime) {
            setBookedSlots((prev) => [...prev, selectedTime])
        }
        setShowForm(false)
        setSelectedTime(null)

        // Re-fetch for consistency
        const slots = await getBookedTimeSlots(dateString)
        setBookedSlots(slots)
    }

    // ─── Render ──────────────────────────────────────────────
    return (
        <main className="flex flex-col md:flex-row min-h-screen md:h-screen bg-background">
            {/* ═══ Calendar (left) ═══ */}
            <Calendar
                calYear={calYear}
                calMonth={calMonth}
                selectedDate={selectedDate}
                disabledDates={disabledDates}
                fullyBookedDates={fullyBookedDates}
                onDateChange={setSelectedDate}
                onPrevMonth={() => setCurrentDate(new Date(calYear, calMonth - 1, 1))}
                onNextMonth={() => setCurrentDate(new Date(calYear, calMonth + 1, 1))}
            />

            {/* ═══ Time Slots (right) ═══ */}
            <TimeSlots
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                bookedSlots={bookedSlots}
                unavailSlots={unavailSlots}
                isDayBlocked={isDayBlocked}
                loading={loadingSlots}
                onTimeSlotSelect={handleTimeSlotSelect}
            />

            {/* ═══ Booking Modal ═══ */}
            {showForm && selectedTime && (
                <BookingFormModal
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    onClose={handleFormClose}
                    onSuccess={handleBookingSuccess}
                />
            )}
        </main>
    )
}

// ═════════════════════════════════════════════════════════════
//  Calendar
// ═════════════════════════════════════════════════════════════

function Calendar({
    calYear,
    calMonth,
    selectedDate,
    disabledDates,
    fullyBookedDates,
    onDateChange,
    onPrevMonth,
    onNextMonth,
}: {
    calYear: number
    calMonth: number
    selectedDate: Date
    disabledDates: Set<string>
    fullyBookedDates: Set<string>
    onDateChange: (d: Date) => void
    onPrevMonth: () => void
    onNextMonth: () => void
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

    return (
        <div className="w-full md:w-1/2 p-4 md:p-8 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-light">
                    <span className="text-blue-500 font-bold">{MONTH_NAMES[calMonth]}</span>{' '}
                    <span className="text-gray-400">{calYear}</span>
                </h2>
                <div className="flex items-center gap-2">
                    <button onClick={onPrevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={onNextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
                {DAY_LABELS.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
                ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 flex-1">
                {cells.map((date, i) => {
                    if (!date) return <div key={`e-${i}`} className="border border-gray-100" />

                    const ds = toDateStr(date)
                    const isDisabled = disabledDates.has(ds)
                    const isSelected = isSameDay(date, selectedDate)
                    const isToday = isSameDay(date, todayStart)
                    const isPast = date < todayStart
                    const isFullyBooked = fullyBookedDates.has(ds)

                    return (
                        <button
                            key={ds}
                            onClick={() => !isDisabled && onDateChange(date)}
                            disabled={isDisabled}
                            className={`
                                relative border border-gray-100 p-2 text-sm font-medium transition-all
                                flex flex-col items-center justify-start pt-3
                                ${isSelected
                                    ? 'bg-blue-500 text-white'
                                    : isFullyBooked
                                        ? 'bg-red-50 text-red-400 cursor-not-allowed'
                                        : isToday
                                            ? 'bg-blue-50 text-blue-600'
                                            : isPast || isDisabled
                                                ? 'text-gray-300 cursor-not-allowed'
                                                : 'text-gray-700 hover:bg-blue-50 cursor-pointer'}
                            `}
                        >
                            {date.getDate()}
                            {/* Fully booked label */}
                            {isFullyBooked && (
                                <span className={`text-[8px] mt-0.5 font-semibold ${isSelected ? 'text-white/80' : 'text-red-400'}`}>
                                    Fully Booked
                                </span>
                            )}
                            {/* Today dot */}
                            {isToday && !isSelected && !isFullyBooked && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════
//  Time Slots
// ═════════════════════════════════════════════════════════════

function TimeSlots({
    selectedDate,
    selectedTime,
    bookedSlots,
    unavailSlots,
    isDayBlocked,
    loading,
    onTimeSlotSelect,
}: {
    selectedDate: Date
    selectedTime: string | null
    bookedSlots: string[]
    unavailSlots: string[]
    isDayBlocked: boolean
    loading: boolean
    onTimeSlotSelect: (time: string) => void
}) {
    const dayName = selectedDate.toLocaleDateString('default', { weekday: 'long' })
    const formattedDate = selectedDate.toLocaleDateString('default', { month: 'numeric', day: 'numeric' })

    // Check if all slots are unavailable (booked, past, or admin-blocked)
    const allUnavailable = isDayBlocked || ALL_TIME_SLOTS.every(
        (time) => bookedSlots.includes(time) || isTimeSlotPast(time, selectedDate) || unavailSlots.includes(time)
    )

    return (
        <div className="w-full md:w-1/2 p-4 md:p-8 bg-background flex flex-col">
            <h3 className="text-2xl md:text-3xl font-light mb-6 md:mb-8">
                <span className="font-bold">{dayName}</span>
                <span className="text-gray-400">, {formattedDate}</span>
            </h3>

            {allUnavailable && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-center">
                    <p className="text-sm font-semibold text-red-500">
                        {isDayBlocked ? 'This day is unavailable for booking' : 'No available slots for this day'}
                    </p>
                    <p className="text-xs text-red-400 mt-1">Please select another date.</p>
                </div>
            )}

            <div className="space-y-3 flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="ml-3 text-sm text-gray-400">Loading slots…</span>
                    </div>
                ) : (
                    ALL_TIME_SLOTS.map((time) => {
                        const booked = bookedSlots.includes(time)
                        const past = isTimeSlotPast(time, selectedDate)
                        const blocked = isDayBlocked || unavailSlots.includes(time)
                        const unavailable = booked || past || blocked

                        return (
                            <button
                                key={time}
                                onClick={() => onTimeSlotSelect(time)}
                                disabled={unavailable}
                                className={`w-full py-4 px-6 border-2 rounded-lg text-center font-semibold transition-all ${booked
                                    ? 'border-red-300 bg-red-50 text-red-400 cursor-not-allowed opacity-60'
                                    : past || blocked
                                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                                        : selectedTime === time
                                            ? 'border-blue-500 bg-blue-500 text-white'
                                            : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                                    }`}
                            >
                                {time}
                                {booked && (
                                    <span className="text-xs ml-2 font-medium">
                                        (Booked)
                                    </span>
                                )}
                                {blocked && !booked && (
                                    <span className="text-xs ml-2 font-medium">
                                        (Unavailable)
                                    </span>
                                )}
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════
//  Booking Form Modal
// ═════════════════════════════════════════════════════════════

function BookingFormModal({
    selectedDate,
    selectedTime,
    onClose,
    onSuccess,
}: {
    selectedDate: Date
    selectedTime: string
    onClose: () => void
    onSuccess: () => void
}) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [purpose, setPurpose] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const formattedDate = selectedDate.toLocaleDateString('default', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    })
    const dateStr = toDateStr(selectedDate)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!/^09\d{9}$/.test(phone)) {
            setError('Phone number format is incorrect. It should be 11 digits starting with 09 (e.g. 09151234567).')
            return
        }

        setSubmitting(true)

        try {
            await createAppointment({
                patient_name: name,
                patient_email: email,
                phone_number: phone,
                appointment_date: dateStr,
                appointment_time: selectedTime,
                purpose: purpose || '',
            })

            // Fire-and-forget SMS confirmation
            const readableDate = selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            })
            // sendBookingConfirmationSms(name, phone, readableDate, selectedTime).catch((err) =>
            //     console.error('SMS send error (non-blocking):', err)
            // )

            // // // Schedule reminder SMS 5 hours before appointment
            // sendBookingReminderSms(name, phone, readableDate, selectedTime, dateStr).catch((err) =>
            //     console.error('Reminder SMS scheduling error (non-blocking):', err)
            // )

            // // Fire-and-forget email confirmation (only if email provided)
            if (email) {
                fetch('/api/send-confirmation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patientName: name,
                        patientEmail: email,
                        readableDate,
                        appointmentTime: selectedTime,
                        purpose
                    })
                }).catch((err) =>
                    console.error('Email send error (non-blocking):', err)
                )
            }

            toast.success('Successfully booked! Check sms or email (if provided) for confirmation message.')
            onSuccess()
        } catch (err: unknown) {
            if (err instanceof Error && err.message === 'SLOT_TAKEN') {
                setError('This time slot was just booked by someone else. Please choose another slot.')
            } else if (err instanceof Error && err.message === 'BOOKING_LIMIT') {
                setError('You can only book up to 2 appointments per day. Please choose a different date.')
            } else {
                setError('Something went wrong. Please try again.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    const inputClass =
        'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white'

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-5">Complete Your Booking</h2>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6">
                        <p className="text-xs text-gray-500 mb-0.5">Appointment Date & Time</p>
                        <p className="text-sm font-semibold text-gray-900">
                            {formattedDate} at {selectedTime}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-blue-600 mb-1.5">Full Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-600 mb-1.5">Phone Number</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '')
                                    if (val.length <= 11) setPhone(val)
                                }}
                                placeholder="09151234567"
                                required
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-600 mb-1.5">
                                Email Address <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-600 mb-1.5">
                                Purpose <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Dental cleaning, checkup" className={inputClass} />
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !name || !phone}
                                className={`flex-1 py-2.5 text-white text-sm font-medium rounded-lg transition ${submitting || !name || !phone ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                                    }`}
                            >
                                {submitting ? 'Booking...' : 'Confirm Booking'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
