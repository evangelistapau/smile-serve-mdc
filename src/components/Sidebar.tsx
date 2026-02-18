'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    Settings,
    MessageSquare,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Appointments', href: '/appointments', icon: CalendarDays },
    { label: 'Account Settings', href: '/settings', icon: Settings },
    { label: 'SMS Settings', href: '/sms', icon: MessageSquare },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [collapsed, setCollapsed] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    return (
        <aside
            style={{
                width: collapsed ? '68px' : '250px',
                minHeight: '100vh',
                background: '#111827',
                color: '#f9fafb',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.25s ease',
                overflow: 'hidden',
                flexShrink: 0,
            }}
        >
            {/* Header / Toggle */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    padding: '1rem',
                    borderBottom: '1px solid #1f2937',
                }}
            >
                {!collapsed && (
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                        🦷 Dental Clinic
                    </span>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '0.5rem 0' }}>
                {navItems.map(({ label, href, icon: Icon }) => {
                    const isActive = pathname === href
                    return (
                        <Link
                            key={href}
                            href={href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: collapsed ? '0.75rem 0' : '0.75rem 1rem',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                color: isActive ? '#ffffff' : '#9ca3af',
                                background: isActive ? '#1f2937' : 'transparent',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                                fontWeight: isActive ? 600 : 400,
                                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap',
                            }}
                            title={collapsed ? label : undefined}
                        >
                            <Icon size={20} style={{ flexShrink: 0 }} />
                            {!collapsed && label}
                        </Link>
                    )
                })}
            </nav>

            {/* Logout */}
            <div style={{ borderTop: '1px solid #1f2937', padding: '0.5rem 0' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: collapsed ? '0.75rem 0' : '0.75rem 1rem',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        color: '#f87171',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        width: '100%',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                    }}
                    title={collapsed ? 'Logout' : undefined}
                >
                    <LogOut size={20} style={{ flexShrink: 0 }} />
                    {!collapsed && 'Logout'}
                </button>
            </div>
        </aside>
    )
}
