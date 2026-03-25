import { NextRequest, NextResponse } from 'next/server'
import { sendBookingConfirmationEmail } from '@/lib/brevo/emailService'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { patientName, patientEmail, readableDate, appointmentTime, purpose } = body

        if (!patientName || !patientEmail || !readableDate || !appointmentTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        await sendBookingConfirmationEmail({
            patientName,
            patientEmail,
            readableDate,
            appointmentTime,
            purpose,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Email send error:', error)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
}