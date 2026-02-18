import { supabase } from './client'
import { Patient } from '../../types/patient'
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
 * Insert a new patient into the "patient" table.
 */
export async function createPatient(
    patient: Omit<Patient, 'id' | 'created_at'>
): Promise<{ data: Patient | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient')
        .insert([patient])
        .select()
        .single()

    return {
        data: data as Patient | null,
        error: error ? error.message : null,
    }
}
