import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const res = await fetch('https://api.brevo.com/v3/account', {
            headers: {
                accept: 'application/json',
                'api-key': process.env.BREVO_API_KEY || '',
            },
            next: { revalidate: 300 },
        })
        
        if (!res.ok) return NextResponse.json(null)
        
        const data = await res.json()
        const emailPlan = (data.plan as any[]).find(
            (p) => p.creditsType === 'sendLimit' && p.type !== 'sms'
        )

        return NextResponse.json({
            planType: emailPlan?.type ?? 'unknown',
            credits: emailPlan?.credits ?? null,
        })
    } catch (error) {
        console.error('Brevo API error:', error)
        return NextResponse.json(null)
    }
}
