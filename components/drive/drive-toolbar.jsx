"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Loader2, Trash2, Upload } from "lucide-react";

import { createFolder, emptyTrash, trashFolder } from "@/actions";
import { BusyOverlay } from "@/components/drive/busy-overlay";
import { ConfirmDialog } from "@/components/drive/confirm-dialog";
import { DriveViewToggle } from "@/components/drive/drive-view-toggle";
import { useBusyAction } from "@/hooks/use-busy-action";
import { getSpaceConfig } from "@/lib/drive";
import {
  collectFileListEntries,
  uploadEntryTree,
} from "@/lib/upload-drop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DriveToolbar({
  folderId,
  folderName,
  isRootFolder = false,
  space,
  view,
  layout = "list",
  onLayoutChange,
  smartFolderMode = false,
  trashCount = 0,
}) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const { isBusy: pending, startTransition, runBusy } = useBusyAction();
  const [mode, setMode] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [confirm, setConfirm] = useState(null);
  const spaceConfig = getSpaceConfig(space);

  function runConfirm(action) {
    runBusy(async () => {
      setError("");
      await action();
      setConfirm(null);
    });
  }

  if (view === "trash") {
    return (
      <div className="flex flex-col gap-3">
        <BusyOverlay
          show={pending}
          label="Vidage de la corbeille…"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || trashCount === 0}
            onClick={() =>
              setConfirm({
                type: "empty-trash",
                title: "Vider la corbeille ?",
                description: `${trashCount} élément${
                  trashCount > 1 ? "s" : ""
                } seront définitivement supprimés (y compris sur S3).\nCette action est irréversible.`,
                confirmLabel: "Vider la corbeille",
              })
            }
            className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200"
          >
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Vider la corbeille
          </Button>
          {typeof onLayoutChange === "function" ? (
            <DriveViewToggle layout={layout} onChange={onLayoutChange} />
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <ConfirmDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => {
            if (!open && !pending) setConfirm(null);
          }}
          title={confirm?.title}
          description={confirm?.description}
          confirmLabel={confirm?.confirmLabel || "Confirmer"}
          destructive
          pending={pending}
          pendingLabel="Vidage de la corbeille…"
          onConfirm={() => {
            if (confirm?.type !== "empty-trash") return;
            runConfirm(async () => {
              const result = await emptyTrash();
              if (!result.success) {
                setError(result.error || "Impossible de vider la corbeille.");
                return;
              }
              startTransition(() => {
                router.refresh();
              });
            });
          }}
        />
      </div>
    );
  }

  if (view !== "browse") {
    if (typeof onLayoutChange !== "function") return null;
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <DriveViewToggle layout={layout} onChange={onLayoutChange} />
      </div>
    );
  }

  if (smartFolderMode) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {typeof onLayoutChange === "function" ? (
          <DriveViewToggle layout={layout} onChange={onLayoutChange} />
        ) : null}
      </div>
    );
  }

  function closeForm() {
    setMode(null);
    setName("");
    setError("");
  }

  function onCreateFolder(event) {
    event.preventDefault();
    const value = name.trim();
    if (!value) {
      setError("Le nom est requis.");
      return;
    }

    runBusy(async () => {
      const result = await createFolder({
        name: value,
        parentId: folderId,
        space,
      });

      if (!result.success) {
        setError(result.error || "Création impossible.");
        return;
      }

      closeForm();
      startTransition(() => {
        router.refresh();
      });
    });
  }

  function onPickFiles() {
    fileInputRef.current?.click();
  }

  function onFilesSelected(event) {
    const entries = collectFileListEntries(event.target.files);
    event.target.value = "";
    if (!entries.length) return;

    const target = {
      space,
      folderId,
      location: spaceConfig.storageLocation,
    };

    runBusy(async () => {
      setError("");
      setStatus(`Upload 0/${entries.length}…`);

      const result = await uploadEntryTree(entries, target, {
        onProgress: ({ done, total }) => {
          setStatus(`Upload ${done}/${total}…`);
        },
      });

      setStatus("");
      if (result.errors.length) {
        setError(result.errors.join(" · "));
      }
      startTransition(() => {
        router.refresh();
      });
    });
  }

  const folderLabel = folderName || "ce dossier";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "folder" ? "secondary" : "outline"}
            disabled={pending}
            onClick={() => {
              setMode((current) => (current === "folder" ? null : "folder"));
              setError("");
            }}
          >
            <FolderPlus />
            Nouveau dossier
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={onPickFiles}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Upload />}
            Importer
          </Button>
          {!isRootFolder ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              disabled={pending}
              aria-label="Supprimer le dossier"
              title="Supprimer le dossier"
              onClick={() =>
                setConfirm({
                  type: "delete-folder",
                  title: "Supprimer ce dossier ?",
                  description: `« ${folderLabel} » et tout son contenu seront envoyés à la corbeille.`,
                  confirmLabel: "Supprimer",
                })
              }
              className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200"
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
        {typeof onLayoutChange === "function" ? (
          <DriveViewToggle layout={layout} onChange={onLayoutChange} />
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFilesSelected}
        />
      </div>

      {mode === "folder" ? (
        <form
          onSubmit={onCreateFolder}
          className="flex max-w-lg flex-col gap-2 sm:flex-row sm:items-center"
        >
          <Input
            autoFocus
            value={name}
            disabled={pending}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nom du dossier"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : "Créer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={closeForm}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : null}

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirm(null);
        }}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel || "Confirmer"}
        destructive
        pending={pending}
        onConfirm={() => {
          if (confirm?.type !== "delete-folder") return;
          runConfirm(async () => {
            const result = await trashFolder(folderId);
            if (!result.success) {
              setError(result.error || "Suppression impossible.");
              return;
            }
            router.push(spaceConfig.basePath);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
