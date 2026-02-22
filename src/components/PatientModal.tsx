'use client'

import { useState, useEffect } from 'react'
import { Patient } from '@/types/patient'
import { X, ChevronDown } from 'lucide-react'

interface PatientModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (patient: Omit<Patient, 'id' | 'patient_id' | 'created_at'>) => void
    initialData?: Patient | null
    submitting?: boolean
}

export default function PatientModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    submitting = false,
}: PatientModalProps) {

    const [firstName, setFirstName] = useState('')
    const [middleName, setMiddleName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [age, setAge] = useState<number | ''>('')
    const [gender, setGender] = useState('')
    const [customGender, setCustomGender] = useState('')
    const [maritalStatus, setMaritalStatus] = useState('')
    const [occupation, setOccupation] = useState('')
    const [address, setAddress] = useState('')

    const isEdit = !!initialData


    useEffect(() => {
        if (initialData) {
            setFirstName(initialData.first_name || '')
            setMiddleName(initialData.middle_name || '')
            setLastName(initialData.last_name || '')
            setPhone(initialData.phone || '')
            setEmail(initialData.email || '')
            setAge(initialData.age ?? '')
            setGender(initialData.gender || '')
            setMaritalStatus(initialData.marital_status || '')
            setOccupation(initialData.occupation || '')
            setAddress(initialData.address || '')
        } else {
            setFirstName('')
            setMiddleName('')
            setLastName('')
            setPhone('')
            setEmail('')
            setAge('')
            setGender('')
            setCustomGender('')
            setMaritalStatus('')
            setOccupation('')
            setAddress('')
        }
    }, [initialData, isOpen])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const finalGender = gender === 'Other' ? customGender : gender

        onSubmit({
            first_name: firstName,
            middle_name: middleName || undefined,
            last_name: lastName,
            phone,
            email,
            age: age === '' ? undefined : age,
            gender: finalGender,
            marital_status: maritalStatus,
            occupation,
            address,
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isEdit ? 'Edit Patient' : 'Add New Patient'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>

                    {/* Row 1: First, Middle, Last Name */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                className="w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Middle Name
                            </label>
                            <input
                                type="text"
                                value={middleName}
                                onChange={(e) => setMiddleName(e.target.value)}
                                className="w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                className="w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    {/* Row 2: Email & Age */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Age <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="150"
                                value={age}
                                onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : '')}
                                required
                                className="w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    {/* Row 3: Phone */}
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            className="w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition"
                        />
                    </div>

                    {/* Row 4: Gender & Marital Status */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Gender <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition appearance-none"
                                >
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>

                            {gender === 'Other' && (
                                <input
                                    type="text"
                                    placeholder="Specify gender"
                                    value={customGender}
                                    onChange={(e) => setCustomGender(e.target.value)}
                                    required
                                    className="mt-2 w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Marital Status <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={maritalStatus}
                                    onChange={(e) => setMaritalStatus(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition appearance-none"
                                >
                                    <option value="">Select status</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Divorced">Divorced</option>
                                    <option value="Widowed">Widowed</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Row 5: Occupation */}
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Occupation <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={occupation}
                            onChange={(e) => setOccupation(e.target.value)}
                            required
                            className="w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition"
                        />
                    </div>

                    {/* Row 6: Address */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            className="w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition ${submitting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                        >
                            {submitting
                                ? (isEdit ? 'Saving...' : 'Adding...')
                                : (isEdit ? 'Save Changes' : 'Add Patient')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}