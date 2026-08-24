"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { getSpaceConfig } from "@/lib/drive";
import {
  collectDataTransferEntries,
  uploadEntryTree,
} from "@/lib/upload-drop";
import { cn } from "@/lib/utils";

function resolveUploadTarget(pathname, searchParams) {
  for (const spaceKey of ["sixmyk", "public", "regis"]) {
    const space = getSpaceConfig(spaceKey);
    if (pathname === space.basePath || pathname.startsWith(`${space.basePath}/`)) {
      const folder = searchParams.get("folder");
      return {
        space: spaceKey,
        folderId: folder ? Number(folder) : space.rootFolderId,
        location: space.storageLocation,
      };
    }
  }

  return null;
}

export function DriveDropZone({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [pending, startTransition] = useTransition();
  const dragDepth = useRef(0);
  const target = resolveUploadTarget(pathname, searchParams);
  const enabled = Boolean(target) && !pending;

  const hideOverlay = useCallback(() => {
    dragDepth.current = 0;
    setActive(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      hideOverlay();
      return;
    }

    function isFileDrag(event) {
      return Array.from(event.dataTransfer?.types || []).includes("Files");
    }

    function onDragEnter(event) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setActive(true);
    }

    function onDragOver(event) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setActive(true);
    }

    function onDragLeave(event) {
      if (!isFileDrag(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setActive(false);
    }

    function onDrop(event) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      hideOverlay();

      if (!target) return;
      const dataTransfer = event.dataTransfer;
      if (!dataTransfer) return;

      // Snapshot pendant l’événement drop (sinon items/files se vident)
      const entriesPromise = collectDataTransferEntries(dataTransfer);

      startTransition(async () => {
        const toastId = toast.loading("Lecture du dépôt…");

        try {
          const entries = await entriesPromise;
          const fileCount = entries.filter(
            (entry) => entry.file && !entry.isDirectory
          ).length;

          if (!entries.length) {
            toast.error("Aucun fichier à importer", { id: toastId });
            return;
          }

          toast.loading(
            fileCount
              ? `Upload 0/${fileCount}…`
              : "Création des dossiers…",
            { id: toastId }
          );

          const result = await uploadEntryTree(entries, target, {
            onProgress: ({ done, total }) => {
              if (!total) return;
              toast.loading(`Upload ${done}/${total}…`, { id: toastId });
            },
          });

          if (result.fail === 0) {
            const parts = [];
            if (result.ok === 1) parts.push("1 fichier importé");
            else if (result.ok > 1) parts.push(`${result.ok} fichiers importés`);
            if (result.folders === 1) parts.push("1 dossier créé");
            else if (result.folders > 1) {
              parts.push(`${result.folders} dossiers créés`);
            }
            toast.success(parts.join(" · ") || "Import terminé", {
              id: toastId,
            });
          } else if (result.ok === 0 && result.folders === 0) {
            toast.error(result.errors.join(" · ") || "Upload impossible", {
              id: toastId,
            });
          } else {
            toast.warning(
              `${result.ok} importé(s), ${result.fail} échec(s)`,
              { id: toastId, description: result.errors.slice(0, 5).join(" · ") }
            );
          }

          router.refresh();
        } catch (error) {
          toast.error(error?.message || "Upload impossible", { id: toastId });
        }
      });
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [enabled, hideOverlay, router, target]);

  return (
    <>
      {children}
      <div
        aria-hidden={!active}
        className={cn(
          "pointer-events-none fixed inset-0 z-[100] flex items-center justify-center border-4 border-dashed border-primary/70 bg-[#100e0b]/92 transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex flex-col items-center gap-3 text-primary">
          <Upload className="size-10" />
          <p className="text-lg font-medium">Déposez fichiers ou dossiers</p>
          <p className="text-sm text-primary/80">
            L’arborescence sera reconstituée dans le dossier en cours
          </p>
        </div>
      </div>
    </>
  );
}
