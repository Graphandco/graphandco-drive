"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createSmartFolder, listActiveTags } from "@/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { smartFolderHref } from "@/lib/drive";

export function CreateSmartFolderDialog({
  open,
  onOpenChange,
  space,
  existingTags = [],
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(null);
  const [tags, setTags] = useState([]);
  const [error, setError] = useState("");

  const existingKeys = useMemo(
    () => new Set(existingTags.map((tag) => String(tag).toLowerCase())),
    [existingTags]
  );

  const availableTags = useMemo(
    () => tags.filter((tag) => !existingKeys.has(tag.toLowerCase())),
    [tags, existingKeys]
  );

  useEffect(() => {
    if (!open || !space) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    listActiveTags({ space }).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setError(result.error || "Impossible de charger les tags.");
        setTags([]);
      } else {
        setTags(result.data || []);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, space]);

  async function onPickTag(tag) {
    if (!space || creating) return;

    setCreating(tag);
    setError("");

    try {
      const result = await createSmartFolder({ space, tag });
      if (!result.success) {
        setError(result.error || "Impossible de créer le dossier intelligent.");
        return;
      }

      toast.success(`Dossier « ${result.data.name} » créé`);
      onOpenChange(false);
      router.push(smartFolderHref(space, result.data.id));
      router.refresh();
    } catch (pickError) {
      setError(pickError?.message || "Impossible de créer le dossier intelligent.");
    } finally {
      setCreating(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#100e0b]">
        <DialogHeader>
          <DialogTitle>Nouveau dossier intelligent</DialogTitle>
          <DialogDescription>
            Choisissez un tag : toutes les images taguées y seront listées
            automatiquement.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : availableTags.length ? (
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {availableTags.map((tag) => {
              const pending = creating === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={Boolean(creating)}
                  onClick={() => onPickTag(tag)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-primary/10",
                    pending && "border-primary/50 bg-primary/10"
                  )}
                >
                  <span>{tag}</span>
                  {pending ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            {tags.length
              ? "Tous les tags actifs ont déjà un dossier intelligent."
              : "Aucun tag actif dans cet espace. Ajoutez des tags à vos images d’abord."}
          </p>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={Boolean(creating)}
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
