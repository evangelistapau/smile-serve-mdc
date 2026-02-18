'use client'

import { useEffect, useState } from 'react'
import { Patient } from '@/types/patient'
import { getPatients, createPatient } from '@/lib/supabase/patientService'

export default function PatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([])
    const [patientsLoading, setPatientsLoading] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [formSuccess, setFormSuccess] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // Form fields
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [dateOfBirth, setDateOfBirth] = useState('')
    const [address, setAddress] = useState('')

    useEffect(() => {
        fetchPatients()
    }, [])

    const fetchPatients = async () => {
        setPatientsLoading(true)
        const { data, error } = await getPatients()
        if (error) {
            setFormError(error)
        } else {
            setPatients(data || [])
        }
        setPatientsLoading(false)
    }

    const handleAddPatient = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setFormError(null)
        setFormSuccess(null)

        const { data, error } = await createPatient({
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            date_of_birth: dateOfBirth,
            address,
        })

        setSubmitting(false)

        if (error) {
            setFormError(error)
        } else {
            setFormSuccess(`Patient "${data?.first_name} ${data?.last_name}" added successfully!`)
            setFirstName('')
            setLastName('')
            setEmail('')
            setPhone('')
            setDateOfBirth('')
            setAddress('')
            fetchPatients()
        }
    }

    return (
        <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Patients</h1>

            {/* Add Patient Form */}
            <div style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
                borderRadius: '8px',
                marginBottom: '2rem',
            }}>
                <h2 style={{ marginBottom: '1rem' }}>Add New Patient</h2>

                <form onSubmit={handleAddPatient}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>First Name</label>
                            <input
                                type="text"
                                placeholder="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Last Name</label>
                            <input
                                type="text"
                                placeholder="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Email</label>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Phone</label>
                            <input
                                type="tel"
                                placeholder="Phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Date of Birth</label>
                            <input
                                type="date"
                                value={dateOfBirth}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Address</label>
                            <input
                                type="text"
                                placeholder="Address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            marginTop: '1rem',
                            padding: '0.75rem 1.5rem',
                            background: submitting ? '#9ca3af' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                        }}
                    >
                        {submitting ? 'Adding...' : 'Add Patient'}
                    </button>
                </form>

                {formError && (
                    <p style={{ color: '#dc2626', marginTop: '0.75rem', fontSize: '0.875rem' }}>
                        ❌ {formError}
                    </p>
                )}
                {formSuccess && (
                    <p style={{ color: '#16a34a', marginTop: '0.75rem', fontSize: '0.875rem' }}>
                        ✅ {formSuccess}
                    </p>
                )}
            </div>

            {/* Patient List */}
            <div style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
                borderRadius: '8px',
            }}>
                <h2 style={{ marginBottom: '1rem' }}>Patient Records</h2>

                {patientsLoading ? (
                    <p>Loading patients...</p>
                ) : patients.length === 0 ? (
                    <p style={{ color: '#6b7280' }}>No patients found. Add your first patient above!</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                                    <th style={thStyle}>Name</th>
                                    <th style={thStyle}>Email</th>
                                    <th style={thStyle}>Phone</th>
                                    <th style={thStyle}>Date of Birth</th>
                                    <th style={thStyle}>Address</th>
                                    <th style={thStyle}>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.map((patient) => (
                                    <tr key={patient.patient_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={tdStyle}>{patient.first_name} {patient.last_name}</td>
                                        <td style={tdStyle}>{patient.email}</td>
                                        <td style={tdStyle}>{patient.phone}</td>
                                        <td style={tdStyle}>{patient.date_of_birth}</td>
                                        <td style={tdStyle}>{patient.address}</td>
                                        <td style={tdStyle}>
                                            {patient.created_at
                                                ? new Date(patient.created_at).toLocaleDateString()
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

// Reusable styles
const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.25rem',
    fontWeight: 'bold',
    fontSize: '0.875rem',
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
}

const thStyle: React.CSSProperties = {
    padding: '0.75rem',
    fontWeight: 'bold',
    borderBottom: '2px solid #e5e7eb',
}

const tdStyle: React.CSSProperties = {
    padding: '0.75rem',
}
