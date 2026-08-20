'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, Check, UserCheck, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'
import { formatDentistName, updateDentists } from '@/lib/supabase/settingsService'

interface DentistModalProps {
    isOpen: boolean
    onClose: () => void
    initialDentists: string[]
    onDentistsUpdated: (updatedDentists: string[]) => void
}

export default function DentistModal({
    isOpen,
    onClose,
    initialDentists,
    onDentistsUpdated,
}: DentistModalProps) {
    const [dentists, setDentists] = useState<string[]>([])
    const [newName, setNewName] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Inline edit state
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editingValue, setEditingValue] = useState('')

    // Synchronize local state with props when modal opens or initialDentists changes
    useEffect(() => {
        if (isOpen) {
            setDentists(initialDentists || [])
            setNewName('')
            setEditingIndex(null)
            setEditingValue('')
        }
    }, [isOpen, initialDentists])

    if (!isOpen) return null

    // ─── Save Changes to Database ─────────────────────────────
    const saveDentistsList = async (updatedList: string[]) => {
        setIsSaving(true)
        try {
            const success = await updateDentists(updatedList)
            if (success) {
                setDentists(updatedList)
                onDentistsUpdated(updatedList)
                return true
            } else {
                toast.error('Failed to update dentists list in database.')
                return false
            }
        } catch (err) {
            console.error('Error saving dentists:', err)
            toast.error('An error occurred while saving.')
            return false
        } finally {
            setIsSaving(false)
        }
    }

    // ─── Add Dentist ──────────────────────────────────────────
    const handleAddDentist = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const formatted = formatDentistName(newName)

        if (!formatted) {
            toast.error('Please enter a valid dentist name.')
            return
        }

        // Prevent exact duplicates
        if (dentists.some((d) => d.toLowerCase() === formatted.toLowerCase())) {
            toast.error(`${formatted} is already in the list.`)
            return
        }

        const nextDentists = [...dentists, formatted]
        const saved = await saveDentistsList(nextDentists)
        if (saved) {
            toast.success(`Added ${formatted}`)
            setNewName('')
        }
    }

    // ─── Start Edit ───────────────────────────────────────────
    const handleStartEdit = (index: number, currentName: string) => {
        setEditingIndex(index)
        setEditingValue(currentName)
    }

    // ─── Save Edit ────────────────────────────────────────────
    const handleSaveEdit = async (index: number) => {
        const formatted = formatDentistName(editingValue)

        if (!formatted) {
            toast.error('Dentist name cannot be empty.')
            return
        }

        // Prevent duplicates with other items
        const isDuplicate = dentists.some(
            (d, idx) => idx !== index && d.toLowerCase() === formatted.toLowerCase()
        )
        if (isDuplicate) {
            toast.error(`${formatted} is already in the list.`)
            return
        }

        const nextDentists = [...dentists]
        nextDentists[index] = formatted

        const saved = await saveDentistsList(nextDentists)
        if (saved) {
            toast.success(`Updated dentist name to ${formatted}`)
            setEditingIndex(null)
            setEditingValue('')
        }
    }

    // ─── Cancel Edit ──────────────────────────────────────────
    const handleCancelEdit = () => {
        setEditingIndex(null)
        setEditingValue('')
    }

    // ─── Delete Dentist ───────────────────────────────────────
    const handleDeleteDentist = async (index: number) => {
        const removedName = dentists[index]
        const nextDentists = dentists.filter((_, idx) => idx !== index)
        const saved = await saveDentistsList(nextDentists)
        if (saved) {
            toast.success(`Removed ${removedName}`)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-blue-100 transform transition-all">
                {/* ═══ Header ═══ */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-blue-100 bg-gradient-to-r from-blue-50/60 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                            <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Dentist List</h3>
                            <p className="text-xs text-gray-500">Add, edit, or remove clinic dentists</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ═══ Content ═══ */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Add Dentist Form */}
                    <form onSubmit={handleAddDentist} className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Add New Dentist
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Enter dentist name"
                                    disabled={isSaving}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-50"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving || !newName.trim()}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:hover:bg-blue-600 flex-shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                        <p className="text-[11px] text-gray-400 italic">
                            * Prefix <span className="font-semibold text-blue-600">"Dr."</span> will automatically be added if omitted.
                        </p>
                    </form>

                    <div className="border-t border-gray-100 my-4" />

                    {/* Dentist List */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Current Dentists ({dentists.length})
                            </span>
                        </div>

                        {dentists.length === 0 ? (
                            <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <UserCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm font-medium text-gray-500">No dentists added yet</p>
                                <p className="text-xs text-gray-400 mt-0.5">Use the input above to add your first dentist</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {dentists.map((dentist, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-blue-50/40 hover:bg-blue-50/80 border border-blue-100/80 rounded-xl transition group"
                                    >
                                        {editingIndex === index ? (
                                            <div className="flex items-center gap-2 flex-1 mr-2">
                                                <input
                                                    type="text"
                                                    value={editingValue}
                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                    placeholder="Edit dentist name"
                                                    autoFocus
                                                    className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button
                                                    onClick={() => handleSaveEdit(index)}
                                                    disabled={isSaving}
                                                    className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                                                    title="Save"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    disabled={isSaving}
                                                    className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
                                                    title="Cancel"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-900 truncate">
                                                        {dentist}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleStartEdit(index, dentist)}
                                                        disabled={isSaving}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100/60 rounded-lg transition"
                                                        title="Edit dentist"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDentist(index)}
                                                        disabled={isSaving}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="Delete dentist"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* ═══ Footer ═══ */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
