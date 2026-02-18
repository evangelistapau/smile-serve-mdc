export interface Patient {
    patient_id?: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    date_of_birth?: string
    address?: string
    gender?: string
    age?: number
    occupation?: string
    marital_status?: string
    last_visit?: string
    created_at?: string
}

export interface PatientHistory {
    history_id?: string
    patient_id: string
    notes?: string
    date?: string
    created_at?: string
}
