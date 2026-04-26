'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { Menu } from 'lucide-react'
import { LoadingSpinner } from './ui/loading-spinner'

const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/appointments': 'Appointments',
    '/patients': 'Patients',
    '/patient-details': 'Patients',
    '/sms': 'SMS Settings',
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
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

    // Public pages that don't need the sidebar
    const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/reset-password' || pathname === '/patient-booking'
    // Login-only pages that authenticated users should NOT access
    const isLoginPage = pathname === '/' || pathname === '/login'

    useEffect(() => {
        // Check if the URL hash contains a recovery token (from Supabase password reset email)
        const hasRecoveryToken = typeof window !== 'undefined' &&
            window.location.hash.includes('type=recovery')

        const check = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setAuthenticated(true)
                // Don't redirect to dashboard if this is a recovery flow
                if (isLoginPage && !hasRecoveryToken) {
                    router.push('/dashboard')
                    return
                }
            } else if (!isPublicPage) {
                router.push('/')
            }
            setChecking(false)
        }

        check()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // On PASSWORD_RECOVERY, redirect to reset-password page
            if (event === 'PASSWORD_RECOVERY') {
                setAuthenticated(true)
                router.push('/reset-password' + window.location.hash)
                return
            }
            if (session) {
                setAuthenticated(true)
                if (isLoginPage && !hasRecoveryToken) router.push('/dashboard')
            } else {
                setAuthenticated(false)
                if (!isPublicPage) router.push('/')
            }
        })

        return () => subscription.unsubscribe()
    }, [router, isPublicPage, isLoginPage])

    // Absolute Session Timeout (Time-boxing to 8 hours)
    useEffect(() => {
        if (!authenticated || isPublicPage) return;

        const checkSessionTimeout = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && session.user.last_sign_in_at) {
                const signInTime = new Date(session.user.last_sign_in_at).getTime();
                const maxSessionTimeMs = 8 * 60 * 60 * 1000; // 8 Hours

                if (Date.now() - signInTime > maxSessionTimeMs) {
                    supabase.auth.signOut().then(() => {
                        // Clean up legacy local storage item just in case
                        localStorage.removeItem('active_session_day');
                        window.location.href = '/?session_expired=true';
                    });
                }
            }
        };

        // Check immediately on load/navigation
        checkSessionTimeout();

        // Also check every minute in the background while they have the tab open
        const interval = setInterval(checkSessionTimeout, 60000);

        return () => clearInterval(interval);
    }, [authenticated, isPublicPage]);

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileSidebarOpen(false)
    }, [pathname])

    // Login pages: wait for auth check; if authenticated, show nothing while redirect fires
    if (isLoginPage) {
        if (checking || authenticated) return null
        return <>{children}</>
    }

    // Other public pages — render directly, no sidebar
    if (isPublicPage) {
        return <>{children}</>
    }

    // Still checking auth for a protected page
    if (checking) {
        return <LoadingSpinner fullPage message="Verifying session…" />
    }

    // Not authenticated — the redirect will fire from the effect
    if (!authenticated) {
        return null
    }

    const pageTitle = pageTitles[pathname] || 'Dashboard'

    // Authenticated — sidebar + content
    return (
        <div className="flex min-h-[100dvh] md:h-screen bg-gray-50">
            <Sidebar
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col md:overflow-hidden min-w-0">
                {/* Top Bar */}
                <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 shadow-sm flex items-center gap-3">
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileSidebarOpen(true)}
                        className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-600"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">{pageTitle}</h2>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-3 md:p-6 relative">
                    {children}
                </div>
            </div>
        </div>
    )
}
