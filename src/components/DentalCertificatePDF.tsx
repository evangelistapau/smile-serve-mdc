'use client'

import { useEffect, useRef, useState } from 'react'
import {
    Document,
    Page,
    Text,
    View,
    Image,
    Svg,
    Path,
    Font,
    StyleSheet,
    pdf,
} from '@react-pdf/renderer'
import { Patient } from '@/types/patient'
import { Award, X, Printer, Download, ChevronRight, ChevronDown, Sparkles } from 'lucide-react'

// ─── Font Registration (local files = no network stalls) ─────────────────────
Font.register({
    family: 'Poppins',
    fonts: [
        { src: '/fonts/Poppins-Regular.ttf', fontWeight: 400 },
        { src: '/fonts/Poppins-Bold.ttf', fontWeight: 700 },
    ],
})
// Prevents hyphenation work (faster layout, no odd word breaks)
Font.registerHyphenationCallback(word => [word])

const CLINIC_INFO = {
    name: 'MODERN DENTISTRY CLINIC',
    address: 'San Miguel, Boac, Marinduque',
    schedule: 'Monday to Saturday',
    mode: 'BY APPOINTMENT',
    telephone: '042-7541389',
    mobile: '+639173240955',
}

const DENTISTS = [
    { name: 'Roselle Larga Piedad DMD', licenseNo: '039277', ptrNo: '32264627' },
    { name: 'Lorevel V. Macalood DMD', licenseNo: '0065807', ptrNo: '' },
    { name: 'Rowell B. Nepomuceno DMD', licenseNo: '0050200', ptrNo: '' },
]

// hasBlank = shows an underline after the label (like the reference photo)
const TREATMENTS: { label: string; hasBlank?: boolean; placeholder?: string }[] = [
    { label: 'Consultation' },
    { label: 'Oral Examination' },
    { label: 'Oral Prophylaxis' },
    { label: "Permanent Filling of tooth #'s", hasBlank: true, placeholder: 'e.g. 14, 15' },
    { label: "Temporary Filling of tooth #'s", hasBlank: true, placeholder: 'e.g. 26' },
    { label: "Extraction of tooth #'s", hasBlank: true, placeholder: 'e.g. 38' },
    { label: 'Pit & Fissure Sealant' },
    { label: 'Topical Fluoride Application' },
    { label: 'Root Canal Treatment' },
    { label: 'Others', hasBlank: true, placeholder: 'e.g. Teeth Whitening' },
]

// ─── PDF Styles ───────────────────────────────────────────────────────────────
const TEAL = '#007b8a'
const INK = '#111111'

const s = StyleSheet.create({
    page: {
        paddingTop: 28,
        paddingBottom: 28,
        paddingHorizontal: 36,
        fontFamily: 'Poppins',
        backgroundColor: '#ffffff',
    },
    watermark: {
        position: 'absolute',
        top: 90,
        left: 10,
        right: 10,
        bottom: 28,
        opacity: 0.5,
        objectFit: 'contain',
    },
    header: { alignItems: 'center', marginBottom: 14 },
    clinicName: {
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: 1.5,
        textAlign: 'center',
        color: TEAL,
    },
    clinicInfo: {
        fontSize: 9,
        textAlign: 'center',
        marginTop: 2,
        color: TEAL,
        fontWeight: 700,
    },
    divider: {
        borderBottomWidth: 1.2,
        borderBottomColor: TEAL,
        marginTop: 8,
        marginBottom: 14,
    },
    certTitle: {
        fontWeight: 700,
        fontSize: 14,
        textAlign: 'center',
        letterSpacing: 3,
        marginBottom: 14,
        color: INK,
    },
    toWhom: { fontWeight: 700, fontSize: 10, marginBottom: 12, color: INK },

    // ── Body (matches reference photo) ──
    text9: { fontWeight: 400, fontSize: 9, color: INK },
    text8: { fontWeight: 400, fontSize: 8, color: INK },
    line: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: INK,
        minHeight: 13,
        justifyContent: 'flex-end',
        paddingHorizontal: 2,
    },
    fieldCol: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
    ageCol: { flexGrow: 0, flexShrink: 0, marginLeft: 6 },
    lineValue: { fontWeight: 400, fontSize: 8.5, color: INK, lineHeight: 1.2 },
    caption: { fontWeight: 400, fontSize: 6.5, color: '#444444', textAlign: 'center' },

    treatmentLabel: { fontWeight: 700, fontSize: 9, color: INK, marginTop: 0, marginBottom: 6, lineHeight: 1.1 },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 5,
        paddingLeft: 18,
    },
    checkbox: {
        width: 10,
        height: 10,
        borderWidth: 1,
        borderColor: '#333333',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: { borderColor: TEAL, backgroundColor: TEAL },
    checkboxLabel: { fontWeight: 400, fontSize: 9, color: INK },
    blankLine: {
        width: 90,
        borderBottomWidth: 1,
        borderBottomColor: INK,
        minHeight: 12,
        marginLeft: 4,
        justifyContent: 'flex-end',
        paddingHorizontal: 2,
    },
    blankLineLong: { width: 130 },

    issued: { marginTop: 18, fontWeight: 400, fontSize: 8, color: INK, lineHeight: 1.5 },
    issuedBold: { fontWeight: 700 },

    footer: { marginTop: 22 },
    footerDoctorName: { fontWeight: 700, fontSize: 9, textAlign: 'right', color: TEAL },
    footerLabel: { fontWeight: 700, fontSize: 8, color: TEAL, textAlign: 'right', marginTop: 3 },
})

// ─── PDF Document ─────────────────────────────────────────────────────────────
interface CertificateDocProps {
    patient: Patient
    date: Date
    selectedTreatments: string[]
    details: Record<string, string>
    doctorName: string
    licenseNo: string
    ptrNo: string
    logoSrc: string
}

const INTRO_W = 150 // width of "THIS IS TO CERTIFY THAT"
const AGE_W = 34
const OF_W = 14
const UNDERGONE_W = 168

export function DentalCertificateDocument({
    patient,
    date,
    selectedTreatments,
    details,
    doctorName,
    licenseNo,
    ptrNo,
    logoSrc,
}: CertificateDocProps) {
    const fullName = [patient.first_name, patient.middle_name, patient.last_name]
        .filter(Boolean)
        .join(' ')
        .toUpperCase()

    const age = patient.age ? String(patient.age) : ''
    const address = patient.address || ''

    const day = date.getDate()
    const monthName = date.toLocaleString('en-US', { month: 'long' })
    const yearSuffix = String(date.getFullYear()).slice(2)

    return (
        <Document
            title={`Dental Certificate - ${fullName}`}
            author={doctorName}
            subject="Dental Certification"
        >
            <Page size="A5" style={s.page} wrap={false}>
                {/* Background watermark */}
                <Image src={logoSrc} style={s.watermark} fixed />

                {/* Header */}
                <View style={s.header}>
                    <Text style={s.clinicName}>{CLINIC_INFO.name}</Text>
                    <Text style={s.clinicInfo}>{CLINIC_INFO.address}</Text>
                    <Text style={s.clinicInfo}>{CLINIC_INFO.schedule}</Text>
                    <Text style={s.clinicInfo}>Tel.#{CLINIC_INFO.telephone}</Text>
                    <Text style={s.clinicInfo}>Mobile#{CLINIC_INFO.mobile}</Text>
                </View>
                <View style={s.divider} />

                <Text style={s.certTitle}>DENTAL CERTIFICATION</Text>
                <Text style={s.toWhom}>TO WHOM IT MAY CONCERN:</Text>

                {/* THIS IS TO CERTIFY THAT ______ (NAME)  ___ (AGE) */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
                    <Text style={[s.text9, { width: INTRO_W, paddingLeft: 14 }]}>
                        THIS IS TO CERTIFY THAT
                    </Text>

                    <View style={s.fieldCol}>
                        <View style={s.line}>
                            <Text style={s.lineValue}>{fullName}</Text>
                        </View>
                        <Text style={s.caption}>(NAME)</Text>
                    </View>

                    <View style={[s.ageCol, { width: AGE_W }]}>
                        <View style={s.line}>
                            <Text style={[s.lineValue, { textAlign: 'center' }]}>{age}</Text>
                        </View>
                        <Text style={s.caption}>(AGE)</Text>
                    </View>
                </View>

                {/* OF ______ (ADDRESS)   UNDERGONE THE FOLLOWING DENTAL */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Text style={[s.text9, { width: OF_W }]}>OF</Text>

                    <View style={s.fieldCol}>
                        <View style={s.line}>
                            <Text style={s.lineValue}>{address}</Text>
                        </View>
                        <Text style={s.caption}>(ADDRESS)</Text>
                    </View>

                    <Text style={[s.text8, { width: UNDERGONE_W, paddingLeft: 6 }]}>
                        UNDERGONE THE FOLLOWING DENTAL
                    </Text>
                </View>

                <Text style={s.treatmentLabel}>TREATMENT:</Text>

                {TREATMENTS.map(({ label, hasBlank }) => {
                    const checked = selectedTreatments.includes(label)
                    const value = checked ? details[label]?.trim() : ''
                    const isOthers = label === 'Others'
                    return (
                        <View key={label} style={s.checkboxRow}>
                            <View style={checked ? [s.checkbox, s.checkboxChecked] : s.checkbox}>
                                {checked && (
                                    <Svg width={7} height={7} viewBox="0 0 10 10">
                                        <Path
                                            d="M1.5 5.5 L4 8 L8.5 2"
                                            stroke="#ffffff"
                                            strokeWidth={1.8}
                                            fill="none"
                                        />
                                    </Svg>
                                )}
                            </View>
                            <Text style={s.checkboxLabel}>{label}{isOthers ? ':' : ''}</Text>
                            {hasBlank && (
                                <View style={isOthers ? [s.blankLine, s.blankLineLong] : s.blankLine}>
                                    {value ? <Text style={s.lineValue}>{value}</Text> : null}
                                </View>
                            )}
                        </View>
                    )
                })}

                {/* ISSUED THIS ... (single Text with nested spans = no wrap issues) */}
                <Text style={s.issued}>
                    {'     '}ISSUED THIS <Text style={s.issuedBold}>{day}</Text> DAY OF{' '}
                    <Text style={s.issuedBold}>{monthName}</Text>, 20
                    <Text style={s.issuedBold}>{yearSuffix}</Text>, upon request of the patient for
                    whatever purpose it may serve, except medico-legal purposes.
                </Text>

                {/* Footer */}
                <View style={s.footer}>
                    <Text style={s.footerDoctorName}>{(doctorName || '').toUpperCase()}</Text>
                    <Text style={s.footerLabel}>LICENSE NO. {licenseNo || ''}</Text>
                    {ptrNo?.trim() ? (
                        <Text style={s.footerLabel}>PTR NO. {ptrNo.trim()}</Text>
                    ) : null}
                </View>
            </Page>
        </Document>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface DentalCertificateButtonProps {
    patient: Patient
}

type ModalStep = 'form' | 'preview'

export default function DentalCertificateButton({ patient }: DentalCertificateButtonProps) {
    const [step, setStep] = useState<ModalStep | null>(null)
    const [selectedTreatments, setSelectedTreatments] = useState<string[]>([])
    const [details, setDetails] = useState<Record<string, string>>({})
    const [doctorName, setDoctorName] = useState('')
    const [licenseNo, setLicenseNo] = useState('')
    const [ptrNo, setPtrNo] = useState('')
    const [showDentistMenu, setShowDentistMenu] = useState(false)

    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [generating, setGenerating] = useState(false)
    const [genError, setGenError] = useState(false)
    const frameRef = useRef<HTMLIFrameElement>(null)

    const now = new Date()
    const today = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })

    const fullNameForFile = [patient.first_name, patient.middle_name, patient.last_name]
        .filter(Boolean)
        .join('_')
    const fileName = `DentalCertificate_${fullNameForFile}_${today.replace(/\//g, '-')}.pdf`

    const resetForm = () => {
        setSelectedTreatments([])
        setDetails({})
        setDoctorName('')
        setLicenseNo('')
        setPtrNo('')
    }

    const openForm = () => {
        resetForm()
        setStep('form')
    }

    const closeAll = () => {
        setStep(null)
        resetForm()
    }

    const toggleTreatment = (label: string) =>
        setSelectedTreatments(prev =>
            prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
        )

    const canPreview = Boolean(doctorName.trim())

    // ── Generate the PDF ONCE when entering preview ──
    useEffect(() => {
        if (step !== 'preview') return
        let cancelled = false
        let createdUrl: string | null = null

        setGenerating(true)
        setGenError(false)
        setPdfUrl(null)

        const run = async () => {
            try {
                const blob = await pdf(
                    <DentalCertificateDocument
                        patient={patient}
                        date={new Date()}
                        selectedTreatments={selectedTreatments}
                        details={details}
                        doctorName={doctorName}
                        licenseNo={licenseNo}
                        ptrNo={ptrNo}
                        logoSrc={`${window.location.origin}/mdc-logo.png`}
                    />
                ).toBlob()
                if (cancelled) return
                createdUrl = URL.createObjectURL(blob)
                setPdfUrl(createdUrl)
            } catch (err) {
                console.error('PDF generation failed:', err)
                if (!cancelled) setGenError(true)
            } finally {
                if (!cancelled) setGenerating(false)
            }
        }
        run()

        return () => {
            cancelled = true
            if (createdUrl) URL.revokeObjectURL(createdUrl)
        }
        // Form values can't change while the preview is open, so only `step` matters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step])

    const handlePrint = () => {
        const win = frameRef.current?.contentWindow
        if (!win) return
        win.focus()
        win.print()
    }

    const inputCls =
        'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white transition'
    const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={openForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-medium rounded-lg transition"
            >
                <Award className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Create Dental Certificate</span>
                <span className="sm:hidden">Cert</span>
            </button>

            {/* ── STEP 1: Form Modal ── */}
            {step === 'form' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Create Dental Certificate</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Patient:{' '}
                                    <span className="font-semibold text-gray-700">
                                        {patient.first_name} {patient.last_name}
                                    </span>
                                    {' · '}Date: <span className="font-semibold text-gray-700">{today}</span>
                                </p>
                            </div>
                            <button
                                onClick={closeAll}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                            {/* Dentist Information */}
                            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        Dentist Information
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowDentistMenu(p => !p)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                                                title="Auto-fill with a dentist's credentials"
                                            >
                                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                                Auto-fill Dentist
                                                <ChevronDown
                                                    className={`w-3.5 h-3.5 transition-transform ${showDentistMenu ? 'rotate-180' : ''}`}
                                                />
                                            </button>

                                            {showDentistMenu && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setShowDentistMenu(false)}
                                                    />
                                                    <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                                                        {DENTISTS.map(d => (
                                                            <button
                                                                key={d.licenseNo}
                                                                type="button"
                                                                onClick={() => {
                                                                    setDoctorName(d.name)
                                                                    setLicenseNo(d.licenseNo)
                                                                    setPtrNo(d.ptrNo)
                                                                    setShowDentistMenu(false)
                                                                }}
                                                                className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition"
                                                            >
                                                                <div className="text-xs font-semibold text-gray-800">{d.name}</div>
                                                                <div className="text-[11px] text-gray-500">License No. {d.licenseNo}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {(doctorName || licenseNo || ptrNo) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDoctorName('')
                                                    setLicenseNo('')
                                                    setPtrNo('')
                                                }}
                                                className="text-xs text-gray-400 hover:text-red-500 transition px-1"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        Dentist Name <span className="text-xs font-normal text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={doctorName}
                                        onChange={e => setDoctorName(e.target.value)}
                                        placeholder="e.g. Roselle Larga Piedad DMD"
                                        className={inputCls}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelCls}>License No.</label>
                                        <input
                                            type="text"
                                            value={licenseNo}
                                            onChange={e => setLicenseNo(e.target.value)}
                                            placeholder="e.g. 039277"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>PTR No.</label>
                                        <input
                                            type="text"
                                            value={ptrNo}
                                            onChange={e => setPtrNo(e.target.value)}
                                            placeholder="e.g. 32264627"
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Treatments */}
                            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                                <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">
                                    Dental Treatments
                                </span>
                                <p className="text-xs text-gray-500">Select all applicable treatments performed.</p>
                                <div className="space-y-2 mt-2">
                                    {TREATMENTS.map(({ label, hasBlank, placeholder }) => {
                                        const checked = selectedTreatments.includes(label)
                                        return (
                                            <div key={label}>
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleTreatment(label)}
                                                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 transition"
                                                    />
                                                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">
                                                        {label}
                                                    </span>
                                                </label>
                                                {hasBlank && checked && (
                                                    <input
                                                        type="text"
                                                        value={details[label] || ''}
                                                        onChange={e =>
                                                            setDetails(prev => ({ ...prev, [label]: e.target.value }))
                                                        }
                                                        placeholder={placeholder}
                                                        className={`${inputCls} mt-1.5 ml-7 !w-[calc(100%-1.75rem)]`}
                                                    />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

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
                                title={!canPreview ? 'Please enter the dentist name' : undefined}
                                className={`flex-1 py-2.5 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 ${canPreview ? 'bg-teal-500 hover:bg-teal-600' : 'bg-gray-300 cursor-not-allowed'
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
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Dental Certificate Preview</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Review before saving or printing</p>
                            </div>
                            <button
                                onClick={closeAll}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 bg-gray-100 relative">
                            {generating && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
                                    <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
                                    <span className="text-sm">Generating certificate…</span>
                                </div>
                            )}
                            {genError && (
                                <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500 px-6 text-center">
                                    Couldn&apos;t generate the PDF. Check that the fonts and logo exist in /public and try again.
                                </div>
                            )}
                            {pdfUrl && (
                                <iframe
                                    ref={frameRef}
                                    src={`${pdfUrl}#toolbar=0&navpanes=0`}
                                    title="Dental Certificate Preview"
                                    className="w-full h-full border-0"
                                />
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap gap-3 shrink-0 bg-gray-50/60">
                            <button
                                onClick={() => setStep('form')}
                                className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition"
                            >
                                ← Edit
                            </button>

                            <button
                                disabled={!pdfUrl}
                                onClick={handlePrint}
                                className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 ${pdfUrl
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                <Printer className="w-4 h-4" />
                                {generating ? 'Preparing...' : 'Print'}
                            </button>

                            <a
                                href={pdfUrl || undefined}
                                download={fileName}
                                aria-disabled={!pdfUrl}
                                className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 ${pdfUrl
                                    ? 'bg-teal-500 hover:bg-teal-600 text-white'
                                    : 'bg-gray-300 text-gray-500 pointer-events-none'
                                    }`}
                            >
                                <Download className="w-4 h-4" />
                                {generating ? 'Generating...' : 'Download PDF'}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}