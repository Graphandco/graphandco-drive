"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { listActiveTags, updateSmartFolder } from "@/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatTags, parseTags } from "@/lib/tags";

export function EditSmartFolderDialog({
  open,
  onOpenChange,
  folder,
  existingTags = [],
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [availableTags, setAvailableTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const existingKeys = useMemo(
    () =>
      new Set(
        existingTags
          .filter(
            (entry) =>
              entry.toLowerCase() !== String(folder?.tag || "").toLowerCase()
          )
          .map((entry) => entry.toLowerCase())
      ),
    [existingTags, folder?.tag]
  );

  useEffect(() => {
    if (!open || !folder) return;

    setName(folder.name || "");
    setSelected(
      new Set(parseTags(folder.tag).map((tag) => tag.toLowerCase()))
    );
    setError("");
    setLoadingTags(true);

    listActiveTags({ space: folder.space }).then((result) => {
      if (result.success) {
        setAvailableTags(result.data || []);
      } else {
        setAvailableTags([]);
      }
      setLoadingTags(false);
    });
  }, [open, folder]);

  const selectableTags = useMemo(() => {
    const seen = new Set();
    const list = [];

    for (const entry of [...parseTags(folder?.tag), ...availableTags]) {
      const value = String(entry || "").trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(value);
    }

    return list.sort((a, b) => a.localeCompare(b, "fr"));
  }, [availableTags, folder?.tag]);

  const selectedList = useMemo(
    () => selectableTags.filter((tag) => selected.has(tag.toLowerCase())),
    [selectableTags, selected]
  );

  function toggleTag(tag) {
    const key = tag.toLowerCase();
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!folder || saving) return;

    const nextName = name.trim();
    const nextTag = formatTags(selectedList);

    if (!nextName || !nextTag) {
      setError("Nom et au moins un tag requis.");
      return;
    }

    if (existingKeys.has(nextTag.toLowerCase())) {
      setError("Un dossier intelligent existe déjà pour cette combinaison.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result = await updateSmartFolder({
        id: folder.id,
        name: nextName,
        tag: nextTag,
      });

      if (!result.success) {
        setError(result.error || "Modification impossible.");
        return;
      }

      toast.success(`Dossier « ${result.data.name} » mis à jour`);
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md border-white/10 bg-[#100e0b]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier le dossier intelligent</DialogTitle>
            <DialogDescription>
              Renommez l’entrée sidebar ou modifiez les tags filtrés (AND).
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="sf-name">
                Nom affiché
              </label>
              <Input
                id="sf-name"
                value={name}
                disabled={saving}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tags (AND)</p>
              {loadingTags ? (
                <p className="text-xs text-muted-foreground">
                  Chargement des tags…
                </p>
              ) : selectableTags.length ? (
                <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                  {selectableTags.map((entry) => {
                    const active = selected.has(entry.toLowerCase());
                    return (
                      <button
                        key={entry}
                        type="button"
                        disabled={saving}
                        onClick={() => toggleTag(entry)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-primary/10",
                          active && "border-primary/50 bg-primary/10"
                        )}
                      >
                        <span>{entry}</span>
                        {active ? (
                          <span className="text-xs text-primary">Actif</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Aucun tag disponible.
                </p>
              )}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim() || !selectedList.length}
            >
              {saving ? <Loader2 className="animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
