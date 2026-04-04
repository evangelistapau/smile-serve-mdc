'use client'

import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Appointment } from '@/types/appointment'
import {
    getDashboardStats,
    getTodayAppointments,
    getUpcomingAppointments,
    DashboardStats,
} from '@/lib/supabase/dashboardService'
import { getAppointmentDatesForMonth, getAppointmentsForDateRange } from '@/lib/supabase/appointmentService'
import { getAccountInfo } from '@/lib/supabase/settingsService'
import {
    Users,
    CalendarDays,
    CalendarCheck,
    CalendarRange,
    ChevronRight,
    CalendarPlus,
    UserPlus,
    Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
    const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    const [selectedAppointments, setSelectedAppointments] = useState<Appointment[]>([])
    const [loadingSelected, setLoadingSelected] = useState(false)
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
    const [upcomingWeekAppointments, setUpcomingWeekAppointments] = useState<Appointment[]>([])
    const [adminName, setAdminName] = useState('Admin')
    const [loading, setLoading] = useState(true)
    const [appointmentDates, setAppointmentDates] = useState<Set<string>>(new Set())

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true)
            try {
                const now = new Date()
                const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6)

                const dayOfWeek = now.getDay()
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
                const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
                const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)

                const [statsRes, todayRes, upcomingRes, weekCalendarAppts, weekAppts] = await Promise.all([
                    getDashboardStats(),
                    getTodayAppointments(),
                    getUpcomingAppointments(10),
                    getAppointmentsForDateRange(toDateStr(monday), toDateStr(sunday)),
                    getAppointmentsForDateRange(toDateStr(now), toDateStr(weekEnd)),
                ])
                setStats(statsRes)
                setTodayAppointments(todayRes)
                setSelectedAppointments(todayRes)
                setUpcomingAppointments(upcomingRes)
                setUpcomingWeekAppointments(weekAppts)
                setAppointmentDates(new Set(weekCalendarAppts.map(a => a.appointment_date)))

                const account = await getAccountInfo()
                if (account?.displayName) setAdminName(account.displayName)
                else if (account?.email) setAdminName(account.email.split('@')[0])
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
                toast.error('Network error. Could not load dashboard data.')
            } finally {
                setLoading(false)
            }
        }
        fetchDashboardData()
    }, [])

    const getTimeGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 18) return 'Good afternoon'
        return 'Good evening'
    }

    const handleDateClick = async (dateStr: string) => {
        if (dateStr === selectedDateStr) return
        setSelectedDateStr(dateStr)
        setLoadingSelected(true)
        try {
            const appts = await getAppointmentsForDateRange(dateStr, dateStr)
            setSelectedAppointments(appts)
        } catch (error) {
            console.error('Error fetching appointments for date:', error)
            toast.error('Network error. Could not load appointments for this date.')
        } finally {
            setLoadingSelected(false)
        }
    }

    // ── Upcoming week summary ──
    const upcomingWeekSummary = useMemo(() => {
        const counts: { dateStr: string; dayLabel: string; count: number }[] = []
        const now = new Date()
        for (let i = 0; i < 7; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
            const count = upcomingWeekAppointments.filter(a => a.appointment_date === ds).length
            counts.push({ dateStr: ds, dayLabel, count })
        }
        return counts
    }, [upcomingWeekAppointments])
    const maxWeekCount = Math.max(...upcomingWeekSummary.map(d => d.count), 1)
    const totalUpcoming = upcomingWeekAppointments.length

    // ── Calendar helpers (week view) ──
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    const currentDay = today.getDate()
    const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`

    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(currentYear, currentMonth, currentDay + mondayOffset)

    const weekCells: { day: number; month: number; year: number; dateStr: string; dayLabel: string }[] = []
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
        weekCells.push({
            day: d.getDate(),
            month: d.getMonth(),
            year: d.getFullYear(),
            dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        })
    }

    if (loading) {
        return <LoadingSpinner fullPage message="Loading dashboard…" />
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:h-full overflow-y-auto md:overflow-hidden">
            {/* ── Left Panel ── */}
            <div className="xl:col-span-3 flex flex-col gap-3 md:overflow-y-auto md:pr-2">

                {/* Greeting Section */}
                <div className="flex-shrink-0">
                    <h1 className="text-lg md:text-xl font-bold text-gray-900">
                        {getTimeGreeting()}, <span className="text-blue-600">Dr. {adminName}</span>
                    </h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Here&apos;s what&apos;s happening at your clinic today.
                    </p>
                </div>

                {/* Quick Actions - Prominent Section */}
                <div className="flex-shrink-0 flex items-center gap-2 md:gap-3">
                    <Link href="/patients?action=add" className="flex-1">
                        <Button
                            variant="outline"
                            className="w-full h-9 md:h-10 rounded-xl border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 hover:border-blue-300 text-blue-700 font-semibold transition-all text-xs md:text-sm"
                        >
                            <UserPlus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            <span className="hidden sm:inline">Add Patient</span>
                            <span className="sm:hidden">Add Patient</span>
                        </Button>
                    </Link>
                    <Link href="/patient-booking"
                        target="_blank"
                        rel="noopener noreferrer" className="flex-1">

                        <Button variant="primary" className='w-full h-9 md:h-10'>
                            <CalendarPlus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            <span className="hidden sm:inline">Book for Walk-in</span>
                            <span className="sm:hidden">Book for Walk-in</span>
                        </Button>
                    </Link>
                </div>

                {/* Stat Cards */}
                <div className="flex-shrink-0 grid grid-cols-3 gap-1.5 sm:gap-3 items-center">
                    {/* Patients */}
                    <Link href="/patients" className="flex-1">
                        <Card className="aspect-square sm:aspect-auto sm:h-full min-h-[90px] hover:shadow-md transition-shadow border border-blue-100 cursor-pointer bg-blue-50/30 group rounded-2xl sm:rounded-xl">
                            <CardContent className="p-2 sm:px-3 sm:py-1 md:p-3 md:py-1.5 flex flex-col justify-between h-full">

                                {/* Mobile */}
                                <div className="flex sm:hidden flex-col items-center justify-center text-center h-full w-full min-w-0 px-1">

                                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mb-1">
                                        <Users className="w-2.5 h-2.5 text-blue-600" />
                                    </div>

                                    <p className="text-[10px] font-semibold text-gray-700 text-center leading-snug break-words max-w-full px-1">
                                        Total<br />Patients
                                    </p>

                                    <p className="text-xl font-bold text-gray-900 leading-none">
                                        {stats?.totalPatients || 0}
                                    </p>

                                    <p className="w-full text-[9px] text-blue-600 font-medium flex items-center justify-start gap-0.5 mt-auto pt-1 pb-1">
                                        View more details <ChevronRight className="w-2 h-2" />
                                    </p>
                                </div>

                                {/* Desktop */}
                                <div className="hidden sm:flex items-start justify-between w-full">
                                    <p className="text-[10px] md:text-sm font-semibold text-gray-700 leading-tight">
                                        Total Patients
                                    </p>
                                    <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Users className="w-3 md:w-4 md:h-4 text-blue-600" />
                                    </div>
                                </div>

                                <div className="hidden sm:block mt-1 md:mt-2">
                                    <p className="text-xl md:text-4xl font-bold text-gray-900">
                                        {stats?.totalPatients || 0}
                                    </p>
                                    <p className="text-[9px] md:text-xs text-blue-600 font-medium mt-1 flex items-center gap-0.5">
                                        View more details <ChevronRight className="w-2 h-2 md:w-3 md:h-3" />
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Today's Appointments */}
                    <Link href="/appointments?view=day" className="flex-1">
                        <Card className="aspect-square sm:aspect-auto sm:h-full min-h-[90px] hover:shadow-md transition-shadow border border-blue-100 cursor-pointer bg-blue-50/30 group rounded-2xl sm:rounded-xl">
                            <CardContent className="p-2 sm:px-3 sm:py-1 md:p-3 md:py-1.5 flex flex-col justify-between h-full">

                                {/* Mobile */}
                                <div className="flex sm:hidden flex-col items-center justify-center text-center h-full w-full min-w-0 px-1">

                                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mb-1">
                                        <CalendarCheck className="w-2.5 h-2.5 text-blue-600" />
                                    </div>

                                    <p className="text-[10px] font-semibold text-gray-700 text-center leading-snug break-words max-w-full px-1">
                                        Today&apos;s<br />Appointments
                                    </p>

                                    <p className="text-xl font-bold text-gray-900 leading-none">
                                        {stats?.todayAppointmentsCount || 0}
                                    </p>

                                    <p className="w-full text-[9px] text-blue-600 font-medium flex items-center justify-start gap-0.5 mt-auto pt-1 pb-1">
                                        View more details <ChevronRight className="w-2 h-2" />
                                    </p>
                                </div>

                                {/* Desktop */}
                                <div className="hidden sm:flex items-start justify-between w-full">
                                    <p className="text-[10px] md:text-sm font-semibold text-gray-700 leading-tight">
                                        Today&apos;s Appointments
                                    </p>
                                    <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-blue-100 flex items-center justify-center">
                                        <CalendarCheck className="w-3 md:w-4 md:h-4 text-blue-600" />
                                    </div>
                                </div>

                                <div className="hidden sm:block mt-1 md:mt-2">
                                    <p className="text-xl md:text-4xl font-bold text-gray-900">
                                        {stats?.todayAppointmentsCount || 0}
                                    </p>
                                    <p className="text-[9px] md:text-xs text-blue-600 font-medium mt-1 flex items-center gap-0.5">
                                        View more details <ChevronRight className="w-2 h-2 md:w-3 md:h-3" />
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Total Appointments */}
                    <Link href="/appointments?view=calendar" className="flex-1">
                        <Card className="aspect-square sm:aspect-auto sm:h-full min-h-[90px] hover:shadow-md transition-shadow border border-blue-100 cursor-pointer bg-blue-50/30 group rounded-2xl sm:rounded-xl">
                            <CardContent className="p-2 sm:px-3 sm:py-1 md:p-3 md:py-1.5 flex flex-col justify-between h-full">

                                {/* Mobile */}
                                <div className="flex sm:hidden flex-col items-center justify-center text-center h-full w-full min-w-0 px-1">
                                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mb-1">
                                        <CalendarDays className="w-2.5 h-2.5 text-blue-600" />
                                    </div>
                                    <p className="text-[10px] font-semibold text-gray-700 text-center leading-snug break-words max-w-full px-1">
                                        Total<br />Appointments
                                    </p>

                                    <p className="text-xl font-bold text-gray-900 leading-none">
                                        {stats?.totalAppointments || 0}
                                    </p>

                                    <p className="w-full text-[9px] text-blue-600 font-medium flex items-center justify-start gap-0.5 mt-1">
                                        View more details <ChevronRight className="w-2 h-2" />
                                    </p>
                                </div>

                                {/* Desktop */}
                                <div className="hidden sm:flex items-start justify-between w-full">
                                    <p className="text-[10px] md:text-sm font-semibold text-gray-700 leading-tight">
                                        Total Appointments
                                    </p>
                                    <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-blue-100 flex items-center justify-center">
                                        <CalendarDays className="w-3 md:w-4 md:h-4 text-blue-600" />
                                    </div>
                                </div>

                                <div className="hidden sm:block mt-1 md:mt-2">
                                    <p className="text-xl md:text-4xl font-bold text-gray-900">
                                        {stats?.totalAppointments || 0}
                                    </p>
                                    <p className="text-[9px] md:text-xs text-blue-600 font-medium mt-1 flex items-center gap-0.5">
                                        View more details <ChevronRight className="w-2 h-2 md:w-3 md:h-3" />
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Upcoming Week Summary */}
                <Card className="flex-shrink-0 min-h-[180px] flex flex-col overflow-hidden border border-blue-100 bg-slate-50/50">
                    <CardHeader className="flex-shrink-0 flex flex-row items-start justify-between pb-1 pt-3 px-3 md:px-5">
                        <div>
                            <CardTitle className="text-sm font-semibold text-gray-800 tracking-tight">
                                Upcoming Week
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-500 mt-0.5">
                                {totalUpcoming} booking{totalUpcoming !== 1 ? 's' : ''} in the next 7 days
                            </CardDescription>
                        </div>
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <CalendarRange className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 min-h-0 px-3 md:px-5 pb-3 md:pb-4 pt-1">
                        <div className="h-full flex flex-col justify-end gap-2">
                            {/* Bars */}
                            <div className="flex-1 min-h-[80px] flex items-end gap-2 md:gap-3">
                                {upcomingWeekSummary.map((day, idx) => {
                                    const isToday = idx === 0
                                    const heightPct = day.count === 0 ? 8 : Math.max(12, Math.round((day.count / maxWeekCount) * 100))

                                    return (
                                        <div key={day.dateStr} className="flex-1 flex flex-col items-center justify-end h-full group">
                                            <span className={cn(
                                                "text-[10px] font-semibold mb-1 transition-opacity",
                                                day.count === 0 ? "opacity-0" : "opacity-100",
                                                isToday ? "text-blue-600" : "text-gray-400"
                                            )}>
                                                {day.count}
                                            </span>
                                            <div
                                                className={cn(
                                                    "w-full rounded-md transition-all duration-500",
                                                    isToday
                                                        ? "bg-blue-500"
                                                        : "bg-blue-200 group-hover:bg-blue-300"
                                                )}
                                                style={{ height: `${heightPct}%` }}
                                            />
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Day labels */}
                            <div className="flex-shrink-0 flex gap-2 md:gap-3">
                                {upcomingWeekSummary.map((day, idx) => {
                                    const isToday = idx === 0
                                    return (
                                        <div key={day.dateStr} className="flex-1 text-center">
                                            <span className={cn(
                                                "text-[10px] font-medium uppercase",
                                                isToday ? "text-blue-600 font-semibold" : "text-gray-400"
                                            )}>
                                                {day.dayLabel}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Right Panel — Today's Schedule ── */}
            <div className="xl:col-span-1 h-[450px] sm:h-[500px] md:h-full md:overflow-hidden flex flex-col min-h-0">
                <div className="bg-white flex flex-col h-full min-h-0 border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

                    {/* Week Calendar Header */}
                    <div className="flex-shrink-0 p-4 md:p-5 pb-3 md:pb-4 border-b border-gray-100">
                        <div className="flex items-center justify-center mb-3 md:mb-4">
                            <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                                {(() => {
                                    const [y, m, d] = selectedDateStr.split('-').map(Number)
                                    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                })()}
                            </div>
                        </div>

                        {/* Week row */}
                        <div className="grid grid-cols-7 gap-1">
                            {weekCells.map((cell) => {
                                const isTodayNode = cell.dateStr === todayStr
                                const isSelected = cell.dateStr === selectedDateStr
                                const hasAppointment = appointmentDates.has(cell.dateStr)

                                return (
                                    <button 
                                        key={cell.dateStr} 
                                        onClick={() => handleDateClick(cell.dateStr)}
                                        className="flex flex-col items-center py-1 cursor-pointer focus:outline-none group rounded-md hover:bg-gray-50/50 transition-colors"
                                    >
                                        <span className={cn(
                                            "text-[9px] font-medium mb-1",
                                            isSelected ? "text-blue-600" : "text-gray-400"
                                        )}>
                                            {cell.dayLabel}
                                        </span>
                                        <div className={cn(
                                            "w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-xs font-medium rounded-full transition-colors",
                                            isSelected
                                                ? "bg-blue-600 text-white font-semibold shadow-sm"
                                                : isTodayNode
                                                    ? "bg-blue-100 text-blue-700 font-semibold"
                                                    : "text-gray-500 group-hover:bg-gray-100"
                                        )}>
                                            {cell.day}
                                        </div>
                                        <div className="h-1 flex items-center justify-center mt-0.5">
                                            {hasAppointment && (
                                                <div className={cn(
                                                    "w-1 h-1 rounded-full",
                                                    isSelected ? "bg-blue-200" : "bg-blue-400"
                                                )} />
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-3 md:mt-4">
                            <Button
                                variant="outline"
                                className="w-full rounded-lg text-xs md:text-sm h-8 md:h-9 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                asChild
                            >
                                <Link href="/appointments?view=calendar">View Full Calendar</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Selected Date's Timeline */}
                    <div className="flex-1 min-h-0 flex flex-col p-4 md:p-5 pt-3 md:pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm md:text-base font-semibold text-gray-900">
                                    {(() => {
                                        const [y, m, d] = selectedDateStr.split('-').map(Number)
                                        return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                    })()}
                                </h3>

                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loadingSelected ? (
                                <LoadingSpinner message="Loading appointments…" className="py-8" />
                            ) : selectedAppointments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-8">
                                    <p className="text-sm font-medium text-gray-400">
                                        {selectedDateStr === todayStr ? 'No appointments today' : 'No appointments for this day'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedAppointments.map((apt, index) => {
                                        // Alternating blue shades for visual distinction
                                        const isEven = index % 2 === 0
                                        const bgColor = isEven ? "bg-blue-50" : "bg-slate-50"
                                        const accentColor = isEven ? "bg-blue-500" : "bg-blue-400"

                                        const timeParts = apt.appointment_time.split(' ')
                                        const timeDisplay = timeParts.length >= 2
                                            ? `${timeParts[0]} ${timeParts[1]}`
                                            : timeParts[0]

                                        return (
                                            <div key={apt.appointment_id} className={cn("rounded-xl p-3 transition-colors hover:bg-blue-100/50", bgColor)}>
                                                <div className="flex items-start gap-2.5">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-gray-900 truncate">
                                                            {apt.patient_name}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500 truncate mt-0.5 italic">
                                                            {apt.purpose || 'No Notes Added'}
                                                        </p>
                                                        <p className="text-[10px] font-medium text-blue-600 mt-1">
                                                            {timeDisplay}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}