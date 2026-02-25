import { supabase } from './client'
import { Patient } from '../../types/patient'

// ─── PATIENT CRUD ───────────────────────────────────────────────────────────

/**
 * Fetch all patients from the "patient" table, ordered by created_at descending.
 */
export async function getPatients(): Promise<{ data: Patient[] | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient')
        .select('*')
        .order('created_at', { ascending: false })

    return {
        data: data as Patient[] | null,
        error: error ? error.message : null,
    }
}

/**
 * Fetch a single patient by id (UUID).
 */
export async function getPatientById(
    id: string
): Promise<{ data: Patient | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient')
        .select('*')
        .eq('id', id)
        .single()

    return {
        data: data as Patient | null,
        error: error ? error.message : null,
    }
}

/**
 * Generate the next display patient_id in the format PT-YYYY-N.
 */
async function generateDisplayId(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `PT-${year}-`

    // Get the highest existing display ID for this year
    const { data } = await supabase
        .from('patient')
        .select('patient_id')
        .like('patient_id', `${prefix}%`)
        .order('patient_id', { ascending: false })
        .limit(1)

    let nextNum = 1
    if (data && data.length > 0 && data[0].patient_id) {
        const lastNum = parseInt(data[0].patient_id.replace(prefix, ''), 10)
        if (!isNaN(lastNum)) {
            nextNum = lastNum + 1
        }
    }

    return `${prefix}${nextNum}`
}

/**
 * Insert a new patient into the "patient" table.
 * Auto-generates patient_id (display ID) and sets last_visit to today.
 */
export async function createPatient(
    patient: Omit<Patient, 'id' | 'patient_id' | 'created_at'>
): Promise<{ data: Patient | null; error: string | null }> {
    const displayId = await generateDisplayId()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('patient')
        .insert([{
            ...patient,
            patient_id: displayId,
            last_visit: patient.last_visit || today,
        }])
        .select()
        .single()

    return {
        data: data as Patient | null,
        error: error ? error.message : null,
    }
}

/**
 * Update an existing patient by id (UUID).
 */
export async function updatePatient(
    id: string,
    updates: Partial<Omit<Patient, 'id' | 'patient_id' | 'created_at'>>
): Promise<{ data: Patient | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    return {
        data: data as Patient | null,
        error: error ? error.message : null,
    }
}

/**
 * Delete a patient by id (UUID).
 */
export async function deletePatient(
    id: string
): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from('patient')
        .delete()
        .eq('id', id)

    return {
        error: error ? error.message : null,
    }
}
