"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  FolderSearch,
  Loader2,
  Pencil,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  createSmartFolder,
  mergeTagsInSpace,
  renameTag,
} from "@/actions";
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
import { getSpaceConfig, smartFolderHref, SPACES } from "@/lib/drive";
import { cn } from "@/lib/utils";

const SPACE_OPTIONS = [
  { key: "all", label: "Tous" },
  ...Object.values(SPACES).map((space) => ({
    key: space.key,
    label: space.label,
  })),
];

function TagRenameDialog({ open, onOpenChange, entry, onDone }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open && entry) {
      setValue(entry.tag);
      setError("");
    }
  }, [open, entry]);

  function handleSubmit(event) {
    event.preventDefault();
    const next = value.trim();
    if (!next) {
      setError("Le tag est requis.");
      return;
    }
    if (next.toLowerCase() === entry.tag.toLowerCase()) {
      onOpenChange(false);
      return;
    }

    startTransition(async () => {
      const result = await renameTag({
        space: entry.space,
        fromTag: entry.tag,
        toTag: next,
      });
      if (!result.success) {
        setError(result.error || "Renommage impossible.");
        return;
      }
      toast.success(`Tag renommé (${result.data.updated} fichier(s) mis à jour)`);
      onOpenChange(false);
      onDone();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="border-white/10 bg-[#161310] sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Renommer le tag</DialogTitle>
            <DialogDescription>
              Tous les fichiers de {getSpaceConfig(entry?.space).label} tagués «{" "}
              {entry?.tag} » seront mis à jour.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <Input
              autoFocus
              value={value}
              disabled={pending}
              onChange={(event) => setValue(event.target.value)}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending || !value.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Renommer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TagMergeDialog({ open, onOpenChange, entries, onDone }) {
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const space = entries[0]?.space;

  useEffect(() => {
    if (open && entries.length) {
      setTarget(entries[0].tag);
      setError("");
    }
  }, [open, entries]);

  function handleSubmit(event) {
    event.preventDefault();
    const next = target.trim();
    if (!next) {
      setError("Tag cible requis.");
      return;
    }

    startTransition(async () => {
      const result = await mergeTagsInSpace({
        space,
        sourceTags: entries.map((entry) => entry.tag),
        targetTag: next,
      });
      if (!result.success) {
        setError(result.error || "Fusion impossible.");
        return;
      }
      toast.success(`Tags fusionnés (${result.data.updated} fichier(s) mis à jour)`);
      onOpenChange(false);
      onDone();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="border-white/10 bg-[#161310] sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Fusionner {entries.length} tags</DialogTitle>
            <DialogDescription>
              Les tags sélectionnés seront remplacés par un seul tag dans{" "}
              {getSpaceConfig(space).label}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <Input
              autoFocus
              value={target}
              disabled={pending}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="Tag cible"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending || !target.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Fusionner
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TagsPanel({ initialTags = [], error = null }) {
  const router = useRouter();
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [renameEntry, setRenameEntry] = useState(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [creatingSmart, setCreatingSmart] = useState(null);

  const filtered = useMemo(
    () =>
      initialTags.filter(
        (entry) => spaceFilter === "all" || entry.space === spaceFilter
      ),
    [initialTags, spaceFilter]
  );

  const selectedEntries = useMemo(() => {
    if (!selectedKeys.size) return [];
    return filtered.filter((entry) =>
      selectedKeys.has(`${entry.space}:${entry.tag.toLowerCase()}`)
    );
  }, [filtered, selectedKeys]);

  const mergeSpace = selectedEntries[0]?.space;
  const canMerge =
    mergeMode &&
    selectedEntries.length >= 2 &&
    selectedEntries.every((entry) => entry.space === mergeSpace);

  function refresh() {
    router.refresh();
    setSelectedKeys(new Set());
    setMergeMode(false);
  }

  async function onCreateSmartFolder(entry) {
    if (creatingSmart) return;
    setCreatingSmart(entry.tag);

    try {
      const result = await createSmartFolder({
        space: entry.space,
        tag: entry.tag,
        name: entry.tag,
      });
      if (!result.success) {
        toast.error(result.error || "Création impossible");
        return;
      }
      toast.success(`Smart folder « ${result.data.name} » créé`);
      router.refresh();
    } finally {
      setCreatingSmart(null);
    }
  }

  function toggleSelect(entry) {
    const key = `${entry.space}:${entry.tag.toLowerCase()}`;
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-lg font-medium">Tags</h1>
        <p className="text-sm text-muted-foreground">
          Vue globale des tags actifs, renommage et fusion par espace.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SPACE_OPTIONS.map((option) => (
          <Button
            key={option.key}
            type="button"
            size="sm"
            variant={spaceFilter === option.key ? "secondary" : "outline"}
            onClick={() => {
              setSpaceFilter(option.key);
              setSelectedKeys(new Set());
            }}
          >
            {option.label}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          {mergeMode ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setMergeMode(false);
                  setSelectedKeys(new Set());
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!canMerge}
                onClick={() => setMergeOpen(true)}
              >
                <ArrowRightLeft />
                Fusionner ({selectedEntries.length})
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMergeMode(true)}
            >
              <ArrowRightLeft />
              Fusionner…
            </Button>
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {filtered.length ? (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <ul className="divide-y divide-white/10">
            {filtered.map((entry) => {
              const key = `${entry.space}:${entry.tag.toLowerCase()}`;
              const selected = selectedKeys.has(key);
              const pendingSmart = creatingSmart === entry.tag;

              return (
                <li
                  key={key}
                  className={cn(
                    "flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap",
                    selected && "bg-primary/10"
                  )}
                >
                  {mergeMode ? (
                    <input
                      type="checkbox"
                      checked={selected}
                      className="size-4 shrink-0 accent-primary"
                      onChange={() => toggleSelect(entry)}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{entry.tag}</p>
                    <p className="text-xs text-muted-foreground">
                      {getSpaceConfig(entry.space).label}
                      <span className="mx-1.5 text-white/20">·</span>
                      {entry.fileCount} fichier
                      {entry.fileCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {entry.smartFolderId ? (
                      <Button
                        asChild
                        type="button"
                        size="sm"
                        variant="ghost"
                      >
                        <Link href={smartFolderHref(entry.space, entry.smartFolderId)}>
                          <FolderSearch />
                          Smart folder
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={Boolean(creatingSmart)}
                        onClick={() => onCreateSmartFolder(entry)}
                      >
                        {pendingSmart ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Sparkles />
                        )}
                        Smart folder
                      </Button>
                    )}
                    {!mergeMode ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Renommer ${entry.tag}`}
                        onClick={() => setRenameEntry(entry)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun tag actif{spaceFilter !== "all" ? " dans cet espace" : ""}.
        </p>
      )}

      <TagRenameDialog
        open={Boolean(renameEntry)}
        onOpenChange={(open) => !open && setRenameEntry(null)}
        entry={renameEntry}
        onDone={refresh}
      />

      <TagMergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        entries={selectedEntries}
        onDone={refresh}
      />
    </div>
  );
}
