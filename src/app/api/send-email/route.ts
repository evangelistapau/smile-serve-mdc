import { NextRequest } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (body.type === "booking_confirmation") {
        const { patientName, patientEmail, appointmentDate, appointmentTime, purpose } = body;

        if (!patientEmail) {
            return Response.json({ error: "No email provided" }, { status: 400 });
        }

        const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 32px 24px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
                        ✅ Booking Confirmed
                    </h1>
                    <p style="color: #dbeafe; margin: 8px 0 0; font-size: 14px;">
                        Your appointment has been successfully booked.
                    </p>
                </div>

                <div style="padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
                        Hi <strong>${patientName}</strong>, here are your appointment details:
                    </p>

                    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">📅 Date</td>
                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${appointmentDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">⏰ Time</td>
                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${appointmentTime}</td>
                            </tr>
                            ${purpose ? `
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">🏥 Purpose</td>
                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${purpose}</td>
                            </tr>
                            ` : ""}
                        </table>
                    </div>

                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">
                        If you need to reschedule, please call or text at least <strong>1 day in advance</strong>, or <strong>2 hours</strong> before your appointment.
                    </p>

                    <p style="color: #6b7280; font-size: 13px; margin: 0;">
                        Thank you and keep safe!
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

                    <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
                        Modern Dentistry Clinic
                    </p>
                </div>
            </div>
        `;

        try {
            const { data, error } = await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || "Modern Dentistry Clinic <onboarding@resend.dev>",
                to: [patientEmail],
                subject: `Appointment Confirmed — ${appointmentDate} at ${appointmentTime}`,
                html: htmlContent,
            });

            if (error) {
                console.error("Resend API error:", error);
                return Response.json({ error: error.message }, { status: 500 });
            }

            console.log("Confirmation email sent:", data);
            return Response.json({ success: true, data });
        } catch (err) {
            console.error("Error sending email:", err);
            return Response.json({ error: "Failed to send email" }, { status: 500 });
        }
    }

    return Response.json({ error: "Unknown email type" }, { status: 400 });
}
