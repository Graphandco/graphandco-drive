"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FolderInput, Files } from "lucide-react";
import { toast } from "sonner";

import { moveItems } from "@/actions/move";
import { FolderDropBadge } from "@/components/drive/folder-drop-badge";
import {
  DRIVE_DND_MIME,
  DRIVE_FOLDER_DROP_ATTR,
  DRIVE_FOLDER_SPACE_ATTR,
  getFolderDropZoneFromEvent,
  isDriveInternalDrag,
  serializeDriveDragPayload,
  splitDriveDragItems,
} from "@/lib/drive-dnd";

const DriveDndContext = createContext(null);

export function useDriveDnd() {
  const ctx = useContext(DriveDndContext);
  if (!ctx) {
    throw new Error("useDriveDnd must be used within DriveDndProvider");
  }
  return ctx;
}

export function useDriveDndOptional() {
  return useContext(DriveDndContext);
}

function readPayload(dataTransfer, fallback) {
  try {
    const raw =
      dataTransfer?.getData(DRIVE_DND_MIME) ||
      dataTransfer?.getData("text/plain") ||
      "";
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.space && Array.isArray(parsed.items)) {
        return {
          space: parsed.space,
          sourceFolderId:
            parsed.sourceFolderId != null
              ? Number(parsed.sourceFolderId)
              : null,
          items: parsed.items
            .map((item) => ({
              kind: item.kind === "folder" ? "folder" : "file",
              id: Number(item.id),
              name: item.name || "",
            }))
            .filter((item) => item.id > 0),
        };
      }
    }
  } catch {
    // fallback ci-dessous
  }
  return fallback;
}

function dragHasFiles(payload) {
  return payload?.items?.some((item) => item.kind === "file");
}

export function DriveDndProvider({ children }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [dropTargetId, setDropTargetId] = useState(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const draggingRef = useRef(null);
  const dropOnFolderRef = useRef(null);

  useEffect(() => {
    function isActiveInternalDrag(dataTransfer) {
      return Boolean(draggingRef.current) || isDriveInternalDrag(dataTransfer);
    }

    function onDocDragOver(event) {
      if (!isActiveInternalDrag(event.dataTransfer)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }

      const zone = getFolderDropZoneFromEvent(event);
      if (zone) {
        setDropTargetId(Number(zone.getAttribute(DRIVE_FOLDER_DROP_ATTR)));
        setShiftHeld(Boolean(event.shiftKey));
      } else {
        setDropTargetId(null);
      }
    }

    function onDocDrop(event) {
      if (!isActiveInternalDrag(event.dataTransfer)) return;
      const zone = getFolderDropZoneFromEvent(event);
      if (!zone) return;

      event.preventDefault();
      event.stopPropagation();

      const folderId = Number(zone.getAttribute(DRIVE_FOLDER_DROP_ATTR));
      const space = zone.getAttribute(DRIVE_FOLDER_SPACE_ATTR) || null;
      dropOnFolderRef.current?.(event, folderId, space);
    }

    document.addEventListener("dragover", onDocDragOver, true);
    document.addEventListener("drop", onDocDrop, true);
    return () => {
      document.removeEventListener("dragover", onDocDragOver, true);
      document.removeEventListener("drop", onDocDrop, true);
    };
  }, []);

  useEffect(() => {
    if (!dragging) {
      setShiftHeld(false);
      return;
    }

    function onMove(event) {
      setPointer({ x: event.clientX, y: event.clientY });
      if (typeof event.shiftKey === "boolean") {
        setShiftHeld(event.shiftKey);
      }
    }

    function onKeyDown(event) {
      if (event.key === "Shift") setShiftHeld(true);
    }

    function onKeyUp(event) {
      if (event.key === "Shift") setShiftHeld(false);
    }

    function onEnd() {
      window.setTimeout(() => {
        draggingRef.current = null;
        setDragging(null);
        setDropTargetId(null);
        setShiftHeld(false);
      }, 0);
    }

    window.addEventListener("dragover", onMove);
    window.addEventListener("dragend", onEnd);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("dragover", onMove);
      window.removeEventListener("dragend", onEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [dragging]);

  const beginDrag = useCallback((event, { space, items, sourceFolderId = null }) => {
    if (!items?.length) return;

    const payload = {
      space,
      items,
      sourceFolderId:
        sourceFolderId != null ? Number(sourceFolderId) : null,
    };
    draggingRef.current = payload;

    const serialized = serializeDriveDragPayload(payload);
    event.dataTransfer.setData(DRIVE_DND_MIME, serialized);
    event.dataTransfer.setData("text/plain", serialized);
    event.dataTransfer.effectAllowed = "move";

    const ghost = document.createElement("div");
    ghost.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0";
    document.body.appendChild(ghost);
    try {
      event.dataTransfer.setDragImage(ghost, 0, 0);
    } catch {
      // certains navigateurs refusent setDragImage
    }
    requestAnimationFrame(() => ghost.remove());

    setPointer({ x: event.clientX, y: event.clientY });
    setShiftHeld(Boolean(event.shiftKey));
    setDragging(payload);
  }, []);

  const setHoverTarget = useCallback((folderId) => {
    setDropTargetId(folderId == null ? null : Number(folderId));
  }, []);

  const dropOnFolder = useCallback(
    (event, targetFolderId, targetSpace) => {
      event.preventDefault();
      event.stopPropagation();

      const payload = readPayload(event.dataTransfer, draggingRef.current);
      const fileMode = event.shiftKey ? "move" : "assign";

      draggingRef.current = null;
      setDragging(null);
      setDropTargetId(null);
      setShiftHeld(false);

      if (!payload?.items?.length) {
        toast.error("Aucun élément à déplacer.");
        return true;
      }

      if (targetSpace && payload.space !== targetSpace) {
        toast.error("Déplacement inter-espaces non supporté.");
        return true;
      }

      const { fileIds, folderIds } = splitDriveDragItems(payload.items);
      if (folderIds.includes(Number(targetFolderId))) {
        toast.error("Impossible de déposer un dossier sur lui-même.");
        return true;
      }

      startTransition(async () => {
        const loadingLabel =
          fileMode === "move" ? "Déplacement…" : "Assignation…";
        const toastId = toast.loading(loadingLabel);
        try {
          const result = await moveItems({
            targetFolderId: Number(targetFolderId),
            fileIds,
            folderIds,
            fileMode,
            sourceFolderId: payload.sourceFolderId,
          });

          if (!result?.success) {
            toast.error(result?.error || "Opération impossible", {
              id: toastId,
            });
            return;
          }

          const { movedFiles = 0, movedFolders = 0, total = 0 } =
            result.data || {};
          const parts = [];
          if (movedFiles) {
            const verb =
              fileMode === "move"
                ? movedFiles === 1
                  ? "1 fichier déplacé"
                  : `${movedFiles} fichiers déplacés`
                : movedFiles === 1
                  ? "1 fichier assigné"
                  : `${movedFiles} fichiers assignés`;
            parts.push(verb);
          }
          if (movedFolders) {
            parts.push(
              movedFolders === 1 ? "1 dossier déplacé" : `${movedFolders} dossiers déplacés`
            );
          }

          if (result.error) {
            toast.warning(
              total ? parts.join(" · ") : "Terminé",
              { id: toastId, description: result.error }
            );
          } else {
            toast.success(
              total ? parts.join(" · ") : "Rien à faire",
              { id: toastId }
            );
          }
          router.refresh();
        } catch (error) {
          toast.error(error?.message || "Opération impossible", {
            id: toastId,
          });
        }
      });

      return true;
    },
    [router]
  );

  dropOnFolderRef.current = dropOnFolder;

  const fileAction = shiftHeld ? "move" : "assign";

  const value = useMemo(
    () => ({
      pending,
      dragging,
      draggingRef,
      dropTargetId,
      shiftHeld,
      fileAction,
      beginDrag,
      setHoverTarget,
      setShiftHeld,
      dropOnFolder,
      isDragging: Boolean(dragging),
    }),
    [
      pending,
      dragging,
      dropTargetId,
      shiftHeld,
      fileAction,
      beginDrag,
      setHoverTarget,
      dropOnFolder,
    ]
  );

  const count = dragging?.items?.length || 0;
  const hasFolder = dragging?.items?.some((i) => i.kind === "folder");
  const hasFile = dragHasFiles(dragging);

  return (
    <DriveDndContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {dragging ? (
          <motion.div
            key="drive-dnd-ghost"
            className="pointer-events-none fixed top-0 left-0 z-[200] flex items-center gap-2 rounded-xl border border-primary/50 bg-[#100e0b]/95 px-3 py-2 text-sm text-white shadow-2xl backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: pointer.x + 14,
              y: pointer.y + 14,
            }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
          >
            {hasFolder ? (
              <FolderInput className="size-4 text-primary" />
            ) : (
              <Files className="size-4 text-primary" />
            )}
            <span>
              {count} élément{count > 1 ? "s" : ""}
            </span>
            {hasFile && !hasFolder ? (
              <FolderDropBadge mode={fileAction} className="static size-4 text-[10px]" />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </DriveDndContext.Provider>
  );
}

function getDraggingPayload(dnd) {
  return dnd?.dragging ?? dnd?.draggingRef?.current ?? null;
}

function isDraggingSelf(payload, folderId) {
  if (!payload?.items?.length) return false;
  return payload.items.some(
    (item) => item.kind === "folder" && Number(item.id) === Number(folderId)
  );
}

export function useFolderDropTarget({ folderId, space, disabled = false }) {
  const dnd = useDriveDndOptional();
  const payload = getDraggingPayload(dnd);
  const active =
    !disabled &&
    Boolean(payload) &&
    !isDraggingSelf(payload, folderId) &&
    Number(dnd?.dropTargetId) === Number(folderId);
  const hasFiles = dragHasFiles(payload);
  const hasOnlyFolders =
    Boolean(payload?.items?.length) &&
    payload.items.every((item) => item.kind === "folder");
  const fileAction =
    hasOnlyFolders || (dnd?.shiftHeld && hasFiles) ? "move" : "assign";

  return {
    active,
    fileAction,
    showFileBadge: active && hasFiles,
    folderDropProps: disabled
      ? {}
      : {
          [DRIVE_FOLDER_DROP_ATTR]: String(folderId),
          [DRIVE_FOLDER_SPACE_ATTR]: space || "",
        },
  };
}
