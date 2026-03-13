import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

export async function POST(req: NextRequest) {
    const body = await req.json();

    // If booking details are provided, build the message from the template
    if (body.type === "booking_confirmation") {
        const { patientName, patientPhone, appointmentDate, appointmentTime } = body;

        // Read SMS settings using service role (bypasses RLS)
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from("sms_settings")
            .select("sender_number, confirmed_booking_message")
            .eq("id", 1)
            .single();

        if (settingsError || !settings) {
            console.error("Failed to read SMS settings:", settingsError?.message);
            return Response.json(
                { error: "SMS settings not configured" },
                { status: 500 }
            );
        }

        if (!settings.sender_number) {
            return Response.json(
                { error: "Sender number not configured" },
                { status: 400 }
            );
        }

        const message = (settings.confirmed_booking_message || "")
            .replace(/{patient_name}/g, patientName)
            .replace(/{appointment_date}/g, appointmentDate)
            .replace(/{appointment_time}/g, appointmentTime);

        return await sendSms(patientPhone, message, settings.sender_number);
    }

    // ─── Booking Reminder (scheduled 5 hours before appointment) ──
    if (body.type === "booking_reminder") {
        const { patientName, patientPhone, appointmentDate, appointmentTime, appointmentDateISO } = body;

        const { data: settings, error: settingsError } = await supabaseAdmin
            .from("sms_settings")
            .select("sender_number, reminder_message")
            .eq("id", 1)
            .single();

        if (settingsError || !settings) {
            console.error("Failed to read SMS settings:", settingsError?.message);
            return Response.json(
                { error: "SMS settings not configured" },
                { status: 500 }
            );
        }

        if (!settings.sender_number) {
            return Response.json(
                { error: "Sender number not configured" },
                { status: 400 }
            );
        }

        const message = (settings.reminder_message || "")
            .replace(/{patient_name}/g, patientName)
            .replace(/{appointment_date}/g, appointmentDate)
            .replace(/{appointment_time}/g, appointmentTime);

        // Compute send_at = appointment datetime − 5 hours (Philippine +08:00)
        const sendAt = computeReminderTime(appointmentDateISO, appointmentTime);
        console.log("Scheduling reminder SMS at:", sendAt);

        return await sendSms(patientPhone, message, settings.sender_number, sendAt);
    }

    // Direct SMS send (phone, message, from provided by caller)
    const { phone, message, from } = body;
    return await sendSms(phone, message, from);
}

/**
 * Compute the ISO 8601 send_at time = appointment datetime − 5 hours.
 * appointmentDate: "2026-03-15"  appointmentTime: "10:00 AM"
 * Returns e.g. "2026-03-15T05:00:00+08:00"
 */
function computeReminderTime(appointmentDate: string, appointmentTime: string): string {
    const [timeStr, period] = appointmentTime.split(" ");
    const [hours, minutes] = timeStr.split(":").map(Number);
    let hour24 = hours;
    if (period === "PM" && hours !== 12) hour24 += 12;
    else if (period === "AM" && hours === 12) hour24 = 0;

    // Build a Date in Philippine timezone (+08:00)
    const isoString = `${appointmentDate}T${String(hour24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+08:00`;
    const appointmentMs = new Date(isoString).getTime();
    const reminderMs = appointmentMs - 5 * 60 * 60 * 1000; // minus 5 hours

    // Format back to ISO 8601 with +08:00 offset
    const d = new Date(reminderMs);
    // Convert UTC to +08:00
    const phMs = d.getTime() + 8 * 60 * 60 * 1000;
    const ph = new Date(phMs);
    const yyyy = ph.getUTCFullYear();
    const mm = String(ph.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(ph.getUTCDate()).padStart(2, "0");
    const hh = String(ph.getUTCHours()).padStart(2, "0");
    const mi = String(ph.getUTCMinutes()).padStart(2, "0");
    const ss = String(ph.getUTCSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+08:00`;
}

async function sendSms(phone: string, message: string, from: string, sendAt?: string) {
    // Format Philippine number
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith("0"))
        formattedPhone = "+63" + formattedPhone.slice(1);
    else if (
        formattedPhone.startsWith("63") &&
        !formattedPhone.startsWith("+")
    )
        formattedPhone = "+" + formattedPhone;

    const payload: Record<string, unknown> = {
        content: message,
        encrypted: false,
        from: from || "",
        request_id: crypto.randomUUID(),
        to: formattedPhone,
    };

    if (sendAt) {
        payload.send_at = sendAt;
    }

    const res = await fetch("https://api.httpsms.com/v1/messages/send", {
        method: "POST",
        headers: {
            "x-api-Key": process.env.HTTPSMS_API_KEY || "",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("API response:", data);
    return Response.json(data, { status: res.status });
}
