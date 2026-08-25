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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { smartFolderHref } from "@/lib/drive";
import { formatTags } from "@/lib/tags";

export function CreateSmartFolderDialog({
  open,
  onOpenChange,
  space,
  existingTags = [],
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState("");

  const existingKeys = useMemo(
    () => new Set(existingTags.map((tag) => String(tag).toLowerCase())),
    [existingTags]
  );

  const availableTags = useMemo(
    () => tags.filter((tag) => !existingKeys.has(tag.toLowerCase())),
    [tags, existingKeys]
  );

  const selectedList = useMemo(
    () => availableTags.filter((tag) => selected.has(tag.toLowerCase())),
    [availableTags, selected]
  );

  useEffect(() => {
    if (!open || !space) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    setSelected(new Set());

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

  function toggleTag(tag) {
    const key = tag.toLowerCase();
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function onCreate() {
    if (!space || creating || !selectedList.length) return;

    setCreating(true);
    setError("");

    try {
      const result = await createSmartFolder({
        space,
        tags: selectedList,
      });
      if (!result.success) {
        setError(result.error || "Impossible de créer le dossier intelligent.");
        return;
      }

      toast.success(`Dossier « ${result.data.name} » créé`);
      onOpenChange(false);
      router.push(smartFolderHref(space, result.data.id));
      router.refresh();
    } catch (pickError) {
      setError(
        pickError?.message || "Impossible de créer le dossier intelligent."
      );
    } finally {
      setCreating(false);
    }
  }

  const previewName =
    selectedList.length > 1
      ? selectedList.join(" + ")
      : selectedList[0] || "";

  const previewTag = formatTags(selectedList);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#100e0b]">
        <DialogHeader>
          <DialogTitle>Nouveau dossier intelligent</DialogTitle>
          <DialogDescription>
            Sélectionnez un ou plusieurs tags (AND) : seules les images
            possédant tous les tags seront listées.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : availableTags.length ? (
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {availableTags.map((tag) => {
              const active = selected.has(tag.toLowerCase());
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={creating}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-primary/10",
                    active && "border-primary/50 bg-primary/10"
                  )}
                >
                  <span>{tag}</span>
                  {active ? (
                    <span className="text-xs text-primary">Sélectionné</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            {tags.length
              ? "Toutes les combinaisons de tags actifs ont déjà un dossier intelligent."
              : "Aucun tag actif dans cet espace. Ajoutez des tags à vos images d’abord."}
          </p>
        )}

        {selectedList.length ? (
          <p className="text-xs text-muted-foreground">
            Aperçu : « {previewName} » ({previewTag})
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Fermer
          </Button>
          <Button
            type="button"
            disabled={creating || !selectedList.length}
            onClick={onCreate}
          >
            {creating ? <Loader2 className="animate-spin" /> : null}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
