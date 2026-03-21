import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/adminClient'
import * as jose from 'jose'

// httpSMS event types we care about
const STATUS_MAP: Record<string, string> = {
    'message.phone.sent': 'sent',
    'message.send.failed': 'failed',
    'message.send.expired': 'failed',
}

export async function POST(req: NextRequest) {
    // ── 1. Verify JWT signature ────────────────────────────────
    const signingKey = process.env.HTTPSMS_WEBHOOK_SIGNING_KEY
    if (!signingKey) {
        console.error('HTTPSMS_WEBHOOK_SIGNING_KEY is not set')
        return Response.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')

    if (!token) {
        return Response.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    try {
        const secret = new TextEncoder().encode(signingKey)
        await jose.jwtVerify(token, secret)
    } catch (err) {
        console.error('Webhook JWT verification failed:', err)
        return Response.json({ error: 'Invalid token' }, { status: 401 })
    }

    // ── 2. Parse the CloudEvent body ──────────────────────────
    const event = await req.json()
    const eventType: string = req.headers.get('X-Event-Type') ?? event.type ?? ''
    const newStatus = STATUS_MAP[eventType]

    if (!newStatus) {
        // Unrecognised event — acknowledge and ignore
        return Response.json({ ok: true })
    }

    // httpSMS CloudEvent data shape for message events
    const data = event.data ?? {}
    const messageId: string = data.id ?? data.message_id ?? ''

    if (!messageId) {
        console.error('Webhook missing message id in payload:', JSON.stringify(event))
        return Response.json({ error: 'Missing message id' }, { status: 400 })
    }

    // ── 3. Upsert status in sms_logs ─────────────────────────
    const { error } = await supabaseAdmin
        .from('sms_logs')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('message_id', messageId)

    if (error) {
        console.error('Failed to update sms_logs:', error.message)
        // Still return 200 so httpSMS doesn't retry endlessly
    }

    return Response.json({ ok: true })
}
