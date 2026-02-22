export interface Patient {
    id?: string           // UUID primary key (was patient_id)
    patient_id?: string   // Human-readable display ID (e.g. PT-2026-1)
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
    id: string            // References patient.id (UUID)
    notes?: string
    date?: string
    created_at?: string
}
