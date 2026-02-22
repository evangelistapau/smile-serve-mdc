export interface Patient {
    id?: string           // UUID primary key (was patient_id)
    patient_id?: string   // Human-readable display ID (e.g. PT-2026-1)
    first_name: string
    middle_name?: string  //optional
    last_name: string
    email?: string
    phone?: string
    address?: string
    gender?: string
    age?: number
    occupation?: string
    marital_status?: string
    last_visit?: string
    created_at?: string
}

