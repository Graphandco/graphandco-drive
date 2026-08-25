"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Folder, Home, Loader2 } from "lucide-react";

import { getSidebarFolderTrees, moveItems } from "@/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSpaceConfig, SPACES } from "@/lib/drive";
import { cn } from "@/lib/utils";

function flattenFolders(nodes, depth = 0, acc = []) {
  for (const node of nodes || []) {
    acc.push({ ...node, depth });
    if (node.children?.length) {
      flattenFolders(node.children, depth + 1, acc);
    }
  }
  return acc;
}

export function BulkMoveDialog({
  open,
  onOpenChange,
  selectedItems = [],
  sourceFolderId = null,
  pending = false,
  onMove,
}) {
  const [loading, setLoading] = useState(false);
  const [trees, setTrees] = useState(null);
  const [error, setError] = useState("");
  const [moving, setMoving] = useState(false);

  const fileItems = useMemo(
    () => selectedItems.filter((item) => item.kind === "file"),
    [selectedItems]
  );
  const folderItems = useMemo(
    () => selectedItems.filter((item) => item.kind === "folder"),
    [selectedItems]
  );

  const spaces = useMemo(
    () => [...new Set(fileItems.map((item) => item.space).filter(Boolean))],
    [fileItems]
  );

  const folderSpaces = useMemo(
    () => [...new Set(folderItems.map((item) => item.space).filter(Boolean))],
    [folderItems]
  );

  const targetSpace = useMemo(() => {
    const all = [...new Set([...spaces, ...folderSpaces])];
    return all.length === 1 ? all[0] : null;
  }, [spaces, folderSpaces]);

  const folders = useMemo(() => {
    if (!trees || !targetSpace) return [];
    return flattenFolders(trees[targetSpace] || []);
  }, [trees, targetSpace]);

  useEffect(() => {
    if (!open) return;

    setError("");
    setLoading(true);
    getSidebarFolderTrees().then((result) => {
      if (!result.success) {
        setTrees({ sixmyk: [], public: [], regis: [] });
        setError(result.error || "Impossible de charger les dossiers.");
      } else {
        setTrees(result.data);
      }
      setLoading(false);
    });
  }, [open]);

  async function onPickFolder(folderId) {
    if (moving || pending) return;

    setMoving(true);
    setError("");

    try {
      const result = await moveItems({
        targetFolderId: folderId,
        fileIds: fileItems.map((item) => item.id),
        folderIds: folderItems.map((item) => item.id),
        fileMode: "move",
        sourceFolderId,
      });

      if (!result.success) {
        setError(result.error || "Déplacement impossible.");
        return;
      }

      onMove?.(result);
      onOpenChange(false);
    } finally {
      setMoving(false);
    }
  }

  const spaceLabel = targetSpace
    ? getSpaceConfig(targetSpace).label
    : null;
  const rootId = targetSpace
    ? getSpaceConfig(targetSpace).rootFolderId
    : null;
  const busy = moving || pending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="border-white/10 bg-[#161310] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Déplacer vers dossier…</DialogTitle>
          <DialogDescription className="text-white/60">
            {fileItems.length + folderItems.length} élément
            {fileItems.length + folderItems.length > 1 ? "s" : ""} sélectionné
            {fileItems.length + folderItems.length > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        {!targetSpace ? (
          <p className="text-sm text-muted-foreground">
            Sélectionnez des éléments d’un seul espace ({Object.values(SPACES)
              .map((s) => s.label)
              .join(", ")}).
          </p>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => onPickFolder(rootId)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-primary/10",
                busy && "opacity-60"
              )}
            >
              <Home className="size-4 shrink-0 text-primary" />
              <span>{spaceLabel} (accueil)</span>
            </button>

            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                disabled={busy}
                onClick={() => onPickFolder(folder.id)}
                className={cn(
                  "flex w-full items-center gap-1 rounded-lg border border-white/10 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-primary/10",
                  busy && "opacity-60"
                )}
                style={{ paddingLeft: `${12 + folder.depth * 14}px`, paddingRight: 12 }}
              >
                {folder.depth > 0 ? (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                ) : null}
                <Folder className="size-4 shrink-0 text-primary" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}

            {!folders.length ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aucun sous-dossier dans {spaceLabel}.
              </p>
            ) : null}
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            className="text-white/70 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
