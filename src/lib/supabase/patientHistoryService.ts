import { supabase } from './client'
import { PatientHistory } from '../../types/patient_history'

// ─── PATIENT HISTORY CRUD ───────────────────────────────────────────────────

/**
 * Fetch all history records for a given patient, ordered by date descending.
 */
export async function getPatientHistory(
    patientUuid: string
): Promise<{ data: PatientHistory[] | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient_history')
        .select('*')
        .eq('patient_id', patientUuid)
        .order('date', { ascending: false })

    return {
        data: data as PatientHistory[] | null,
        error: error ? error.message : null,
    }
}

/**
 * Insert a new history record for a patient.
 * Also updates the patient's `last_visit` to the history date.
 */
export async function createPatientHistory(
    history: Omit<PatientHistory, 'id' | 'created_at'>
): Promise<{ data: PatientHistory | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient_history')
        .insert([history])
        .select()
        .single()

    if (error) {
        return { data: null, error: error.message }
    }

    // Update the patient's last_visit to the latest history date
    const { data: latestHistory } = await supabase
        .from('patient_history')
        .select('date')
        .eq('patient_id', history.patient_id)
        .order('date', { ascending: false })
        .limit(1)
        .single()

    if (latestHistory?.date) {
        await supabase
            .from('patient')
            .update({ last_visit: latestHistory.date })
            .eq('id', history.patient_id)
    }

    return {
        data: data as PatientHistory | null,
        error: null,
    }
}

/**
 * Update a patient history record by its id.
 */
export async function updatePatientHistory(
    historyId: string,
    updates: Partial<Omit<PatientHistory, 'id' | 'created_at'>>
): Promise<{ data: PatientHistory | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient_history')
        .update(updates)
        .eq('id', historyId)
        .select()
        .single()

    return {
        data: data as PatientHistory | null,
        error: error ? error.message : null,
    }
}

/**
 * Delete a patient history record by its id.
 */
export async function deletePatientHistory(
    historyId: string
): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from('patient_history')
        .delete()
        .eq('id', historyId)

    return {
        error: error ? error.message : null,
    }
}
