'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    Settings,
    Bell,
    LogOut,
    X,
    ChevronLeft,
    ChevronRight,
    Sliders,
} from 'lucide-react'

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Appointments', href: '/appointments', icon: CalendarDays },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'SMS Notifications', href: '/sms', icon: Bell },
    { label: 'Account Settings', href: '/settings', icon: Sliders },
]

interface SidebarProps {
    mobileOpen?: boolean
    onMobileClose?: () => void
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState(true)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const handleNavClick = () => {
        // Close mobile sidebar on navigation
        if (onMobileClose) onMobileClose()
    }

    const sidebarContent = (
        <div
            className={`${sidebarOpen ? 'w-64' : 'w-20'
                } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-sm h-full`}
        >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    {sidebarOpen && (
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="SmileServe Logo" className="w-8 h-8 object-contain" />
                            <h1 className="text-xl font-bold text-blue-600">SmileServe</h1>
                        </div>
                    )}
                    {/* Desktop: collapse toggle with chevrons. Mobile: close with X */}
                    {/* Desktop: collapse toggle with chevrons */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-gray-600 hover:bg-gray-100 hidden md:flex"
                    >
                        {sidebarOpen
                            ? <ChevronLeft className="w-5 h-5" />
                            : <ChevronRight className="w-5 h-5" />
                        }
                    </Button>

                    {/* Mobile: close with X */}
                    {onMobileClose && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onMobileClose}
                            className="text-gray-600 hover:bg-gray-100 md:hidden"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map(({ label, href, icon: Icon }) => {
                    const isActive = pathname === href
                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={handleNavClick}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all no-underline ${isActive
                                ? 'bg-blue-500 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            title={!sidebarOpen ? label : undefined}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {sidebarOpen && (
                                <span className="text-sm font-medium">{label}</span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer with Logout */}
            <div className="p-4 border-t border-gray-200">
                <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full flex items-center gap-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && (
                        <span className="text-sm font-medium">Logout</span>
                    )}
                </Button>
            </div>
        </div>
    )

    return (
        <>
            {/* Desktop sidebar — always visible on md+ */}
            <div className="hidden md:flex" style={{ minHeight: '100vh' }}>
                {sidebarContent}
            </div>

            {/* Mobile sidebar — overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={onMobileClose}
                    />
                    {/* Sidebar panel */}
                    <div className="relative z-50 h-full w-64 animate-in slide-in-from-left duration-300">
                        {sidebarContent}
                    </div>
                </div>
            )}
        </>
    )
}
