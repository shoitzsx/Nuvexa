import { AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./Button";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  isOpen: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  isOpen,
  isLoading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          animate={{ opacity: 1 }}
          aria-labelledby="confirm-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          role="dialog"
          transition={{ duration: 0.2 }}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950"
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2 }}
          >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-negative-50 p-2 text-negative-600 dark:bg-negative-600/15">
            <AlertTriangle aria-hidden="true" size={22} />
          </div>
          <div>
            <h2
              className="text-lg font-semibold text-slate-950 dark:text-white"
              id="confirm-dialog-title"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button disabled={isLoading} onClick={onCancel} variant="secondary">
            Cancelar
          </Button>
          <Button isLoading={isLoading} onClick={onConfirm} variant="danger">
            {confirmLabel}
          </Button>
        </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
