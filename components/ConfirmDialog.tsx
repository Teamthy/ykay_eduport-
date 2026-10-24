"use client";

import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AlertTriangle, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButtonRef.current?.focus();
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (!busy) onCancel();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter(
      (element) =>
        element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden",
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (!dialogRef.current?.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const variantStyles = {
    danger: { bg: "bg-red-500/10", text: "text-red-500", btn: "bg-red-500 hover:bg-red-600" },
    warning: {
      bg: "bg-brand-orange/10",
      text: "text-brand-orange",
      btn: "bg-brand-orange hover:bg-brand-orange-dark",
    },
    info: {
      bg: "bg-brand-green/10",
      text: "text-brand-green",
      btn: "bg-brand-green hover:bg-brand-green-dark",
    },
  }[variant];

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => {
            if (!busy) onCancel();
          }}
        >
          <m.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={messageId}
            aria-busy={busy || undefined}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleDialogKeyDown}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              aria-label="Close dialog"
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={20} />
            </button>
            <div
              className={`w-14 h-14 rounded-2xl ${variantStyles.bg} ${variantStyles.text} flex items-center justify-center mb-4`}
            >
              <AlertTriangle size={26} />
            </div>
            <h3 id={titleId} className="font-display text-2xl text-[var(--text-primary)] mb-3">
              {title}
            </h3>
            <p id={messageId} className="text-sm text-[var(--text-secondary)] mb-6">
              {message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="px-5 py-2.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-disabled)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                aria-busy={busy || undefined}
                className={`px-5 py-2.5 rounded-xl text-white text-sm font-bold ${variantStyles.btn} transition-colors disabled:cursor-wait disabled:opacity-60`}
              >
                {confirmText}
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
