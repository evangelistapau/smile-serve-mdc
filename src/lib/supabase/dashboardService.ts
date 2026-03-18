import { supabase } from './client'
import { Appointment } from '@/types/appointment'
import { toDisplayTime } from './appointmentService'

export interface DashboardStats {
    totalPatients: number
    totalAppointments: number
    todayAppointmentsCount: number
}

export interface WeeklyActivity {
    date: string
    dayName: string
    count: number
}

/**
 * Get overall statistics for the dashboard.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    const today = new Date().toISOString().split('T')[0]

    const [patientsRes, appointmentsRes, todayRes] = await Promise.all([
        supabase.from('patient').select('*', { count: 'exact', head: true }),
        supabase.from('appointment').select('*', { count: 'exact', head: true }),
        supabase.from('appointment').select('*', { count: 'exact', head: true }).eq('appointment_date', today)
    ])

    return {
        totalPatients: patientsRes.count || 0,
        totalAppointments: appointmentsRes.count || 0,
        todayAppointmentsCount: todayRes.count || 0
    }
}

/**
 * Get appointments for today.
 */
export async function getTodayAppointments(): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
        .from('appointment')
        .select('*')
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true })

    if (error) {
        console.error('Error fetching today\'s appointments:', error)
        return []
    }

    return (data || []).map((row) => ({
        appointment_id: row.appointment_id,
        patient_name: row.patient_name,
        patient_email: row.patient_email || '',
        phone_number: row.phone_number || '',
        appointment_date: row.appointment_date,
        appointment_time: toDisplayTime(row.appointment_time),
        purpose: row.purpose || '',
        created_at: row.created_at,
    }))
}

/**
 * Get upcoming appointments (excluding today).
 * Limited to next 5 for the dashboard preview.
 */
export async function getUpcomingAppointments(limit = 5): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
        .from('appointment')
        .select('*')
        .gt('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(limit)

    if (error) {
        console.error('Error fetching upcoming appointments:', error)
        return []
    }

    return (data || []).map((row) => ({
        appointment_id: row.appointment_id,
        patient_name: row.patient_name,
        patient_email: row.patient_email || '',
        phone_number: row.phone_number || '',
        appointment_date: row.appointment_date,
        appointment_time: toDisplayTime(row.appointment_time),
        purpose: row.purpose || '',
        created_at: row.created_at,
    }))
}

/**
 * Get appointment counts for the last 7 days for the chart.
 */
export async function getWeeklyActivity(): Promise<WeeklyActivity[]> {
    const activity: WeeklyActivity[] = []
    const now = new Date()
    
    // Get dates for the last 7 days
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(now.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
        
        const { count, error } = await supabase
            .from('appointment')
            .select('*', { count: 'exact', head: true })
            .eq('appointment_date', dateStr)
            
        activity.push({
            date: dateStr,
            dayName: dayName,
            count: count || 0
        })
    }
    
    return activity
}
