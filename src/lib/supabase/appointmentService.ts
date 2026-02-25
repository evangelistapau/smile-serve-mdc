import { supabase } from './client'
import { Appointment } from '@/types/appointment'

// ─── Time format converters ──────────────────────────────────
// Supabase `time` column stores "09:00:00" (24-hour)
// UI displays "9:00 AM" (12-hour)

/** Convert display time "9:00 AM" → DB time "09:00:00" */
export function toDbTime(display: string): string {
    const [timeStr, period] = display.split(' ')
    const [hours, minutes] = timeStr.split(':').map(Number)
    let h = hours
    if (period === 'PM' && hours !== 12) h += 12
    else if (period === 'AM' && hours === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
}

/** Convert DB time "09:00:00" → display time "9:00 AM" */
export function toDisplayTime(dbTime: string): string {
    const [hStr, mStr] = dbTime.split(':')
    let h = parseInt(hStr, 10)
    const m = mStr
    const period = h >= 12 ? 'PM' : 'AM'
    if (h === 0) h = 12
    else if (h > 12) h -= 12
    return `${h}:${m} ${period}`
}

/**
 * Get only booked time slots for a given date.
 * Returns times in display format ("9:00 AM").
 */
export async function getBookedTimeSlots(date: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('appointment')
        .select('appointment_time')
        .eq('appointment_date', date)

    if (error) {
        console.error('Error fetching booked slots:', error)
        return []
    }

    return (data || []).map((a) => toDisplayTime(a.appointment_time))
}

/**
 * Create a new appointment (with slot conflict check).
 * Accepts display-format time ("9:00 AM") and converts to DB format.
 */


// SHOULD I DO THE SLOT CONFLICT CHECK PA?
export async function createAppointment(
    data: Omit<Appointment, 'appointment_id' | 'created_at'>
) {
    const dbTime = toDbTime(data.appointment_time)

    // Check if the slot is already taken
    const { data: existing, error: checkError } = await supabase
        .from('appointment')
        .select('appointment_id')
        .eq('appointment_date', data.appointment_date)
        .eq('appointment_time', dbTime)
        .limit(1)

    if (checkError) {
        console.error('Error checking slot:', checkError)
        throw new Error('CHECK_FAILED')
    }

    if (existing && existing.length > 0) {
        throw new Error('SLOT_TAKEN')
    }

    const { error: insertError } = await supabase
        .from('appointment')
        .insert({
            patient_name: data.patient_name,
            patient_email: data.patient_email,
            phone_number: data.phone_number,
            appointment_date: data.appointment_date,
            appointment_time: dbTime,
            purpose: data.purpose || '',
        })

    if (insertError) {
        console.error('Error creating appointment:', insertError)
        throw new Error('INSERT_FAILED')
    }
}

/**
 * Check if all time slots are booked for a date.
 */
export async function isDateFullyBooked(
    date: string,
    allTimeSlots: string[]
): Promise<boolean> {
    const bookedSlots = await getBookedTimeSlots(date)
    return bookedSlots.length >= allTimeSlots.length
}

/**
 * Check if the current time is past the last operating slot (for today only).
 */
export function isPastOperatingHours(date: Date, lastTimeSlot: string): boolean {
    const today = new Date()
    if (date.toDateString() !== today.toDateString()) return false

    const [time, period] = lastTimeSlot.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    let slotHour = hours

    if (period === 'PM' && hours !== 12) slotHour += 12
    else if (period === 'AM' && hours === 12) slotHour = 0

    const currentHour = today.getHours()
    const currentMinute = today.getMinutes()

    return currentHour > slotHour || (currentHour === slotHour && currentMinute > minutes)
}


// FOR WHAT IS THIS?
/**
 * Get all distinct dates that have at least one appointment in a given month.
 * Returns an array of date strings (YYYY-MM-DD).
 */
export async function getAppointmentDatesForMonth(
    year: number,
    month: number // 0-indexed (0 = January)
): Promise<string[]> {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data, error } = await supabase
        .from('appointment')
        .select('appointment_date')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)

    if (error) {
        console.error('Error fetching appointment dates:', error)
        return []
    }

    // Return unique dates
    const dates = (data || []).map((a) => a.appointment_date)
    return [...new Set(dates)]
}
