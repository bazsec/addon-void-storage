import * as React from "react"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"

interface ModalProps {
    open: boolean
    onClose: () => void
    children: React.ReactNode
    className?: string
}

export function Modal({ open, onClose, children, className }: ModalProps) {
    // Close on ESC key
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (open) {
            window.addEventListener('keydown', handleEsc)
            return () => window.removeEventListener('keydown', handleEsc)
        }
    }, [open, onClose])

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 no-drag"
                    />

                    {/* Modal Content */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none no-drag">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                                "relative bg-void-900 rounded-xl border border-void-accent-600/40 shadow-2xl pointer-events-auto max-w-2xl w-full max-h-[80vh] flex flex-col",
                                className
                            )}
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-void-800 transition-colors text-gray-400 hover:text-white z-10 no-drag"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {children}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
