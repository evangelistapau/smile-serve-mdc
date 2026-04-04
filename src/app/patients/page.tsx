'use client'

import { useEffect, useState } from 'react'
import { Patient } from '@/types/patient'
import { getPatients, createPatient, deletePatient } from '@/lib/supabase/patientService'
import { Search, Plus, Eye, Trash2, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import AddPatientModal from '@/components/AddPatientModal'
import DeletePatientModal from '@/components/DeletePatientModal'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function PatientsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [patients, setPatients] = useState<Patient[]>([])
    const [patientsLoading, setPatientsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [sortField, setSortField] = useState<'patient_id' | 'name' | 'last_visit'>('patient_id')
    const [sortAsc, setSortAsc] = useState(true)

    // Add patient modal state — auto-open if ?action=add
    const [isModalOpen, setIsModalOpen] = useState(() => searchParams.get('action') === 'add')
    const [submitting, setSubmitting] = useState(false)

    // Delete modal state
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
    const [pendingDeleteName, setPendingDeleteName] = useState('')
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        fetchPatients()
    }, [])

    const fetchPatients = async () => {
        setPatientsLoading(true)
        try {
            const { data, error } = await getPatients()
            if (error) {
                setError(error)
            } else {
                setPatients(data || [])
            }
        } catch (err) {
            toast.error('Network error. Could not load patients.')
        }
        setPatientsLoading(false)
    }

    const openAddModal = () => {
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
    }

    const handleSubmit = async (patientData: Omit<Patient, 'id' | 'patient_id' | 'created_at'>) => {
        setSubmitting(true)
        try {
            const { error } = await createPatient(patientData)
            if (error) {
                setError(error)
            } else {
                closeModal()
                fetchPatients()
            }
        } catch (err) {
            toast.error('Network error. Could not add patient.')
        }
        setSubmitting(false)
    }

    const handleDelete = (patient: Patient) => {
        if (!patient.id) return
        setPendingDeleteId(patient.id)
        setPendingDeleteName(`${patient.first_name} ${patient.last_name}`)
    }

    const handleConfirmDelete = async () => {
        if (!pendingDeleteId) return
        setDeleting(true)
        try {
            const { error } = await deletePatient(pendingDeleteId)
            setDeleting(false)
            if (error) {
                toast.error('Failed to delete patient. Please try again.')
            } else {
                toast.success('Patient deleted successfully.')
                setPendingDeleteId(null)
                setPendingDeleteName('')
                fetchPatients()
            }
        } catch (err) {
            setDeleting(false)
            toast.error('Network error. Could not delete patient.')
        }
    }

    const handleCloseDeleteModal = () => {
        if (deleting) return
        setPendingDeleteId(null)
        setPendingDeleteName('')
    }

    const filteredPatients = patients.filter(
        (p) =>
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.phone && p.phone.includes(searchTerm)) ||
            (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.patient_id && p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const toggleSort = (field: 'patient_id' | 'name' | 'last_visit') => {
        if (sortField === field) {
            setSortAsc(!sortAsc)
        } else {
            setSortField(field)
            setSortAsc(true)
        }
    }

    const sortedPatients = [...filteredPatients].sort((a, b) => {
        let valA = ''
        let valB = ''
        if (sortField === 'patient_id') {
            valA = a.patient_id || ''
            valB = b.patient_id || ''
        } else if (sortField === 'name') {
            valA = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase()
            valB = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase()
        } else if (sortField === 'last_visit') {
            valA = a.last_visit || ''
            valB = b.last_visit || ''
        }
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })

    const SortIcon = ({ field }: { field: 'patient_id' | 'name' | 'last_visit' }) => {
        if (sortField !== field) return <ArrowDown className="w-3 h-3 text-gray-300" />
        return sortAsc
            ? <ArrowUp className="w-3 h-3 text-blue-500" />
            : <ArrowDown className="w-3 h-3 text-blue-500" />
    }

    return (
        <div className="space-y-6">
            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex justify-between items-center">
                    <span>❌ {error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
            )}

            {/* Search and Add */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search patients by Patient ID, name, phone, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <Button
                    onClick={openAddModal}
                    variant="primary"
                    className='h-9 md:h-10'
                >
                    <Plus className="w-4 h-4" />
                    Add Patient
                </Button>
            </div>

            {/* Patients Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {/* Mobile scroll signifier */}
                <div className="w-full flex justify-end px-4 py-2 bg-gray-50 border-b border-gray-200 md:hidden">
                    <span className="text-xs text-gray-500 italic flex items-center gap-1">
                        Swipe to see more <ArrowRight className="w-3 h-3" />
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th
                                    onClick={() => toggleSort('patient_id')}
                                    className="px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer select-none hover:bg-gray-100 transition whitespace-nowrap"
                                >
                                    <span className="inline-flex items-center gap-1">Patient ID <SortIcon field="patient_id" /></span>
                                </th>
                                <th
                                    onClick={() => toggleSort('name')}
                                    className="px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer select-none hover:bg-gray-100 transition whitespace-nowrap"
                                >
                                    <span className="inline-flex items-center gap-1">Name <SortIcon field="name" /></span>
                                </th>
                                <th className="px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Phone</th>
                                <th className="px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Email</th>
                                <th
                                    onClick={() => toggleSort('last_visit')}
                                    className="px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer select-none hover:bg-gray-100 transition whitespace-nowrap"
                                >
                                    <span className="inline-flex items-center gap-1">Last Visit <SortIcon field="last_visit" /></span>
                                </th>
                                <th className="px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patientsLoading ? (
                                <tr>
                                    <td colSpan={6}>
                                        <LoadingSpinner message="Loading patients…" />
                                    </td>
                                </tr>
                            ) : filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No patients found.
                                    </td>
                                </tr>
                            ) : (
                                sortedPatients.map((patient) => (
                                    <tr
                                        key={patient.id}
                                        className="border-b border-gray-100 hover:bg-gray-50/50 transition"
                                    >
                                        <td className="px-6 py-4 text-xs sm:text-sm font-medium text-blue-600">
                                            {patient.patient_id || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-xs sm:text-sm font-medium text-gray-900">
                                            {patient.first_name} {patient.last_name}
                                        </td>
                                        <td className="px-6 py-4 text-xs sm:text-sm text-gray-500">{patient.phone || '—'}</td>
                                        <td className="px-6 py-4 text-xs sm:text-sm text-gray-500">{patient.email || '—'}</td>
                                        <td className="px-6 py-4 text-xs sm:text-sm text-gray-500">{patient.last_visit || '—'}</td>
                                        <td className="px-6 py-4 text-xs sm:text-sm">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => router.push(`/patient-details?id=${patient.id}`)}
                                                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(patient)}
                                                    className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Patient Modal */}
            <AddPatientModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                submitting={submitting}
            />

            {/* Delete Confirmation Modal */}
            <DeletePatientModal
                isOpen={!!pendingDeleteId}
                patientName={pendingDeleteName}
                onConfirm={handleConfirmDelete}
                onClose={handleCloseDeleteModal}
                deleting={deleting}
            />
        </div>
    )
}
