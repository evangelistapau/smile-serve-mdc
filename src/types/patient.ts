import { Timestamp } from "next/dist/server/lib/cache-handlers/types"

export interface Patient {
    id?: string
    first_name: string
    last_name: string
    email: string
    phone: string
    date_of_birth: string
    address: string
    created_at?: Timestamp
}
