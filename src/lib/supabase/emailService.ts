// ─── Send Booking Confirmation Email ─────────────────────────

export async function sendBookingConfirmationEmail(
    patientName: string,
    patientEmail: string,
    appointmentDate: string,
    appointmentTime: string,
    purpose?: string
): Promise<boolean> {
    if (!patientEmail) return false

    try {
        const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'booking_confirmation',
                patientName,
                patientEmail,
                appointmentDate,
                appointmentTime,
                purpose: purpose || '',
            }),
        })

        if (!res.ok) {
            console.error('Email send failed with status:', res.status)
            return false
        }

        console.log('Booking confirmation email sent successfully')
        return true
    } catch (err) {
        console.error('Error sending booking confirmation email:', err)
        return false
    }
}
