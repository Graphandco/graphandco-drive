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

export function EditSmartFolderDialog({
  open,
  onOpenChange,
  folder,
  existingTags = [],
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [availableTags, setAvailableTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const existingKeys = useMemo(
    () =>
      new Set(
        existingTags
          .filter((entry) => entry.toLowerCase() !== folder?.tag?.toLowerCase())
          .map((entry) => entry.toLowerCase())
      ),
    [existingTags, folder?.tag]
  );

  useEffect(() => {
    if (!open || !folder) return;

    setName(folder.name || "");
    setTag(folder.tag || "");
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

    for (const entry of [tag, ...(availableTags || [])]) {
      const value = String(entry || "").trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key) || existingKeys.has(key)) continue;
      seen.add(key);
      list.push(value);
    }

    return list.sort((a, b) => a.localeCompare(b, "fr"));
  }, [availableTags, tag, existingKeys]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!folder || saving) return;

    const nextName = name.trim();
    const nextTag = tag.trim();

    if (!nextName || !nextTag) {
      setError("Nom et tag requis.");
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
              Renommez l’entrée sidebar ou changez le tag filtré.
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
              <label className="text-sm text-muted-foreground" htmlFor="sf-tag">
                Tag
              </label>
              <Input
                id="sf-tag"
                value={tag}
                disabled={saving}
                onChange={(event) => setTag(event.target.value)}
                list="sf-tag-suggestions"
              />
              <datalist id="sf-tag-suggestions">
                {selectableTags.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
              {loadingTags ? (
                <p className="text-xs text-muted-foreground">Chargement des tags…</p>
              ) : null}
            </div>

            {selectableTags.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectableTags.slice(0, 12).map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    disabled={saving}
                    onClick={() => setTag(entry)}
                    className={cn(
                      "rounded-full border border-white/10 px-2.5 py-0.5 text-xs transition hover:border-primary/40 hover:bg-primary/10",
                      tag.toLowerCase() === entry.toLowerCase() &&
                        "border-primary/50 bg-primary/10"
                    )}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            ) : null}

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
            <Button type="submit" disabled={saving || !name.trim() || !tag.trim()}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
