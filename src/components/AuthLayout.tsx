'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/appointments': 'Appointments',
    '/patients': 'Patients',
    '/sms': 'SMS Notifications',
    '/settings': 'Settings',
}

/**
 * Wraps authenticated pages with the sidebar.
 * Shows a loading state while checking auth; redirects to "/" if not logged in.
 * Public routes (/ and /login) are rendered without the sidebar.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [checking, setChecking] = useState(true)
    const [authenticated, setAuthenticated] = useState(false)

    // Public pages that don't need the sidebar
    const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/reset-password'

    useEffect(() => {
        const check = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setAuthenticated(true)
            } else if (!isPublicPage) {
                router.push('/')
            }
            setChecking(false)
        }

        check()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                setAuthenticated(true)
            } else {
                setAuthenticated(false)
                if (!isPublicPage) router.push('/')
            }
        })

        return () => subscription.unsubscribe()
    }, [router, isPublicPage])

    // Public pages — render directly, no sidebar
    if (isPublicPage) {
        return <>{children}</>
    }

    // Still checking auth for a protected page
    if (checking) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <p>Loading…</p>
            </div>
        )
    }

    // Not authenticated — the redirect will fire from the effect
    if (!authenticated) {
        return null
    }

    const pageTitle = pageTitles[pathname] || 'Dashboard'

    // Authenticated — sidebar + content
    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900">{pageTitle}</h2>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}
