export interface PatientHistory {
    id: string
    patient_id: string            // References patient.id (UUID)
    service?: string
    notes?: string
    date?: string
    amount?: number
    payment_method?: string
    payment_status?: string
    created_at?: string
}
