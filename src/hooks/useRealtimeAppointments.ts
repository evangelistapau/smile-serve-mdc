'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

/**
 * Subscribe to real-time changes on the `appointment` and
 * `unavailable_slots` tables.  Calls `onUpdate` whenever any
 * INSERT / UPDATE / DELETE is detected so the consuming
 * component can re-fetch its data.
 *
 * Uses a ref for the callback so the subscription channel is
 * only created once (stable across re-renders), and a unique
 * channel name to avoid conflicts with React Strict Mode.
 */
export function useRealtimeAppointments(onUpdate: () => void) {
    const callbackRef = useRef(onUpdate)
    callbackRef.current = onUpdate

    useEffect(() => {
        const channelName = `appointments-realtime-${Date.now()}`

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'appointment' },
                (payload) => {
                    console.log('[Realtime] appointment change:', payload)
                    callbackRef.current()
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'unavailable_slots' },
                (payload) => {
                    console.log('[Realtime] unavailable_slots change:', payload)
                    callbackRef.current()
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] channel status:', status)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, []) // runs once — callback accessed via ref
}
