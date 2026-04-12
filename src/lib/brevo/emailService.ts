import { BrevoClient } from '@getbrevo/brevo'
import { createClient } from '@supabase/supabase-js'

// ─── Brevo client setup ───────────────────────────────────────

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY!
})

const DEFAULT_SENDER = {
  name: process.env.BREVO_SENDER_NAME!,
  email: process.env.BREVO_SENDER_EMAIL!
}


// ─── Types ───────────────────────────────────────────────────

interface BookingConfirmationParams {
  patientName: string
  patientEmail: string
  readableDate: string
  appointmentTime: string
  purpose?: string
}

// ─── Send booking confirmation email ─────────────────────────

export async function sendBookingConfirmationEmail({
  patientName,
  patientEmail,
  readableDate,
  appointmentTime,
  purpose,
}: BookingConfirmationParams): Promise<void> {
  // Fetch clinic mobile number from account_settings
  let clinicPhone = ''
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('account_settings')
      .select('mobile_number')
      .limit(1)
      .single()
    clinicPhone = data?.mobile_number || ''
  } catch {
    // Non-critical — will omit number from email
  }

  await brevo.transactionalEmails.sendTransacEmail({
    sender: DEFAULT_SENDER,
    to: [{ email: patientEmail, name: patientName }],
    subject: `Appointment Confirmed – ${readableDate} at ${appointmentTime}`,
    htmlContent: buildConfirmationHtml({
      patientName,
      readableDate,
      appointmentTime,
      purpose,
      clinicPhone,
    }),
  })
}

// ─── HTML template ───────────────────────────────────────────

function buildConfirmationHtml({
  patientName,
  readableDate,
  appointmentTime,
  purpose,
  clinicPhone,
}: Omit<BookingConfirmationParams, 'patientEmail'> & { clinicPhone: string }) {
  const phoneText = clinicPhone ? `call or text us at ${clinicPhone}` : 'contact us'
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
      <h2 style="color: #3b82f6; margin-bottom: 8px;">Appointment Confirmed !</h2>
      <p style="color: #374151;">Hi <strong>${patientName}</strong>,</p>
      <p style="color: #374151;">Your appointment has been successfully booked. Here are your details:</p>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">Date</p>
        <p style="margin: 0 0 12px; font-weight: 600; color: #111827;">${readableDate}</p>
        <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">Time</p>
        <p style="margin: 0 0 12px; font-weight: 600; color: #111827;">${appointmentTime}</p>
        ${purpose ? `
        <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">Purpose</p>
        <p style="margin: 0; font-weight: 600; color: #111827;">${purpose}</p>
        ` : ''}
      </div>

      <p style="color: #6b7280; font-size: 13px;">
        If you need to reschedule or cancel, please ${phoneText} at least 1 day in advance, or 2 hours before your appointment. Thank you and keep safe!
      </p>
    </div>
  `
}