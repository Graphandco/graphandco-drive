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
  alwaysVisible = false,
  interactive = true,
  variant = "grid",
  className,
  onChanged,
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(null);
  const favorite =
    optimistic != null ? optimistic : isFavoriteValue(file?.is_favorite);
  const lightbox = variant === "lightbox";

  function onToggle(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!interactive || !file?.id || pending) return;

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

  if (!interactive) {
    if (!favorite) return null;
    return (
      <span
        aria-hidden
        className={cn(
          "pointer-events-none inline-flex size-6 items-center justify-center rounded-full bg-black/55 text-red-500 shadow-sm",
          className,
        )}
      >
        <Heart className="size-3" fill="currentColor" />
      </span>
    );
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
        "pointer-events-auto shrink-0 border-0 shadow-sm",
        lightbox
          ? cn(
              "size-8 bg-white text-black hover:bg-white/90 hover:text-black",
              favorite && "text-red-500 hover:text-red-500",
            )
          : cn(
              "bg-black/55 text-white hover:bg-black/70 hover:text-white",
              favorite && "bg-black/60 text-red-500 hover:text-red-400",
              !alwaysVisible && !favorite && "opacity-0 group-hover:opacity-100",
              (alwaysVisible || favorite) && "opacity-100",
            ),
        className,
      )}
      onClick={onToggle}
    >
      <Heart
        className={cn(
          lightbox ? "size-3.5" : compact ? "size-3" : "size-4",
        )}
        fill={favorite ? "currentColor" : "none"}
      />
    </Button>
  );
}
