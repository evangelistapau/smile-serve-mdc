export interface PatientHistory {
    id: string
    patient_id: string            // References patient.id (UUID)
    service?: string
    notes?: string
    date?: string
    created_at?: string
}
