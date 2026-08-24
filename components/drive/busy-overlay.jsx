"use client";

import { Loader2 } from "lucide-react";

/** Overlay léger pendant les suppressions / vidages (feedback “pas planté”). */
export function BusyOverlay({
  show,
  label = "Traitement en cours…",
}) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#14110e]/95 px-5 py-3.5 text-sm text-white shadow-2xl">
        <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
        <span>{label}</span>
      </div>
    </div>
  );
}
