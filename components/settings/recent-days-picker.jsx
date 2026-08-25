"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_RECENT_DAYS,
  RECENT_DAYS_OPTIONS,
  resolveRecentDays,
  writeRecentDaysCookie,
} from "@/lib/recent-settings";
import { cn } from "@/lib/utils";

export function RecentDaysPicker({ initialDays = DEFAULT_RECENT_DAYS }) {
  const router = useRouter();
  const [days, setDays] = useState(() => resolveRecentDays(initialDays));

  function onPick(next) {
    const resolved = writeRecentDaysCookie(next);
    setDays(resolved);
    toast.success(
      `Récents : fichiers des ${resolved} dernier${resolved > 1 ? "s" : ""} jour${
        resolved > 1 ? "s" : ""
      }`
    );
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-base font-medium">Fichiers récents</h2>
        <p className="text-sm text-muted-foreground">
          Durée pendant laquelle un fichier modifié apparaît dans Gestion →
          Récents.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {RECENT_DAYS_OPTIONS.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={days === option ? "secondary" : "outline"}
            className={cn(days === option && "ring-1 ring-primary/40")}
            onClick={() => onPick(option)}
          >
            {option} j
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Actuellement : {days} jour{days > 1 ? "s" : ""}
      </p>
    </section>
  );
}
