import { supabase } from './client'

// ─── Types ───────────────────────────────────────────────────

export interface AccountInfo {
    email: string
    displayName: string | null
}

export interface LoginHistoryEntry {
    id: string
    createdAt: string
    device: string
    ipAddress: string
    status: string
}

// ─── User-Agent Parser ──────────────────────────────────────

function parseUserAgent(ua: string): string {
    if (!ua) return 'Unknown Device'

    let browser = 'Unknown Browser'
    let os = 'Unknown OS'

    if (ua.includes('Edg/') || ua.includes('Edge')) browser = 'Edge'
    else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera'
    else if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'

    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

    return `${browser} on ${os}`
}

// ─── Account Info (from auth) ──────────────

export async function getAccountInfo(): Promise<AccountInfo | null> {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        console.error('Error fetching user:', error?.message)
        return null
    }

    return {
        email: user.email || '',
        displayName: user.user_metadata?.display_name || null,
    }
}

// ─── Update Profile ─────────────────────────────────────────

export async function updateDisplayName(displayName: string): Promise<boolean> {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error('Error fetching user:', authError?.message)
        return false
    }

    const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
    })

    if (error) {
        console.error('Error updating profile:', error.message)
        return false
    }

    return true
}

// ─── Record Login ───────────────────────────────────────────

export async function recordLogin(): Promise<void> {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return

    // Get IP address from a public API
    let ipAddress = 'Unknown'
    try {
        const res = await fetch('https://api.ipify.org?format=json')
        const data = await res.json()
        ipAddress = data.ip || 'Unknown'
    } catch {
        // Silently fail — IP is non-critical
    }

    const device = parseUserAgent(navigator.userAgent)

    await supabase.from('login_history').insert({
        user_id: user.id,
        device,
        ip_address: ipAddress,
        status: 'success',
    })
}

// ─── Login History ──────────────────────────────────────────

export async function getLoginHistory(limit = 20): Promise<LoginHistoryEntry[]> {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return []

    const { data, error } = await supabase
        .from('login_history')
        .select('id, created_at, device, ip_address, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching login history:', error.message)
        return []
    }

    return (data || []).map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        device: row.device,
        ipAddress: row.ip_address,
        status: row.status,
    }))
}

// ─── Brevo ───────────────────────────────────────────────────

export interface BrevoEmailLimit {
    planType: string
    credits: number | null
}

export async function getBrevoEmailLimit(): Promise<BrevoEmailLimit | null> {
    try {
        const res = await fetch('/api/brevo/limit')
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

// ─── Supabase DB Size ─────────────────────────────────────────
export interface DbSizeInfo {
    bytes: number
    pretty: string  // e.g. "47 MB"
}

export async function getDbSize(): Promise<DbSizeInfo | null> {
    try {
        const { data, error } = await supabase.rpc('get_db_size')
        if (error || !data) return null
        return data as DbSizeInfo
    } catch {
        return null
    }
}
