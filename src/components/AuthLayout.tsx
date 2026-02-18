'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

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
    const isPublicPage = pathname === '/' || pathname === '/login'

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

    // Authenticated — sidebar + content
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    )
}
