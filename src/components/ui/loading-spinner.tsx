'use client'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
    /** Text label below the spinner */
    message?: string
    /** Renders as a full-page overlay (for initial page loads) */
    fullPage?: boolean
    /** Additional className for the container */
    className?: string
}

/**
 * Unified loading spinner used across all pages.
 *
 * Usage:
 *   <LoadingSpinner />                              — inline centered spinner
 *   <LoadingSpinner message="Loading patients…" />  — with label
 *   <LoadingSpinner fullPage />                      — full-page overlay
 */
export function LoadingSpinner({ message, fullPage = false, className }: LoadingSpinnerProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-3',
                fullPage
                    ? 'absolute inset-0 z-50 bg-white/80 backdrop-blur-sm'
                    : 'py-12 w-full',
                className
            )}
        >
            <div className="relative">
                {/* Outer ring */}
                <div className="w-10 h-10 rounded-full border-[3px] border-blue-100" />
                {/* Spinning arc */}
                <div className="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-transparent border-t-blue-600 animate-spin" />
            </div>
            {message && (
                <p className="text-sm font-medium text-gray-400 animate-pulse">
                    {message}
                </p>
            )}
        </div>
    )
}
