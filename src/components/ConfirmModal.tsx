import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white w-full max-w-sm rounded-r-lg shadow-2xl overflow-hidden border border-border"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  variant === 'danger' ? "bg-red-50 text-red-600" :
                  variant === 'warning' ? "bg-accent-light text-[#7a5400]" :
                  "bg-blue-50 text-blue-600"
                )}>
                  <AlertTriangle size={24} />
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-ink3 hover:text-ink hover:bg-surface2 rounded-md transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-display font-bold text-ink">{title}</h3>
                <p className="text-sm text-ink3 leading-relaxed">{message}</p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-surface2 text-ink2 text-sm font-bold rounded-r-sm hover:bg-border transition-all disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 px-4 py-2.5 text-white text-sm font-bold rounded-r-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2",
                    variant === 'danger' ? "bg-red-600 hover:bg-red-700" :
                    variant === 'warning' ? "bg-accent hover:bg-accent-mid" :
                    "bg-brand hover:bg-brand-mid"
                  )}
                >
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
