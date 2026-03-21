import { supabase } from './client'

// ─── Types ───────────────────────────────────────────────────

export interface SmsSettings {
    senderNumber: string
    confirmedBookingMessage: string
    reminderMessage: string
}

const DEFAULT_SETTINGS: SmsSettings = {
    senderNumber: '',
    confirmedBookingMessage:
        'Good day {patient_name}, your appointment at Modern Dentistry Clinic is confirmed for {appointment_date} at {appointment_time}. If you need to reschedule, please call or text at least 1 day in advance, or 2 hours before your appointment. Thank you and keep safe!',
    reminderMessage:
        'Hi {patient_name}, reminder: your appointment at {appointment_time} today is in 5 hours. See you soon!',
}

// ─── Get SMS Settings ────────────────────────────────────────

export async function getSmsSettings(): Promise<SmsSettings> {
    const { data, error } = await supabase
        .from('sms_settings')
        .select('sender_number, confirmed_booking_message, reminder_message')
        .eq('id', 1)
        .single()

    if (error || !data) {
        console.error('Error fetching SMS settings:', error?.message)
        return DEFAULT_SETTINGS
    }

    return {
        senderNumber: data.sender_number || DEFAULT_SETTINGS.senderNumber,
        confirmedBookingMessage: data.confirmed_booking_message || DEFAULT_SETTINGS.confirmedBookingMessage,
        reminderMessage: data.reminder_message || DEFAULT_SETTINGS.reminderMessage,
    }
}

// ─── Save SMS Settings ──────────────────────────────────────

export async function saveSmsSettings(settings: SmsSettings): Promise<boolean> {
    const { error } = await supabase
        .from('sms_settings')
        .upsert({
            id: 1,
            sender_number: settings.senderNumber,
            confirmed_booking_message: settings.confirmedBookingMessage,
            reminder_message: settings.reminderMessage,
        })

    if (error) {
        console.error('Error saving SMS settings:', error.message)
        return false
    }
    return true
}

// ─── Send Booking Confirmation SMS ──────────────────────────

export async function sendBookingConfirmationSms(
    patientName: string,
    patientPhone: string,
    appointmentDate: string,
    appointmentTime: string
): Promise<boolean> {
    try {
        const res = await fetch('/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'booking_confirmation',
                patientName,
                patientPhone,
                appointmentDate,
                appointmentTime,
            }),
        })

        if (!res.ok) {
            console.error('SMS send failed with status:', res.status)
            return false
        }

        console.log('Booking confirmation SMS sent successfully')
        return true
    } catch (err) {
        console.error('Error sending booking confirmation SMS:', err)
        return false
    }
}

// ─── SMS Logs ────────────────────────────────────────────────

export interface SmsLog {
    id: string
    message_id: string
    patient_name: string | null
    patient_phone: string
    message_type: string           // 'confirmation' | 'reminder'
    content: string | null
    status: string                 // 'pending' | 'sent' | 'failed'
    sent_at: string
    updated_at: string
}

export async function getSmsLogs(limit = 50): Promise<SmsLog[]> {
    const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching SMS logs:', error.message)
        return []
    }
    return data as SmsLog[]
}

// ─── Send Booking Reminder SMS (scheduled 5h before) ────────

export async function sendBookingReminderSms(
    patientName: string,
    patientPhone: string,
    appointmentDate: string,
    appointmentTime: string,
    appointmentDateISO: string   // YYYY-MM-DD for send_at computation
): Promise<boolean> {
    try {
        const res = await fetch('/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'booking_reminder',
                patientName,
                patientPhone,
                appointmentDate,
                appointmentTime,
                appointmentDateISO,
            }),
        })

        if (!res.ok) {
            console.error('Reminder SMS scheduling failed with status:', res.status)
            return false
        }

        console.log('Booking reminder SMS scheduled successfully')
        return true
    } catch (err) {
        console.error('Error scheduling booking reminder SMS:', err)
        return false
    }
}

