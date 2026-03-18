'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
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
    CalendarCheck, 
    CalendarDays, 
    ChevronRight,
    TrendingUp,
    Clock,
    User
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
                    getUpcomingAppointments(10), // Show more upcoming in the main area
                    getWeeklyActivity()
                ])

                setStats(statsRes)
                setTodayAppointments(todayRes)
                setUpcomingAppointments(upcomingRes)
                setWeeklyActivity(weeklyRes)

                // Get admin name from profiles table (via settingsService)
                const account = await getAccountInfo()
                if (account?.displayName) {
                    setAdminName(account.displayName)
                } else if (account?.email) {
                    setAdminName(account.email.split('@')[0])
                }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header Greeting */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{getTimeGreeting()}, Dr. {adminName}</h1>
                <p className="text-gray-500 mt-1">Here is what's happening at your clinic today.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                    <Link href="/patients" className="no-underline text-inherit h-full">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">No. of Patients</CardTitle>
                            <Users className="w-5 h-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-extrabold text-gray-900">{stats?.totalPatients || 0}</div>
                            <div className="flex items-center mt-2 text-xs text-blue-600 font-medium">
                                See all patients <ChevronRight className="w-3 h-3 ml-1" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-lg border-none relative overflow-hidden">
                    <Link href="/appointments" className="no-underline text-inherit h-full block p-1">
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <CalendarCheck className="w-24 h-24" />
                        </div>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-blue-100 uppercase tracking-wider">Today's Appointment</CardTitle>
                            <Clock className="w-5 h-5 text-blue-200" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-extrabold">{stats?.todayAppointmentsCount || 0}</div>
                            <div className="flex items-center mt-2 text-xs text-blue-100 font-medium font-bold">
                                CHECK TODAY'S SCHEDULE <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Weekly Activity & Upcoming Appointments */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Weekly Activity Graph */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold">Weekly Appointments</CardTitle>
                                <CardDescription>Number of appointments in the last 7 days</CardDescription>
                            </div>
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                        </CardHeader>
                        <CardContent className="pt-4 overflow-visible">
                            <div className="h-64 w-full relative">
                                {/* SVG Line */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                                    <polyline
                                        fill="none"
                                        stroke="#2563eb"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={weeklyActivity.map((day, idx) => {
                                            const maxCount = Math.max(...weeklyActivity.map(d => d.count), 5)
                                            const x = (idx / (weeklyActivity.length - 1)) * 100
                                            const y = 100 - (day.count / maxCount) * 100
                                            // Scale to parent width/height
                                            return `${x}%,${y}%`
                                        }).join(' ')}
                                        style={{ vectorEffect: 'non-scaling-stroke' }}
                                    />
                                    {/* SVG Points */}
                                    {weeklyActivity.map((day, idx) => {
                                        const maxCount = Math.max(...weeklyActivity.map(d => d.count), 5)
                                        const x = (idx / (weeklyActivity.length - 1)) * 100
                                        const y = 100 - (day.count / maxCount) * 100
                                        return (
                                            <circle 
                                                key={`dot-${idx}`} 
                                                cx={`${x}%`} 
                                                cy={`${y}%`} 
                                                r="4" 
                                                className="fill-blue-600 stroke-white stroke-2" 
                                            />
                                        )
                                    })}
                                </svg>
                                
                                <div className="absolute inset-0 flex items-end justify-around gap-2 px-2 pb-6">
                                    {weeklyActivity.map((day, idx) => {
                                        const maxCount = Math.max(...weeklyActivity.map(d => d.count), 5)
                                        const heightPercent = (day.count / maxCount) * 100
                                        const isToday = idx === weeklyActivity.length - 1
                                        
                                        return (
                                            <div key={day.date} className="flex flex-col items-center flex-1 group relative h-full justify-end">
                                                {/* Tooltip */}
                                                <div className="absolute -top-8 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                                    {day.count} appointments
                                                </div>
                                                {/* Bar */}
                                                <div 
                                                    className={cn(
                                                        "w-full max-w-[30px] rounded-t-lg transition-all duration-500 ease-out opacity-20",
                                                        isToday ? "bg-blue-600" : "bg-blue-400 group-hover:bg-blue-500"
                                                    )}
                                                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                                                ></div>
                                                <span className={cn(
                                                    "absolute -bottom-6 text-[10px] font-bold uppercase",
                                                    isToday ? "text-blue-600" : "text-gray-400"
                                                )}>{day.dayName}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Appointments List */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold">Upcoming Appointments</CardTitle>
                                <CardDescription>Scheduled visits for the next few days</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/appointments" className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
                                    SEE CALENDAR <CalendarDays className="w-4 h-4" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {upcomingAppointments.length === 0 ? (
                                    <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                                        No upcoming appointments scheduled.
                                    </div>
                                ) : (
                                    upcomingAppointments.map((apt) => (
                                        <div key={apt.appointment_id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
                                            <div className="w-24 text-center">
                                                <span className="text-xs font-bold text-blue-600 block uppercase">
                                                    {new Date(apt.appointment_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] text-gray-500 uppercase">{apt.appointment_time}</span>
                                            </div>
                                            <div className="h-10 w-px bg-gray-200"></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-gray-900 truncate">{apt.patient_name}</h4>
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full uppercase">Scheduled</span>
                                                </div>
                                                <p className="text-sm text-gray-500 truncate">{apt.purpose || 'Dental Check-up'}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Content: Today's Appointments Details */}
                <div className="space-y-8">
                    <Card className="h-full border-blue-100 bg-blue-50/10">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-blue-50 pb-4 mb-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-900">Today's List</CardTitle>
                                <CardDescription className="text-blue-600 font-medium">Schedule for today</CardDescription>
                            </div>
                            <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                                {todayAppointments.length}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {todayAppointments.length === 0 ? (
                                    <div className="py-8 text-center text-gray-500">
                                        No appointments today.
                                    </div>
                                ) : (
                                    todayAppointments.map((apt) => (
                                        <div key={apt.appointment_id} className="relative pl-6 border-l-2 border-blue-500 pb-2">
                                            <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-50"></div>
                                            <div className="mb-1">
                                                <span className="text-xs font-bold text-blue-700 uppercase">
                                                    {apt.appointment_time}
                                                </span>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{apt.patient_name}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate font-medium">{apt.purpose || 'Check-up'}</p>
                                            </div>
                                        </div>
                                    ))
                                )}

                                <Button variant="outline" className="w-full mt-4 border-dashed border-2 bg-white hover:bg-blue-50 hover:border-blue-300 text-blue-600 font-bold py-6 group" asChild>
                                    <Link href="/appointments" className="flex items-center justify-center gap-2">
                                        <CalendarCheck className="w-5 h-5" />
                                        <span>SEE FULL SCHEDULE</span>
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}