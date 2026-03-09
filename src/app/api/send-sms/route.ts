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

    // Direct SMS send (phone, message, from provided by caller)
    const { phone, message, from } = body;
    return await sendSms(phone, message, from);
}

async function sendSms(phone: string, message: string, from: string) {
    // Format Philippine number
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith("0"))
        formattedPhone = "+63" + formattedPhone.slice(1);
    else if (
        formattedPhone.startsWith("63") &&
        !formattedPhone.startsWith("+")
    )
        formattedPhone = "+" + formattedPhone;

    const res = await fetch("https://api.httpsms.com/v1/messages/send", {
        method: "POST",
        headers: {
            "x-api-Key": process.env.HTTPSMS_API_KEY || "",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            content: message,
            encrypted: false,
            from: from || "",
            request_id: crypto.randomUUID(),
            to: formattedPhone,
        }),
    });

    const data = await res.json();
    console.log("API response:", data);
    return Response.json(data, { status: res.status });
}
