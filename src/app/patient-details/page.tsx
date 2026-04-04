'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Patient } from '@/types/patient'
import { PatientHistory } from '@/types/patient_history'
import { getPatientById, updatePatient, deletePatient } from '@/lib/supabase/patientService'
import {
    getPatientHistory,
    createPatientHistory,
    updatePatientHistory,
    deletePatientHistory
} from '@/lib/supabase/patientHistoryService'
import { ArrowLeft, Pencil, Trash2, Save, X, Plus, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import DeletePatientModal from '@/components/DeletePatientModal'

export default function PatientDetailsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const patientUuid = searchParams.get('id')

    const [patient, setPatient] = useState<Patient | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [editData, setEditData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        phone: '',
        email: '',
        age: '' as number | '',
        gender: '',
        marital_status: '',
        address: '',
        occupation: '',
    })

    // History state
    const [history, setHistory] = useState<PatientHistory[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [showHistoryForm, setShowHistoryForm] = useState(false)
    const [historySubmitting, setHistorySubmitting] = useState(false)
    const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null)
    const [historyForm, setHistoryForm] = useState({ date: '', service: '', customService: '', notes: '' })
    const [historyToDelete, setHistoryToDelete] = useState<string | null>(null)
    const [deletingHistory, setDeletingHistory] = useState(false)

    const DENTAL_SERVICES = [
        'Regular Checkup',
        'Cleaning',
        'Extraction',
        'Filling',
        'Root Canal',
        'Crown',
        'Bridge',
        'Dentures',
        'Teeth Whitening',
        'Braces / Orthodontics',
        'Dental Implant',
        'Veneers',
        'Gum Treatment',
        'X-Ray / Imaging',
        'Wisdom Tooth Removal',
        'Oral Surgery',
        'Consultation',
        'Emergency / Walk-in',
        'Other',
    ]
    const [historySortAsc, setHistorySortAsc] = useState(false)

    useEffect(() => {
        if (patientUuid) {
            async function loadAll() {
                const results = await Promise.allSettled([
                    fetchPatient(patientUuid!),
                    fetchHistory(patientUuid!),
                ])
                if (results.some(r => r.status === 'rejected')) {
                    toast.error('Network error. Could not load patient data.')
                }
            }
            loadAll()
        }
    }, [patientUuid])

    const fetchPatient = async (id: string) => {
        setLoading(true)
        const { data, error } = await getPatientById(id)
        if (error) {
            setError(error)
        } else {
            setPatient(data)
        }
        setLoading(false)
    }

    const fetchHistory = async (id: string) => {
        setHistoryLoading(true)
        const { data, error } = await getPatientHistory(id)
        if (error) {
            setError(error)
        } else {
            setHistory(data || [])
        }
        setHistoryLoading(false)
    }

    const startEditing = () => {
        if (!patient) return
        setEditData({
            first_name: patient.first_name || '',
            middle_name: patient.middle_name || '',
            last_name: patient.last_name || '',
            phone: patient.phone || '',
            email: patient.email || '',
            age: patient.age ?? '',
            gender: patient.gender || '',
            marital_status: patient.marital_status || '',
            address: patient.address || '',
            occupation: patient.occupation || '',
        })
        setIsEditing(true)
    }

    const cancelEditing = () => {
        setIsEditing(false)
    }

    const handleSave = async () => {
        if (!patient?.id) return
        setSaving(true)

        try {
            const { data, error } = await updatePatient(patient.id, {
                first_name: editData.first_name,
                middle_name: editData.middle_name,
                last_name: editData.last_name,
                phone: editData.phone || undefined,
                email: editData.email || undefined,
                age: editData.age === '' ? undefined : editData.age,
                gender: editData.gender || undefined,
                marital_status: editData.marital_status || undefined,
                address: editData.address || undefined,
                occupation: editData.occupation || undefined,
            })

            if (error) {
                setError(error)
            } else {
                setPatient(data)
                setIsEditing(false)
            }
        } catch (err) {
            toast.error('Network error. Could not save patient details.')
        }

        setSaving(false)
    }

    const handleDelete = () => {
        if (!patient?.id) return
        setShowDeleteModal(true)
    }

    const handleConfirmDelete = async () => {
        if (!patient?.id) return
        setDeleting(true)
        try {
            const { error } = await deletePatient(patient.id)
            setDeleting(false)
            if (error) {
                toast.error('Failed to delete patient. Please try again.')
            } else {
                toast.success('Patient deleted successfully.')
                setShowDeleteModal(false)
                router.push('/patients')
            }
        } catch (err) {
            setDeleting(false)
            toast.error('Network error. Could not delete patient.')
        }
    }

    // ─── History handlers ─────────────────────────────────────

    const openAddHistory = () => {
        setEditingHistoryId(null)
        setHistoryForm({ date: new Date().toISOString().split('T')[0], service: '', customService: '', notes: '' })
        setShowHistoryForm(true)
    }

    const openEditHistory = (h: PatientHistory) => {
        setEditingHistoryId(h.id || null)
        const isPreset = DENTAL_SERVICES.includes(h.service || '')
        setHistoryForm({
            date: h.date || '',
            service: isPreset ? (h.service || '') : (h.service ? 'Other' : ''),
            customService: isPreset ? '' : (h.service || ''),
            notes: h.notes || '',
        })
        setShowHistoryForm(true)
    }

    const cancelHistoryForm = () => {
        setShowHistoryForm(false)
        setEditingHistoryId(null)
        setHistoryForm({ date: '', service: '', customService: '', notes: '' })
    }

    const handleHistorySubmit = async () => {
        if (!patient?.id) return
        setHistorySubmitting(true)

        const resolvedService = historyForm.service === 'Other' ? historyForm.customService : historyForm.service

        if (editingHistoryId) {
            const { data, error } = await updatePatientHistory(editingHistoryId, {
                date: historyForm.date,
                service: resolvedService || undefined,
                notes: historyForm.notes,
            })
            if (error) {
                setError(error)
            } else if (data) {
                setHistory(prev => prev.map(h => h.id === editingHistoryId ? data : h))
            }
        } else {
            const { data, error } = await createPatientHistory({
                patient_id: patient.id!,
                date: historyForm.date,
                service: resolvedService || undefined,
                notes: historyForm.notes,
            })
            if (error) {
                setError(error)
            } else if (data) {
                const updatedHistory = [data, ...history]
                setHistory(updatedHistory)
                const latestDate = updatedHistory
                    .map(h => h.date || '')
                    .filter(Boolean)
                    .sort()
                    .pop()
                setPatient(prev => prev ? { ...prev, last_visit: latestDate || prev.last_visit } : prev)
            }
        }

        setHistorySubmitting(false)
        cancelHistoryForm()
    }

    const handleDeleteHistory = (historyId: string) => {
        setHistoryToDelete(historyId)
    }

    const executeDeleteHistory = async () => {
        if (!historyToDelete) return
        setDeletingHistory(true)
        try {
            const { error } = await deletePatientHistory(historyToDelete)
            setDeletingHistory(false)
            if (error) {
                toast.error('Failed to delete history. Please try again.')
            } else {
                toast.success('History deleted successfully.')
                setHistory(prev => prev.filter(h => h.id !== historyToDelete))
                setHistoryToDelete(null)
            }
        } catch (err) {
            setDeletingHistory(false)
            toast.error('Network error. Could not delete history entry.')
        }
    }

    const inputClass = 'w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
    const selectClass = 'w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none'

    if (loading) {
        return <LoadingSpinner fullPage message="Loading patient details…" />
    }

    if (!patient) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => router.push('/patients')}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Patients
                </button>
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                    Patient not found.
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Back Link */}
            <button
                onClick={() => router.push('/patients')}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Patients
            </button>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex justify-between items-center">
                    <span>❌ {error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
            )}

            {/* Patient Details Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 sm:p-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    {isEditing ? (
                        /* Stack name inputs vertically on mobile, row on sm+ */
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <input
                                type="text"
                                value={editData.first_name}
                                onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                                placeholder="First name"
                                className="text-xl sm:text-2xl font-bold text-gray-900 border-b-2 border-blue-400 bg-transparent focus:outline-none min-w-0"
                            />
                            <input
                                type="text"
                                value={editData.middle_name}
                                onChange={(e) => setEditData({ ...editData, middle_name: e.target.value })}
                                placeholder="Middle name"
                                className="text-xl sm:text-2xl font-bold text-gray-900 border-b-2 border-blue-400 bg-transparent focus:outline-none min-w-0"
                            />
                            <input
                                type="text"
                                value={editData.last_name}
                                onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                                placeholder="Last name"
                                className="text-xl sm:text-2xl font-bold text-gray-900 border-b-2 border-blue-400 bg-transparent focus:outline-none min-w-0"
                            />
                        </div>
                    ) : (
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                            {patient.first_name} {patient.middle_name ? patient.middle_name + ' ' : ''}{patient.last_name}
                        </h2>
                    )}
                    <p className="text-sm text-blue-500 mt-1">
                        Patient ID: {patient.patient_id || '—'}
                    </p>
                </div>

                {/* Details Grid — 1 col on mobile, 2 cols on sm+ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-5">
                    {/* Age */}
                    <div>
                        <p className="text-sm text-blue-500 mb-1">Age</p>
                        {isEditing ? (
                            <input
                                type="number"
                                min="0"
                                max="150"
                                value={editData.age}
                                onChange={(e) => setEditData({ ...editData, age: e.target.value ? parseInt(e.target.value) : '' })}
                                className={inputClass}
                            />
                        ) : (
                            <p className="text-sm font-medium text-gray-900">
                                {patient.age ? `${patient.age} years old` : '—'}
                            </p>
                        )}
                    </div>

                    {/* Phone */}
                    <div>
                        <p className="text-sm text-blue-500 mb-1">Phone</p>
                        {isEditing ? (
                            <input
                                type="tel"
                                value={editData.phone}
                                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                placeholder="Enter phone number"
                                className={inputClass}
                            />
                        ) : (
                            <p className="text-sm font-medium text-gray-900 break-all">{patient.phone || '—'}</p>
                        )}
                    </div>

                    {/* Gender */}
                    <div>
                        <p className="text-sm text-blue-500 mb-1">Gender</p>
                        {isEditing ? (
                            <div className="relative">
                                <select
                                    value={editData.gender}
                                    onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                                    className={selectClass}
                                >
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        ) : (
                            <p className="text-sm font-medium text-gray-900">{patient.gender || '—'}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="min-w-0">
                        <p className="text-sm text-blue-500 mb-1">Email</p>
                        {isEditing ? (
                            <input
                                type="email"
                                value={editData.email}
                                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                placeholder="Enter email"
                                className={inputClass}
                            />
                        ) : (
                            <p className="text-sm font-medium text-gray-900 break-all">{patient.email || '—'}</p>
                        )}
                    </div>

                    {/* Marital Status */}
                    <div>
                        <p className="text-sm text-blue-500 mb-1">Marital Status</p>
                        {isEditing ? (
                            <div className="relative">
                                <select
                                    value={editData.marital_status}
                                    onChange={(e) => setEditData({ ...editData, marital_status: e.target.value })}
                                    className={selectClass}
                                >
                                    <option value="">Select status</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Divorced">Divorced</option>
                                    <option value="Widowed">Widowed</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        ) : (
                            <p className="text-sm font-medium text-gray-900">{patient.marital_status || '—'}</p>
                        )}
                    </div>

                    {/* Address */}
                    <div className="min-w-0">
                        <p className="text-sm text-blue-500 mb-1">Address</p>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editData.address}
                                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                placeholder="Enter address"
                                className={inputClass}
                            />
                        ) : (
                            <p className="text-sm font-medium text-gray-900 break-words">{patient.address || '—'}</p>
                        )}
                    </div>

                    {/* Occupation */}
                    <div className="min-w-0">
                        <p className="text-sm text-blue-500 mb-1">Occupation</p>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editData.occupation}
                                onChange={(e) => setEditData({ ...editData, occupation: e.target.value })}
                                placeholder="Enter occupation"
                                className={inputClass}
                            />
                        ) : (
                            <p className="text-sm font-medium text-gray-900 break-words">{patient.occupation || '—'}</p>
                        )}
                    </div>

                    {/* Last Visit — always read-only */}
                    <div>
                        <p className="text-sm text-blue-500 mb-1">Last Visit</p>
                        <p className="text-sm font-medium text-gray-900">{patient.last_visit || '—'}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-6 sm:mt-8">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Changes'}</span>
                                <span className="sm:hidden">{saving ? 'Saving...' : 'Save'}</span>
                            </button>
                            <button
                                onClick={cancelEditing}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition"
                            >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Delete Patient</span>
                                <span className="sm:hidden">Delete</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={startEditing}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit Patient</span>
                                <span className="sm:hidden">Edit</span>
                            </button>
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Delete Patient</span>
                                <span className="sm:hidden">Delete</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ─── Patient History Card ─────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 sm:p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Patient History</h3>
                        {history.length > 0 && (
                            <button
                                onClick={() => setHistorySortAsc(!historySortAsc)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition"
                            >
                                {historySortAsc ? '▲ Oldest' : '▼ Latest'}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={openAddHistory}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Add History</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>

                {/* Add / Edit History Form */}
                {showHistoryForm && (
                    <div className="mb-6 p-4 sm:p-5 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700">
                            {editingHistoryId ? 'Edit History Entry' : 'New History Entry'}
                        </h4>
                        {/* Stack on mobile, 2 cols on sm+ */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    value={historyForm.date}
                                    onChange={(e) => setHistoryForm({ ...historyForm, date: e.target.value })}
                                    max={new Date().toISOString().split('T')[0]}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Service <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        value={historyForm.service}
                                        onChange={(e) => setHistoryForm({ ...historyForm, service: e.target.value, customService: e.target.value === 'Other' ? historyForm.customService : '' })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none"
                                    >
                                        <option value="">Select service</option>
                                        {DENTAL_SERVICES.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                        {historyForm.service === 'Other' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Specify Service <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={historyForm.customService}
                                    onChange={(e) => setHistoryForm({ ...historyForm, customService: e.target.value })}
                                    placeholder="Enter custom service..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Notes <span className="text-red-500">*</span></label>
                            <textarea
                                value={historyForm.notes}
                                onChange={(e) => setHistoryForm({ ...historyForm, notes: e.target.value })}
                                rows={3}
                                placeholder="Enter visit notes..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleHistorySubmit}
                                disabled={historySubmitting || !historyForm.date || !historyForm.service || (historyForm.service === 'Other' && !historyForm.customService) || !historyForm.notes}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition ${historySubmitting || !historyForm.date || !historyForm.service || (historyForm.service === 'Other' && !historyForm.customService) || !historyForm.notes
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600'
                                    }`}
                            >
                                <Save className="w-3.5 h-3.5" />
                                {historySubmitting ? 'Saving...' : (editingHistoryId ? 'Update' : 'Save')}
                            </button>
                            <button
                                onClick={cancelHistoryForm}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition"
                            >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* History List */}
                {historyLoading ? (
                    <p className="text-sm text-gray-500">Loading history...</p>
                ) : history.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No history records yet.</p>
                ) : (
                    <div className="space-y-4">
                        {[...history]
                            .sort((a, b) => {
                                const dateA = a.date || ''
                                const dateB = b.date || ''
                                return historySortAsc ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA)
                            })
                            .map((h) => (
                                <div
                                    key={h.id}
                                    className="border border-gray-200 rounded-lg p-4 sm:p-5 hover:border-blue-200 transition group"
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="space-y-2 min-w-0 flex-1">
                                            {/* Date & Service */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-blue-500 shrink-0">{h.date || '—'}</p>
                                                {h.service && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 break-words">
                                                        {h.service}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Notes */}
                                            <p className="text-sm text-gray-700 break-words">{h.notes || '—'}</p>
                                        </div>
                                        {/* Actions — always visible on mobile, hover on desktop */}
                                        <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                                            <button
                                                onClick={() => openEditHistory(h)}
                                                className="p-1.5 text-gray-400 hover:text-blue-500 transition"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => h.id && handleDeleteHistory(h.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 transition"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Delete Patient Modal */}
            <DeletePatientModal
                isOpen={showDeleteModal}
                patientName={`${patient?.first_name ?? ''} ${patient?.last_name ?? ''}`}
                onConfirm={handleConfirmDelete}
                onClose={() => { if (!deleting) setShowDeleteModal(false) }}
                deleting={deleting}
            />

            {/* Delete History Modal */}
            <DeletePatientModal
                isOpen={!!historyToDelete}
                title="Delete History Entry"
                itemName="this history record"
                onConfirm={executeDeleteHistory}
                onClose={() => { if (!deletingHistory) setHistoryToDelete(null) }}
                deleting={deletingHistory}
            />
        </div>
    )
}