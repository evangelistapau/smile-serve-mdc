'use client'

import { Trash2, X } from 'lucide-react'

interface DeletePatientModalProps {
    isOpen: boolean
    patientName: string
    onConfirm: () => void
    onClose: () => void
    deleting?: boolean
}

export default function DeletePatientModal({
    isOpen,
    patientName,
    onConfirm,
    onClose,
    deleting = false,
}: DeletePatientModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={!deleting ? onClose : undefined}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
                {/* Close button */}
                <button
                    onClick={onClose}
                    disabled={deleting}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Icon */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                    <Trash2 className="w-6 h-6 text-red-600" />
                </div>

                {/* Title & message */}
                <h2 className="text-base font-bold text-gray-900 text-center mb-1">Delete Patient</h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold text-gray-800">{patientName}</span>?
                    <br />
                    <span className="text-xs text-red-500">This action cannot be undone.</span>
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={deleting}
                        className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {deleting ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
