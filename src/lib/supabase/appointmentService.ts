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

    // Check booking limit: max 2 per day per phone number
    const { data: phoneBookings, error: limitError } = await supabase
        .from('appointment')
        .select('appointment_id')
        .eq('appointment_date', data.appointment_date)
        .eq('phone_number', data.phone_number)

    if (limitError) {
        console.error('Error checking booking limit:', limitError.message)
        throw new Error('CHECK_FAILED')
    }

    if (phoneBookings && phoneBookings.length >= 2) {
        throw new Error('BOOKING_LIMIT')
    }

    // Check if the slot is already taken
    const { data: existing, error: checkError } = await supabase
        .from('appointment')
        .select('appointment_id')
        .eq('appointment_date', data.appointment_date)
        .eq('appointment_time', dbTime)
        .limit(1)

    if (checkError) {
        console.error('Error checking slot:', checkError.message)
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

// ─── Get full appointment details for a single date ─────────

export async function getAppointmentsForDate(date: string): Promise<Appointment[]> {
    const { data, error } = await supabase
        .from('appointment')
        .select('*')
        .eq('appointment_date', date)
        .order('appointment_time', { ascending: true })

    if (error) {
        console.error('Error fetching appointments:', error)
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

// ─── Get appointments for a date range (week view + calendar counts) ─

export async function getAppointmentsForDateRange(
    startDate: string,
    endDate: string
): Promise<Appointment[]> {
    const { data, error } = await supabase
        .from('appointment')
        .select('*')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_time', { ascending: true })

    if (error) {
        console.error('Error fetching appointments for range:', error)
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

// ─── Delete an appointment ──────────────────────────────────

export async function deleteAppointment(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('appointment')
        .delete()
        .eq('appointment_id', id)

    if (error) {
        console.error('Error deleting appointment:', error.message)
        return false
    }
    return true
}

// ─── Unavailable Slots ──────────────────────────────────────

export interface UnavailableSlot {
    id: string
    date: string
    time_slot: string | null  // null = entire day
}

export async function getUnavailableSlots(date: string): Promise<UnavailableSlot[]> {
    const { data, error } = await supabase
        .from('unavailable_slots')
        .select('id, date, time_slot')
        .eq('date', date)

    if (error) {
        console.error('Error fetching unavailable slots:', error.message)
        return []
    }
    return data || []
}

export async function getUnavailableSlotsForRange(
    startDate: string,
    endDate: string
): Promise<UnavailableSlot[]> {
    const { data, error } = await supabase
        .from('unavailable_slots')
        .select('id, date, time_slot')
        .gte('date', startDate)
        .lte('date', endDate)

    if (error) {
        console.error('Error fetching unavailable slots range:', error.message)
        return []
    }
    return data || []
}

export async function setSlotUnavailable(date: string, timeSlot?: string): Promise<boolean> {
    const { error } = await supabase
        .from('unavailable_slots')
        .insert({ date, time_slot: timeSlot || null })

    if (error) {
        console.error('Error setting slot unavailable:', error.message)
        return false
    }
    return true
}

export async function removeSlotUnavailable(date: string, timeSlot?: string): Promise<boolean> {
    let query = supabase
        .from('unavailable_slots')
        .delete()
        .eq('date', date)

    if (timeSlot) {
        query = query.eq('time_slot', timeSlot)
    } else {
        query = query.is('time_slot', null)
    }

    const { error } = await query

    if (error) {
        console.error('Error removing unavailable slot:', error.message)
        return false
    }
    return true
}

