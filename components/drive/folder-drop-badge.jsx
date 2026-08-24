"use client";

import { cn } from "@/lib/utils";

/** Badge + vert (assigner) ou − rouge (déplacer avec Shift). */
export function FolderDropBadge({ mode = "assign", className }) {
  const isMove = mode === "move";

  return (
    <span
      className={cn(
        "pointer-events-none absolute -top-1.5 -right-1.5 z-30 flex size-5 items-center justify-center rounded-full text-xs font-bold text-white shadow-md",
        isMove ? "bg-red-500" : "bg-emerald-500",
        className
      )}
      aria-hidden
    >
      {isMove ? "−" : "+"}
    </span>
  );
}
