"use client";

import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Confirmation contrôlée basée sur shadcn Alert Dialog.
 * open / onOpenChange + onConfirm.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  pending = false,
  pendingLabel = "Traitement en cours…",
  onConfirm,
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange?.(next);
      }}
    >
      <AlertDialogContent className="border-0 bg-[#14110e] text-white shadow-2xl ring-0 outline-none">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="whitespace-pre-line text-white/70">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        {pending ? (
          <div
            className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/80"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            <span>{pendingLabel}</span>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={pending}
            className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className={
              destructive
                ? "bg-destructive text-white hover:bg-destructive/90"
                : undefined
            }
            onClick={(event) => {
              event.preventDefault();
              if (pending) return;
              onConfirm?.();
            }}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? "Patientez…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
