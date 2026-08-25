"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { toggleFileFavorite } from "@/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isFavoriteValue(value) {
  return value === true || value === 1 || value === "1";
}

export function FavoriteButton({
  file,
  compact = false,
  className,
  onChanged,
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(null);
  const favorite =
    optimistic != null ? optimistic : isFavoriteValue(file?.is_favorite);

  function onToggle(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!file?.id || pending) return;

    const next = !favorite;
    setOptimistic(next);

    startTransition(async () => {
      const result = await toggleFileFavorite(file.id);
      if (!result?.success) {
        setOptimistic(favorite);
        toast.error(result?.error || "Impossible de mettre à jour le favori.");
        return;
      }
      setOptimistic(Boolean(result.data?.is_favorite));
      onChanged?.(file.id, Boolean(result.data?.is_favorite));
    });
  }

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      disabled={pending}
      aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={favorite}
      data-item-actions
      className={cn(
        "pointer-events-auto shrink-0 border-0 bg-black/55 text-white shadow-sm hover:bg-black/70 hover:text-white",
        favorite && "bg-black/60 text-red-500 hover:text-red-400",
        !favorite && "opacity-0 group-hover:opacity-100",
        favorite && "opacity-100",
        className
      )}
      onClick={onToggle}
    >
      <Heart
        className={compact ? "size-3.5" : "size-4"}
        fill={favorite ? "currentColor" : "none"}
      />
    </Button>
  );
}
