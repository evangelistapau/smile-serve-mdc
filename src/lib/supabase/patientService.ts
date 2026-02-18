import { supabase } from './client'
import { Patient, PatientHistory } from '../../types/patient'

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
 * Fetch a single patient by patient_id.
 */
export async function getPatientById(
    patientId: string
): Promise<{ data: Patient | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient')
        .select('*')
        .eq('patient_id', patientId)
        .single()

    return {
        data: data as Patient | null,
        error: error ? error.message : null,
    }
}

/**
 * Insert a new patient into the "patient" table.
 */
export async function createPatient(
    patient: Omit<Patient, 'patient_id' | 'created_at'>
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

/**
 * Update an existing patient by patient_id.
 */
export async function updatePatient(
    patientId: string,
    updates: Partial<Omit<Patient, 'patient_id' | 'created_at'>>
): Promise<{ data: Patient | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient')
        .update(updates)
        .eq('patient_id', patientId)
        .select()
        .single()

    return {
        data: data as Patient | null,
        error: error ? error.message : null,
    }
}

/**
 * Delete a patient by patient_id.
 */
export async function deletePatient(
    patientId: string
): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from('patient')
        .delete()
        .eq('patient_id', patientId)

    return {
        error: error ? error.message : null,
    }
}

// ─── PATIENT HISTORY CRUD ───────────────────────────────────────────────────

/**
 * Fetch all history records for a given patient, ordered by date descending.
 */
export async function getPatientHistory(
    patientId: string
): Promise<{ data: PatientHistory[] | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient_history')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false })

    return {
        data: data as PatientHistory[] | null,
        error: error ? error.message : null,
    }
}

/**
 * Insert a new history record for a patient.
 */
export async function createPatientHistory(
    history: Omit<PatientHistory, 'history_id' | 'created_at'>
): Promise<{ data: PatientHistory | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient_history')
        .insert([history])
        .select()
        .single()

    return {
        data: data as PatientHistory | null,
        error: error ? error.message : null,
    }
}

/**
 * Update a patient history record by history_id.
 */
export async function updatePatientHistory(
    historyId: string,
    updates: Partial<Omit<PatientHistory, 'history_id' | 'created_at'>>
): Promise<{ data: PatientHistory | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient_history')
        .update(updates)
        .eq('history_id', historyId)
        .select()
        .single()

    return {
        data: data as PatientHistory | null,
        error: error ? error.message : null,
    }
}

/**
 * Delete a patient history record by history_id.
 */
export async function deletePatientHistory(
    historyId: string
): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from('patient_history')
        .delete()
        .eq('history_id', historyId)

    return {
        error: error ? error.message : null,
    }
}
