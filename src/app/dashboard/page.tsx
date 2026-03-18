'use client'

import { useEffect, useState } from 'react'
import { Appointment } from '@/types/appointment'
import {
    getDashboardStats,
    getTodayAppointments,
    getUpcomingAppointments,
    getWeeklyActivity,
    DashboardStats,
    WeeklyActivity
} from '@/lib/supabase/dashboardService'
import { getAccountInfo } from '@/lib/supabase/settingsService'
import {
    Users,
    CalendarDays,
    ChevronRight,
    TrendingUp,
    Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
    const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([])
    const [adminName, setAdminName] = useState('Admin')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true)
            try {
                const [statsRes, todayRes, upcomingRes, weeklyRes] = await Promise.all([
                    getDashboardStats(),
                    getTodayAppointments(),
                    getUpcomingAppointments(10),
                    getWeeklyActivity()
                ])
                setStats(statsRes)
                setTodayAppointments(todayRes)
                setUpcomingAppointments(upcomingRes)
                setWeeklyActivity(weeklyRes)

                const account = await getAccountInfo()
                if (account?.displayName) setAdminName(account.displayName)
                else if (account?.email) setAdminName(account.email.split('@')[0])
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
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

    const maxCount = Math.max(...weeklyActivity.map(d => d.count), 1)

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
        )
    }

    return (
        // Fixed full-height layout — no page scroll
        <div className="flex flex-col h-full overflow-hidden gap-5">

            {/* ── Greeting ── */}
            <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">
                    {getTimeGreeting()}, <span className="text-blue-600">Dr. {adminName}</span>
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">Here's what's happening at your clinic today.</p>
            </div>

            {/* ── Stat Cards ── */}
            <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Patients */}
                <Link href="/patients">
                    <Card className="hover:shadow-md transition-shadow border border-gray-100 cursor-pointer">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Total Patients</p>
                                <p className="text-4xl font-extrabold text-gray-900">{stats?.totalPatients || 0}</p>
                                <p className="text-xs text-blue-500 font-medium mt-1 flex items-center gap-0.5">
                                    See all <ChevronRight className="w-3 h-3" />
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Upcoming */}
                <Link href="/appointments">
                    <Card className="hover:shadow-md transition-shadow border border-gray-100 cursor-pointer">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Upcoming</p>
                                <p className="text-4xl font-extrabold text-gray-900">{upcomingAppointments.length}</p>
                                <p className="text-xs text-indigo-500 font-medium mt-1 flex items-center gap-0.5">
                                    See calendar <ChevronRight className="w-3 h-3" />
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <CalendarDays className="w-6 h-6 text-indigo-500" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* ── Main content row — fills remaining height ── */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Weekly chart — left 2/3 */}
                <Card className="lg:col-span-2 flex flex-col overflow-hidden border border-gray-100">
                    <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between pb-2 pt-5 px-5">
                        <div>
                            <CardTitle className="text-sm font-bold text-gray-800">Weekly Appointments</CardTitle>
                            <CardDescription className="text-xs text-gray-400 mt-0.5">Last 7 days</CardDescription>
                        </div>
                        <TrendingUp className="w-4 h-4 text-gray-300" />
                    </CardHeader>

                    <CardContent className="flex-1 min-h-0 px-5 pb-5 pt-2">
                        <div className="h-full flex flex-col justify-end gap-3">
                            {/* Bars */}
                            <div className="flex-1 flex items-end gap-2">
                                {weeklyActivity.map((day, idx) => {
                                    const isToday = idx === weeklyActivity.length - 1
                                    const heightPct = day.count === 0 ? 4 : Math.round((day.count / maxCount) * 100)

                                    return (
                                        <div key={day.date} className="flex-1 flex flex-col items-center justify-end h-full group">
                                            {/* Count label above bar */}
                                            <span className={cn(
                                                "text-[10px] font-bold mb-1 transition-opacity",
                                                day.count === 0 ? "opacity-0" : "opacity-100",
                                                isToday ? "text-blue-600" : "text-gray-400"
                                            )}>
                                                {day.count}
                                            </span>
                                            {/* Bar */}
                                            <div
                                                className={cn(
                                                    "w-full rounded-t-md transition-all duration-500",
                                                    isToday
                                                        ? "bg-blue-500"
                                                        : "bg-gray-100 group-hover:bg-blue-200"
                                                )}
                                                style={{ height: `${heightPct}%` }}
                                            />
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Day labels */}
                            <div className="flex-shrink-0 flex gap-2">
                                {weeklyActivity.map((day, idx) => {
                                    const isToday = idx === weeklyActivity.length - 1
                                    return (
                                        <div key={day.date} className="flex-1 text-center">
                                            <span className={cn(
                                                "text-[10px] font-semibold uppercase",
                                                isToday ? "text-blue-600" : "text-gray-400"
                                            )}>
                                                {day.dayName}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Today's List — right 1/3, fixed height + scrollable list */}
                <Card className="flex flex-col overflow-hidden border border-gray-100">
                    {/* Fixed header */}
                    <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between pb-3 pt-5 px-5 border-b border-gray-50">
                        <div>
                            <CardTitle className="text-sm font-bold text-gray-800">Today's List</CardTitle>
                            <CardDescription className="text-xs text-gray-400 mt-0.5">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </CardDescription>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0">
                            {todayAppointments.length}
                        </div>
                    </CardHeader>

                    {/* Scrollable list */}
                    <CardContent className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-1">
                        {todayAppointments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-8">
                                <Clock className="w-8 h-8 text-gray-200 mb-2" />
                                <p className="text-sm text-gray-400">No appointments today.</p>
                            </div>
                        ) : (
                            todayAppointments.map((apt) => (
                                <div
                                    key={apt.appointment_id}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {/* Time pill */}
                                    <span className="flex-shrink-0 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md whitespace-nowrap">
                                        {apt.appointment_time}
                                    </span>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{apt.patient_name}</p>
                                        <p className="text-xs text-gray-400 truncate">{apt.purpose || 'Check-up'}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>

                    {/* Fixed footer */}
                    <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-gray-50">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs font-semibold text-blue-600 border-blue-100 hover:bg-blue-50 hover:border-blue-200"
                            asChild
                        >
                            <Link href="/appointments?view=day">See Full Schedule</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    )
}