'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Patient } from '@/types/patient'
import { getPatientById, updatePatient, deletePatient } from '@/lib/supabase/patientService'
import { ArrowLeft, Pencil, Trash2, Save, X } from 'lucide-react'

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
    const [editData, setEditData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        age: '' as number | '',
        gender: '',
        marital_status: '',
        address: '',
        occupation: '',
    })

    useEffect(() => {
        if (patientUuid) {
            fetchPatient(patientUuid)
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

    const startEditing = () => {
        if (!patient) return
        setEditData({
            first_name: patient.first_name || '',
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

        const { data, error } = await updatePatient(patient.id, {
            first_name: editData.first_name,
            last_name: editData.last_name,
            phone: editData.phone || undefined,
            email: editData.email || undefined,
            age: editData.age === '' ? undefined : editData.age,
            gender: editData.gender || undefined,
            marital_status: editData.marital_status || undefined,
            address: editData.address || undefined,
            occupation: editData.occupation || undefined,
        })

        setSaving(false)

        if (error) {
            setError(error)
        } else {
            setPatient(data)
            setIsEditing(false)
        }
    }

    const handleDelete = async () => {
        if (!patient?.id) return
        const confirmed = window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')
        if (!confirmed) return

        const { error } = await deletePatient(patient.id)
        if (error) {
            setError(error)
        } else {
            router.push('/patients')
        }
    }

    const inputClass = 'w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
    const selectClass = 'w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none'

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="text-gray-500">Loading patient details...</p>
            </div>
        )
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
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
                {/* Header */}
                <div className="mb-8">
                    {isEditing ? (
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={editData.first_name}
                                onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                                placeholder="First name"
                                className="text-2xl font-bold text-gray-900 border-b-2 border-blue-400 bg-transparent focus:outline-none"
                            />
                            <input
                                type="text"
                                value={editData.last_name}
                                onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                                placeholder="Last name"
                                className="text-2xl font-bold text-gray-900 border-b-2 border-blue-400 bg-transparent focus:outline-none"
                            />
                        </div>
                    ) : (
                        <h2 className="text-2xl font-bold text-gray-900">
                            {patient.first_name} {patient.last_name}
                        </h2>
                    )}
                    <p className="text-sm text-blue-500 mt-1">
                        Patient ID: {patient.patient_id || '—'}
                    </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                    {/* Age */}
                    <div>
                        <p className="text-sm text-blue-500 mb-1">Age</p>
                        {isEditing ? (
                            <input
                                type="number"
                                value={editData.age}
                                onChange={(e) => setEditData({ ...editData, age: e.target.value ? parseInt(e.target.value) : '' })}
                                placeholder="Enter age"
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
                            <p className="text-sm font-medium text-gray-900">{patient.phone || '—'}</p>
                        )}
                    </div>

                    {/* Gender */}
                    <div>
                        <p className="text-sm text-blue-500 mb-1">Gender</p>
                        {isEditing ? (
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
                        ) : (
                            <p className="text-sm font-medium text-gray-900">{patient.gender || '—'}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
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
                            <p className="text-sm font-medium text-gray-900">{patient.email || '—'}</p>
                        )}
                    </div>

                    {/* Marital Status */}
                    <div>
                        <p className="text-sm text-blue-500 mb-1">Marital Status</p>
                        {isEditing ? (
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
                        ) : (
                            <p className="text-sm font-medium text-gray-900">{patient.marital_status || '—'}</p>
                        )}
                    </div>

                    {/* Address */}
                    <div>
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
                            <p className="text-sm font-medium text-gray-900">{patient.address || '—'}</p>
                        )}
                    </div>

                    {/* Occupation */}
                    <div>
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
                            <p className="text-sm font-medium text-gray-900">{patient.occupation || '—'}</p>
                        )}
                    </div>

                    {/* Last Visit — always read-only */}
                    <div>
                        <p className="text-sm text-blue-500 mb-1">Last Visit</p>
                        <p className="text-sm font-medium text-gray-900">{patient.last_visit || '—'}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-8">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                                    }`}
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={cancelEditing}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Patient
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={startEditing}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit Patient
                            </button>
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Patient
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
