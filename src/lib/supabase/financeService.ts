import { supabase } from './client'
import { PatientHistory } from '../../types/patient_history'

export interface EarningsSummary {
    cash: number
    gcash: number
    total: number
}

export interface FinanceData {
    daily: EarningsSummary
    weekly: EarningsSummary
    monthly: EarningsSummary
    allTime: EarningsSummary
    records: PatientHistory[]
}

/**
 * Compute earnings from an array of history records.
 * Only includes records where payment_status === 'Paid'.
 */
function computeSummary(records: PatientHistory[]): EarningsSummary {
    const paid = records.filter(r => r.payment_status === 'Paid')
    const cash = paid
        .filter(r => r.payment_method === 'Cash')
        .reduce((sum, r) => sum + (r.amount ?? 0), 0)
    const gcash = paid
        .filter(r => r.payment_method === 'GCash')
        .reduce((sum, r) => sum + (r.amount ?? 0), 0)
    return { cash, gcash, total: cash + gcash }
}

/**
 * Fetch all patient history records with payment_status = 'Paid',
 * then compute daily / weekly / monthly / all-time totals.
 */
export async function getFinanceData(): Promise<{ data: FinanceData | null; error: string | null }> {
    const { data, error } = await supabase
        .from('patient_history')
        .select('*')
        .eq('payment_status', 'Paid')
        .order('date', { ascending: false })

    if (error) {
        return { data: null, error: error.message }
    }

    const records = (data as PatientHistory[]) ?? []

    // Date boundaries (using local date strings yyyy-mm-dd)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // Start of current week (Monday)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0 … Sun=6
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    // Start of current month
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const dailyRecords = records.filter(r => r.date === todayStr)
    const weeklyRecords = records.filter(r => r.date && r.date >= weekStartStr && r.date <= todayStr)
    const monthlyRecords = records.filter(r => r.date && r.date >= monthStartStr && r.date <= todayStr)

    return {
        data: {
            daily: computeSummary(dailyRecords),
            weekly: computeSummary(weeklyRecords),
            monthly: computeSummary(monthlyRecords),
            allTime: computeSummary(records),
            records,
        },
        error: null,
    }
}
