'use client'

import { useEffect, useState } from 'react'
import { Patient } from '@/types/patient'
import { getPatients, createPatient, deletePatient } from '@/lib/supabase/patientService'
import { Search, Plus, Eye, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import PatientModal from '@/components/PatientModal'

export default function PatientsPage() {
    const router = useRouter()
    const [patients, setPatients] = useState<Patient[]>([])
    const [patientsLoading, setPatientsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchPatients()
    }, [])

    const fetchPatients = async () => {
        setPatientsLoading(true)
        const { data, error } = await getPatients()
        if (error) {
            setError(error)
        } else {
            setPatients(data || [])
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
        const { error } = await createPatient(patientData)
        if (error) {
            setError(error)
        } else {
            closeModal()
            fetchPatients()
        }
        setSubmitting(false)
    }

    const handleDelete = async (id?: string) => {
        if (!id) return
        const confirmed = window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')
        if (!confirmed) return

        const { error } = await deletePatient(id)
        if (error) {
            setError(error)
        } else {
            fetchPatients()
        }
    }

    const filteredPatients = patients.filter(
        (p) =>
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.phone && p.phone.includes(searchTerm)) ||
            (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.patient_id && p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()))
    )

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
                        placeholder="Search patients by name, phone, email, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
                >
                    <Plus className="w-4 h-4" />
                    Add Patient
                </button>
            </div>

            {/* Patients Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Patient ID</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Last Visit</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patientsLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                        Loading patients...
                                    </td>
                                </tr>
                            ) : filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No patients found.
                                    </td>
                                </tr>
                            ) : (
                                filteredPatients.map((patient) => (
                                    <tr
                                        key={patient.id}
                                        className="border-b border-gray-100 hover:bg-gray-50/50 transition"
                                    >
                                        <td className="px-6 py-4 text-sm font-medium text-blue-600">
                                            {patient.patient_id || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {patient.first_name} {patient.last_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{patient.phone || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{patient.email || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{patient.last_visit || '—'}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => router.push(`/patient-details?id=${patient.id}`)}
                                                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(patient.id)}
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
            <PatientModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                submitting={submitting}
            />
        </div>
    )
}
