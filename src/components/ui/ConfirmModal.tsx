import { AlertTriangle, Info, Trash2, RefreshCw } from "lucide-react"
import { Modal } from "./Modal"
import { Button } from "./Button"
import { motion } from "framer-motion"

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: ConfirmVariant
    isLoading?: boolean
}

export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "warning",
    isLoading = false
}: ConfirmModalProps) {

    const getIcon = () => {
        switch (variant) {
            case 'danger': return <Trash2 className="h-6 w-6 text-red-500" />
            case 'warning': return <AlertTriangle className="h-6 w-6 text-orange-500" />
            case 'info': return <RefreshCw className="h-6 w-6 text-emerald-500" />
            case 'success': return <Info className="h-6 w-6 text-void-accent-400" />
            default: return <Info className="h-6 w-6 text-void-accent-400" />
        }
    }

    const getBtnVariant = () => {
        if (variant === 'danger') return 'destructive';
        if (variant === 'info') return 'default'; // We can use emerald via className if needed
        return 'default';
    }

    return (
        <Modal open={open} onClose={onClose} className="max-w-md">
            <div className="p-6 flex flex-col items-center text-center space-y-4">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`p-3 rounded-full bg-void-950 border border-void-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]`}
                >
                    {getIcon()}
                </motion.div>

                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white tracking-tight italic uppercase">
                        {title}
                    </h2>
                    <p className="text-sm text-gray-400 leading-relaxed px-4">
                        {message}
                    </p>
                </div>

                <div className="flex gap-3 w-full pt-2">
                    <Button
                        variant="ghost"
                        className="flex-1 hover:bg-void-800 text-gray-400"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={getBtnVariant()}
                        className={`flex-1 ${variant === 'info' ? 'bg-emerald-600 hover:bg-emerald-500' : ''}`}
                        onClick={() => {
                            onConfirm();
                            // Note: onClose is usually handled by the parent after confirm
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Processing..." : confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
