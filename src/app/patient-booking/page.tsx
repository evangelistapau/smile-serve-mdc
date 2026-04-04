

'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, MapPin, Phone, Mail, Smartphone } from 'lucide-react'
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
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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

// Clinic Info Card
function ClinicInfoCard() {
    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Modern Dentistry Clinic</h3>
            </div>

            <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-gray-700 mb-0.5">Address</p>
                    <p className="text-sm text-gray-600">San Miguel,Boac, Marinduque</p>
                </div>
            </div>

            <div className="flex gap-3">
                <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-gray-700 mb-0.5">Mobile Number</p>
                    <a href="tel:09298218291" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        09298218291
                    </a>
                </div>
            </div>

            <div className="flex gap-3">
                <Phone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-gray-700 mb-0.5">Telephone</p>
                    <a href="tel:0423321554" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        042-7541389
                    </a>
                </div>
            </div>

            <div className="flex gap-3">
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-gray-700 mb-0.5">Email</p>
                    <a href="mailto: moderndentistry2026@gmail.com" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        moderndentistry2026@gmail.com
                    </a>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-900 mb-2">Operating Hours</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                    Mon - Sat: 9:00 AM - 5:00 PM<br />
                    Sun: Closed
                </p>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs text-blue-800 leading-relaxed">
                        <strong>Note:</strong> Please double-check your booking details. Online cancellations are not supported. If you need to reschedule, kindly contact us as soon as possible.
                    </p>
                </div>
            </div>
        </div>
    )
}

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
    const [disabledDates, setDisabledDates] = useState<Set<string>>(new Set())
    const [fullyBookedDates, setFullyBookedDates] = useState<Set<string>>(new Set())

    const currentStep = !selectedDate ? 1 : !selectedTime ? 2 : 3

    const dateString = toDateStr(selectedDate)
    const calYear = currentDate.getFullYear()
    const calMonth = currentDate.getMonth()

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
        loadSlots().catch(() => {
            setLoadingSlots(false)
        })
    }, [loadSlots])

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
            if (isFull) { fullyBooked.add(ds); disabled.add(ds) }
        }

        setDisabledDates(disabled)
        setFullyBookedDates(fullyBooked)
    }, [calYear, calMonth])

    useEffect(() => { loadMonthData().catch(() => {}) }, [loadMonthData])

    // Show one consolidated toast on initial load if either fails
    useEffect(() => {
        async function initialLoad() {
            const results = await Promise.allSettled([loadSlots(), loadMonthData()])
            if (results.some(r => r.status === 'rejected')) {
                toast.error('Network error. Could not load booking data.')
            }
        }
        initialLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleRealtimeUpdate = useCallback(() => {
        Promise.allSettled([loadSlots(), loadMonthData()])
    }, [loadSlots, loadMonthData])

    useRealtimeAppointments(handleRealtimeUpdate)

    const handleTimeSlotSelect = (time: string) => {
        setSelectedTime(time)
        setShowForm(true)
    }

    const handleFormClose = () => {
        setShowForm(false)
        setSelectedTime(null)
    }

    const handleBookingSuccess = async () => {
        if (selectedTime) setBookedSlots((prev) => [...prev, selectedTime])
        setShowForm(false)
        setSelectedTime(null)
        const slots = await getBookedTimeSlots(dateString)
        setBookedSlots(slots)
    }

    return (
        <>
            <main className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
                {/* Calendar Section */}
                <div className="w-full lg:w-[60%] lg:border-r border-gray-200">
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
                </div>

                {/* Time Slots & Info Section */}
                <div className="w-full lg:w-[40%] flex flex-col lg:flex-row">
                    <TimeSlots
                        selectedDate={selectedDate}
                        selectedTime={selectedTime}
                        bookedSlots={bookedSlots}
                        unavailSlots={unavailSlots}
                        isDayBlocked={isDayBlocked}
                        loading={loadingSlots}
                        onTimeSlotSelect={handleTimeSlotSelect}
                    />

                    {/* Clinic Info - Sidebar */}
                    <div className="hidden xl:flex w-72 bg-gray-50 border-l border-gray-200 p-6 flex-col">
                        <ClinicInfoCard />
                    </div>
                </div>

                {/* Clinic Info - Mobile/Tablet */}
                <div className="xl:hidden w-full px-4 md:px-8 py-6 bg-gray-50 border-t border-gray-200">
                    <ClinicInfoCard />
                </div>

                {showForm && selectedTime && (
                    <BookingFormModal
                        selectedDate={selectedDate}
                        selectedTime={selectedTime}
                        onClose={handleFormClose}
                        onSuccess={handleBookingSuccess}
                    />
                )}
            </main>
        </>
    )
}

// ═══ Calendar ═══

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
        <div className="p-4 md:p-8 bg-white flex flex-col h-full">
            {/* Header */}
            <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Step 1. select a date</p>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {MONTH_NAMES[calMonth]} <span className="text-gray-400 font-light">{calYear}</span>
                </h2>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onPrevMonth}
                        className="p-2 rounded-lg hover:bg-gray-100 transition text-blue-600 hover:text-blue-700"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onNextMonth}
                        className="p-2 rounded-lg hover:bg-gray-100 transition text-blue-600 hover:text-blue-700"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-3">
                {DAY_LABELS.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
                ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1.5 flex-1">
                {cells.map((date, i) => {
                    if (!date) return <div key={`e-${i}`} />

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
                                relative flex flex-col items-center justify-center
                                rounded-xl py-3 text-sm font-medium transition-all
                                ${isSelected
                                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
                                    : isFullyBooked
                                        ? 'bg-red-50 text-red-500 cursor-not-allowed border border-red-200'
                                        : isToday
                                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                                            : isPast || isDisabled
                                                ? 'text-gray-300 cursor-not-allowed border border-gray-200 bg-gray-50/50'
                                                : 'text-gray-700 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 cursor-pointer'}
                            `}
                        >
                            {date.getDate()}
                            {isFullyBooked && (
                                <span className={`text-[8px] mt-0.5 font-semibold leading-none ${isSelected ? 'text-white/80' : 'text-red-500'}`}>
                                    Full
                                </span>
                            )}
                            {isToday && !isSelected && !isFullyBooked && (
                                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                            )}
                        </button>
                    )
                })}
            </div>

        </div>
    )
}

// ═══ Time Slots ═══

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
    const formattedDate = selectedDate.toLocaleDateString('default', { month: 'long', day: 'numeric' })

    const allUnavailable = isDayBlocked || ALL_TIME_SLOTS.every(
        (time) => bookedSlots.includes(time) || isTimeSlotPast(time, selectedDate) || unavailSlots.includes(time)
    )

    return (
        <div className="w-full lg:w-1/2 p-4 md:p-8 bg-white lg:border-r border-gray-200 flex flex-col h-full">
            {/* Header */}
            <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Step 2. select a time</p>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {dayName}
            </h3>
            <p className="text-gray-500 text-sm mb-6">{formattedDate}</p>

            {/* Wrapper */}
            <div className="flex flex-col flex-1 min-h-0">
                {/* Alert */}
                {allUnavailable && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-semibold text-red-600">
                            {isDayBlocked ? 'This day is unavailable for booking' : 'No available slots for this day'}
                        </p>
                        <p className="text-xs text-red-500 mt-1">Please select another date.</p>
                    </div>
                )}

                {/* Scrollable Time Slots */}
                <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
                    {loading ? (
                        <LoadingSpinner message="Loading available slots\u2026" />
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
                                    className={`w-full py-3 px-5 border-2 rounded-lg text-center text-sm font-semibold transition-all ${booked
                                        ? 'border-red-200 bg-red-50 text-red-500 cursor-not-allowed opacity-60'
                                        : past || blocked
                                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                                            : selectedTime === time
                                                ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                                        }`}
                                >
                                    <span>{time}</span>
                                    {booked && <span className="text-xs ml-2 font-medium">(Booked)</span>}
                                    {blocked && !booked && <span className="text-xs ml-2 font-medium">(Unavailable)</span>}
                                </button>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

// ═══ Booking Form Modal ═══

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
        weekday: 'long', month: 'long', day: 'numeric',
    })
    const dateStr = toDateStr(selectedDate)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!/^09\d{9}$/.test(phone)) {
            setError('Invalid phone number format')
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

            const readableDate = selectedDate.toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            })

            sendBookingConfirmationSms(name, phone, readableDate, selectedTime).catch((err) =>
                console.error('SMS send error (non-blocking):', err)
            )

            // // Schedule reminder SMS 
            sendBookingReminderSms(name, phone, readableDate, selectedTime, dateStr).catch((err) =>
                console.error('Reminder SMS scheduling error (non-blocking):', err)
            )

            if (email) {
                fetch('/api/send-confirmation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patientName: name,
                        patientEmail: email,
                        readableDate,
                        appointmentTime: selectedTime,
                        purpose,
                    }),
                }).catch((err) => console.error('Email send error (non-blocking):', err))
            }

            toast.success('Successfully booked! Check your SMS or email (if provided) for confirmation.')
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">
                    <X className="w-5 h-5" />
                </button>
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Booking</h2>
                    <p className="text-sm text-gray-600 mb-6">Step 3: Enter your contact information</p>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-200 rounded-lg px-4 py-4 mb-6">
                        <p className="text-xs text-gray-600 font-semibold mb-1 uppercase">Appointment Summary</p>
                        <p className="text-base font-bold text-gray-900">{formattedDate}</p>
                        <p className="text-base font-bold text-blue-600">{selectedTime}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                required
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Phone Number *</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '')
                                    if (val.length <= 11) setPhone(val)
                                }}
                                placeholder="09XXXXXXXXX"
                                required
                                className={inputClass}
                            />

                            {error && (
                                <div>
                                    <p className="text-red-500 text-xs font-small">{error}</p>
                                </div>
                            )}
                        </div>



                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Email Address <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="john@example.com"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Purpose of Visit <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                placeholder="e.g. Dental cleaning, checkup"
                                className={inputClass}
                            />
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !name || !phone}
                                className={`flex-1 py-2.5 text-white text-sm font-semibold rounded-lg transition ${submitting || !name || !phone
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                {submitting ? 'Confirming…' : 'Confirm Booking'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
