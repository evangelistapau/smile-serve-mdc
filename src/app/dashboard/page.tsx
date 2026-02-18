'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Patient } from '../../types/patient'
import { getPatients, createPatient } from '../../lib/supabase/patientService'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Patient state
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
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
      } else {
        setUser(user)
      }
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/')
      } else {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Fetch patients on mount
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
      // Reset form
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setDateOfBirth('')
      setAddress('')
      // Refresh list
      fetchPatients()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Dashboard</h1>

      {/* User Information */}
      <div style={{
        background: '#f5f5f5',
        padding: '1.5rem',
        borderRadius: '8px',
        marginTop: '1rem'
      }}>
        <h2>User Information</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
      </div>

      {/* Add Patient Form */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        borderRadius: '8px',
        marginTop: '2rem'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Add New Patient</h2>

        <form onSubmit={handleAddPatient}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
                First Name
              </label>
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
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
                Last Name
              </label>
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
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
                Email
              </label>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
                Phone
              </label>
              <input
                type="tel"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
                Address
              </label>
              <input
                type="text"
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
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
        marginTop: '2rem'
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
                  <tr key={patient.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
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

      <button
        onClick={handleLogout}
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          background: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
    </div>
  )
}

// Reusable styles
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