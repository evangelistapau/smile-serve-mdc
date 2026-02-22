export interface PatientHistory {
    history_id?: string
    id: string            // References patient.id (UUID)
    notes?: string
    date?: string
    created_at?: string
}
