export interface Appointment {
    appointment_id?: string
    patient_name: string
    patient_email: string
    phone_number: string
    appointment_date: string   // YYYY-MM-DD
    appointment_time: string   // e.g. "10:00 AM"
    purpose?: string
    created_at?: string
}
