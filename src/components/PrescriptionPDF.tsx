'use client'

import { useState } from 'react'
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    PDFDownloadLink,
    PDFViewer,
    BlobProvider,
} from '@react-pdf/renderer'
import { Patient } from '@/types/patient'
import { FileText, X, Printer, Download, ChevronRight, Plus, Trash2 } from 'lucide-react'

// ─── Clinic Data ────────────────────────────────────────────────
const DOCTOR_INFO = {
    name: 'DENTIST NAME',
    licenseNo: '0123456',
    ptrNo: '7654321',
}

const CLINIC_INFO = {
    name: 'MODERN DENTISTRY CLINIC',
    address: 'San Miguel, Boac, Marinduque',
    schedule: 'Monday to Saturday',
    mode: 'BY APPOINTMENT',
    telephone: '042-7541389',
    mobile: '+639173240955',
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MedicationEntry {
    medication: string
    quantity: string
    frequency: string
    duration: string
    instructions: string
}

// ─── PDF Styles ───────────────────────────────────────────────────────────────
const pdfStyles = StyleSheet.create({
    page: {
        paddingTop: 28,
        paddingBottom: 28,
        paddingHorizontal: 36,
        fontFamily: 'Times-Roman',
        backgroundColor: '#ffffff',
        flexDirection: 'column',
    },
    header: {
        alignItems: 'center',
        marginBottom: 10,
    },
    clinicName: {
        fontFamily: 'Times-Bold',
        fontSize: 11,
        letterSpacing: 1,
        textAlign: 'center',
    },
    clinicInfo: {
        fontSize: 9,
        textAlign: 'center',
        marginTop: 2,
        color: '#222222',
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        marginTop: 10,
        marginBottom: 10,
    },
    patientRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 6,
    },
    fieldLabel: {
        fontFamily: 'Times-Bold',
        fontSize: 9,
        marginRight: 4,
    },
    fieldUnderline: {
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        flex: 1,
        marginRight: 10,
        paddingBottom: 1,
    },
    fieldValue: {
        fontFamily: 'Times-Roman',
        fontSize: 9,
        color: '#111111',
    },
    fieldLabelSmall: {
        fontFamily: 'Times-Bold',
        fontSize: 9,
        marginRight: 3,
    },
    fieldUnderlineShort: {
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        width: 50,
        marginRight: 12,
        paddingBottom: 1,
    },
    fieldUnderlineDate: {
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        width: 70,
        paddingBottom: 1,
    },
    rxContainer: {
        marginTop: 10,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    rxR: {
        fontFamily: 'Times-Bold',
        fontSize: 30,
        color: '#1a1a1a',
        lineHeight: 1,
    },
    rxX: {
        fontFamily: 'Times-Bold',
        fontSize: 16,
        color: '#1a1a1a',
        marginBottom: 3,
    },
    // Medication body
    medBlock: {
        marginBottom: 12,
        paddingLeft: 8,
    },
    medName: {
        fontFamily: 'Times-Bold',
        fontSize: 10,
        color: '#111111',
        marginBottom: 2,
    },
    medDetail: {
        fontFamily: 'Times-Roman',
        fontSize: 9,
        color: '#333333',
        marginBottom: 1,
        paddingLeft: 6,
    },
    emptyLines: {
        flex: 1,
    },
    writingLine: {
        borderBottomWidth: 0.5,
        borderBottomColor: '#cccccc',
        marginBottom: 18,
    },
    footer: {
        marginTop: 16,
        paddingTop: 8,
    },
    footerDoctorName: {
        fontFamily: 'Times-Bold',
        fontSize: 9,
        textAlign: 'right',
    },
    footerLine: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 3,
        alignItems: 'flex-end',
    },
    footerLabel: {
        fontFamily: 'Times-Roman',
        fontSize: 8,
        color: '#222222',
        marginRight: 4,
    },
    footerUnderline: {
        borderBottomWidth: 0.7,
        borderBottomColor: '#333333',
        width: 60,
        paddingBottom: 1,
    },
    footerValue: {
        fontFamily: 'Times-Roman',
        fontSize: 8,
        color: '#333333',
    },
})

// ─── PDF Document ─────────────────────────────────────────────────────────────
interface PrescriptionDocProps {
    patient: Patient
    date: string
    medications: MedicationEntry[]
}

export function PrescriptionDocument({ patient, date, medications }: PrescriptionDocProps) {
    const fullName = [patient.first_name, patient.middle_name, patient.last_name]
        .filter(Boolean)
        .join(' ')
        .toUpperCase()

    const age = patient.age ? String(patient.age) : ''
    const sex = patient.gender || ''
    const address = patient.address || ''
    const hasMeds = medications.length > 0 && medications.some(m => m.medication.trim())

    return (
        <Document
            title={`Prescription - ${fullName}`}
            author={DOCTOR_INFO.name}
            subject="Dental Prescription"
        >
            <Page size="A5" style={pdfStyles.page}>

                {/* Clinic Header */}
                <View style={pdfStyles.header}>
                    <Text style={pdfStyles.clinicName}>{CLINIC_INFO.name}</Text>
                    <Text style={pdfStyles.clinicInfo}>{CLINIC_INFO.address}</Text>
                    <Text style={pdfStyles.clinicInfo}>{CLINIC_INFO.schedule}</Text>
                    <Text style={pdfStyles.clinicInfo}>{CLINIC_INFO.mode}</Text>
                    <Text style={pdfStyles.clinicInfo}>Tel.# {CLINIC_INFO.telephone}</Text>
                    <Text style={pdfStyles.clinicInfo}>Mobile# {CLINIC_INFO.mobile}</Text>
                </View>

                <View style={pdfStyles.divider} />

                {/* Patient Name + Date */}
                <View style={pdfStyles.patientRow}>
                    <Text style={pdfStyles.fieldLabel}>Patient:</Text>
                    <View style={[pdfStyles.fieldUnderline, { flex: 1 }]}>
                        <Text style={pdfStyles.fieldValue}>{fullName}</Text>
                    </View>
                    <Text style={pdfStyles.fieldLabelSmall}>Date:</Text>
                    <View style={pdfStyles.fieldUnderlineDate}>
                        <Text style={pdfStyles.fieldValue}>{date}</Text>
                    </View>
                </View>

                {/* Age + Sex */}
                <View style={pdfStyles.patientRow}>
                    <Text style={pdfStyles.fieldLabelSmall}>Age:</Text>
                    <View style={pdfStyles.fieldUnderlineShort}>
                        <Text style={pdfStyles.fieldValue}>{age}</Text>
                    </View>
                    <Text style={pdfStyles.fieldLabelSmall}>Sex:</Text>
                    <View style={[pdfStyles.fieldUnderlineShort, { width: 70 }]}>
                        <Text style={pdfStyles.fieldValue}>{sex}</Text>
                    </View>
                </View>

                {/* Address */}
                <View style={[pdfStyles.patientRow, { marginBottom: 2 }]}>
                    <Text style={pdfStyles.fieldLabel}>Address:</Text>
                    <View style={[pdfStyles.fieldUnderline, { flex: 1, marginRight: 0 }]}>
                        <Text style={pdfStyles.fieldValue}>{address}</Text>
                    </View>
                </View>

                {/* Rx Symbol */}
                <View style={pdfStyles.rxContainer}>
                    <Text style={pdfStyles.rxR}>R</Text>
                    <Text style={pdfStyles.rxX}>x</Text>
                </View>

                {/* Medication Entries or blank lines */}
                {hasMeds ? (
                    <View style={pdfStyles.emptyLines}>
                        {medications.filter(m => m.medication.trim()).map((med, i) => (
                            <View key={i} style={pdfStyles.medBlock}>
                                <Text style={pdfStyles.medName}>{i + 1}. {med.medication}</Text>
                                {med.quantity ? <Text style={pdfStyles.medDetail}>Qty: {med.quantity}</Text> : null}
                                {med.frequency ? <Text style={pdfStyles.medDetail}>Frequency: {med.frequency}</Text> : null}
                                {med.duration ? <Text style={pdfStyles.medDetail}>Duration: {med.duration}</Text> : null}
                                {med.instructions ? <Text style={pdfStyles.medDetail}>Instructions: {med.instructions}</Text> : null}
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={pdfStyles.emptyLines}>
                        {Array.from({ length: 10 }).map((_, i) => (
                            <View key={i} style={pdfStyles.writingLine} />
                        ))}
                    </View>
                )}

                {/* Footer */}
                <View style={pdfStyles.footer}>
                    <Text style={pdfStyles.footerDoctorName}>{DOCTOR_INFO.name}</Text>
                    <View style={pdfStyles.footerLine}>
                        <Text style={pdfStyles.footerLabel}>LICENSE NO.</Text>
                        <View style={pdfStyles.footerUnderline}>
                            <Text style={pdfStyles.footerValue}>{DOCTOR_INFO.licenseNo}</Text>
                        </View>
                    </View>
                    <View style={pdfStyles.footerLine}>
                        <Text style={pdfStyles.footerLabel}>PTR NO.</Text>
                        <View style={[pdfStyles.footerUnderline, { width: 72 }]}>
                            <Text style={pdfStyles.footerValue}>{DOCTOR_INFO.ptrNo}</Text>
                        </View>
                    </View>
                </View>

            </Page>
        </Document>
    )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function emptyMed(): MedicationEntry {
    return { medication: '', quantity: '', frequency: '', duration: '', instructions: '' }
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface PrescriptionButtonProps {
    patient: Patient
}

type ModalStep = 'form' | 'preview'

export default function PrescriptionButton({ patient }: PrescriptionButtonProps) {
    const [step, setStep] = useState<ModalStep | null>(null)
    const [meds, setMeds] = useState<MedicationEntry[]>([emptyMed()])

    const today = new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
    })

    const fullNameForFile = [patient.first_name, patient.middle_name, patient.last_name]
        .filter(Boolean)
        .join('_')

    const fileName = `Prescription_${fullNameForFile}_${today.replace(/\//g, '-')}.pdf`

    const openForm = () => {
        setMeds([emptyMed()])
        setStep('form')
    }

    const closeAll = () => {
        setStep(null)
        setMeds([emptyMed()])
    }

    const updateMed = (idx: number, field: keyof MedicationEntry, value: string) => {
        setMeds(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
    }

    const addMed = () => setMeds(prev => [...prev, emptyMed()])

    const removeMed = (idx: number) =>
        setMeds(prev => prev.length === 1 ? [emptyMed()] : prev.filter((_, i) => i !== idx))

    const canPreview = meds.some(m => m.medication.trim())

    const doc = <PrescriptionDocument patient={patient} date={today} medications={meds} />

    const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white transition'
    const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={openForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition"
            >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Create Prescription</span>
                <span className="sm:hidden">Rx</span>
            </button>

            {/* ── STEP 1: Form Modal ── */}
            {step === 'form' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Create Prescription</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Patient: <span className="font-semibold text-gray-700">
                                        {patient.first_name} {patient.last_name}
                                    </span>
                                </p>
                            </div>
                            <button onClick={closeAll} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                            {meds.map((med, idx) => (
                                <div key={idx} className="rounded-xl border border-gray-200 p-4 space-y-3 relative">
                                    {/* Medication number badge */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                                            Medication #{idx + 1}
                                        </span>
                                        {meds.length > 1 && (
                                            <button
                                                onClick={() => removeMed(idx)}
                                                className="p-1 text-gray-300 hover:text-red-500 transition rounded"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Medication Name */}
                                    <div>
                                        <label className={labelCls}>
                                            Medication <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={med.medication}
                                            onChange={e => updateMed(idx, 'medication', e.target.value)}
                                            placeholder="e.g. Amoxicillin 500mg"
                                            className={inputCls}
                                        />
                                    </div>

                                    {/* Quantity + Frequency row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls}>Quantity</label>
                                            <input
                                                type="text"
                                                value={med.quantity}
                                                onChange={e => updateMed(idx, 'quantity', e.target.value)}
                                                placeholder="e.g. 1 capsule"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Frequency</label>
                                            <input
                                                type="text"
                                                value={med.frequency}
                                                onChange={e => updateMed(idx, 'frequency', e.target.value)}
                                                placeholder="e.g. 3x a day"
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>

                                    {/* Duration */}
                                    <div>
                                        <label className={labelCls}>Duration</label>
                                        <input
                                            type="text"
                                            value={med.duration}
                                            onChange={e => updateMed(idx, 'duration', e.target.value)}
                                            placeholder="e.g. 7 days"
                                            className={inputCls}
                                        />
                                    </div>

                                    {/* Instructions */}
                                    <div>
                                        <label className={labelCls}>Instructions</label>
                                        <textarea
                                            rows={2}
                                            value={med.instructions}
                                            onChange={e => updateMed(idx, 'instructions', e.target.value)}
                                            placeholder="e.g. Take after meals"
                                            className={`${inputCls} resize-none`}
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Add Medication */}
                            <button
                                onClick={addMed}
                                className="w-full py-2.5 border-2 border-dashed border-emerald-300 text-emerald-600 text-sm font-medium rounded-xl hover:bg-emerald-50 transition flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Another Medication
                            </button>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0 bg-gray-50/60">
                            <button
                                onClick={closeAll}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setStep('preview')}
                                disabled={!canPreview}
                                className={`flex-1 py-2.5 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 ${canPreview
                                    ? 'bg-emerald-500 hover:bg-emerald-600'
                                    : 'bg-gray-300 cursor-not-allowed'
                                    }`}
                            >
                                Preview
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Preview Modal ── */}
            {step === 'preview' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[92vh] flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Prescription Preview</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Review before saving or printing</p>
                            </div>
                            <button onClick={closeAll} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* PDF Viewer */}
                        <div className="flex-1 min-h-0 bg-gray-100">
                            <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
                                {doc}
                            </PDFViewer>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap gap-3 shrink-0 bg-gray-50/60">
                            <button
                                onClick={() => setStep('form')}
                                className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition"
                            >
                                ← Edit
                            </button>

                            {/* Print */}
                            <BlobProvider document={doc}>
                                {({ url, loading }) => (
                                    <button
                                        disabled={loading || !url}
                                        onClick={() => {
                                            if (!url) return
                                            const iframe = document.createElement('iframe')
                                            iframe.style.display = 'none'
                                            iframe.src = url
                                            document.body.appendChild(iframe)
                                            iframe.onload = () => {
                                                iframe.contentWindow?.print()
                                                setTimeout(() => document.body.removeChild(iframe), 1000)
                                            }
                                        }}
                                        className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 ${loading || !url
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                    >
                                        <Printer className="w-4 h-4" />
                                        {loading ? 'Preparing...' : 'Print'}
                                    </button>
                                )}
                            </BlobProvider>

                            {/* Download */}
                            <PDFDownloadLink document={doc} fileName={fileName}>
                                {({ loading }) => (
                                    <button
                                        disabled={loading}
                                        className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 ${loading
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                            }`}
                                    >
                                        <Download className="w-4 h-4" />
                                        {loading ? 'Generating...' : 'Download PDF'}
                                    </button>
                                )}
                            </PDFDownloadLink>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
