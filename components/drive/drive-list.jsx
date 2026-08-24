"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
   Download,
   Eraser,
   Folder,
   Info,
   Link2,
   MoreHorizontal,
   Pencil,
   RotateCcw,
   Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import {
   deleteFilePermanent,
   deleteFolderPermanent,
   getFileDownloadUrl,
   getFileObjectUrl,
   getFilePreviewUrl,
   renameFile,
   renameFolder,
   restoreFile,
   restoreFolder,
   trashFile,
   trashFolder,
} from "@/actions";
import {
   BulkActionBar,
   SelectionCheckbox,
} from "@/components/drive/bulk-action-bar";
import { BusyOverlay } from "@/components/drive/busy-overlay";
import { ConfirmDialog } from "@/components/drive/confirm-dialog";
import { useBusyAction } from "@/hooks/use-busy-action";
import {
   useDriveDndOptional,
   useFolderDropTarget,
} from "@/components/drive/drive-dnd-provider";
import { FolderDropBadge } from "@/components/drive/folder-drop-badge";
import { FileThumbnail } from "@/components/drive/file-thumbnail";
import { ImageLightbox } from "@/components/drive/image-lightbox";
import { ItemInfoDrawer } from "@/components/drive/item-info-drawer";
import { InfiniteScrollSentinel } from "@/components/drive/infinite-scroll-sentinel";
import { MasonryGrid } from "@/components/drive/masonry-grid";
import { RenameDialog } from "@/components/drive/rename-dialog";
import { useInfiniteFiles } from "@/hooks/use-infinite-files";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { folderHref, sortFilesByCaptureDate } from "@/lib/drive";
import { formatBytes, formatDate } from "@/lib/format";
import { listItemDelay, listItemIn, listItemTransition } from "@/lib/motion";
import { itemSelectionKey } from "@/lib/tags";
import { cn } from "@/lib/utils";

function TrashActions({ item, pending, onRestore, onDeleteForever }) {
   return (
      <div className="flex shrink-0 items-center justify-end gap-1">
         <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={pending}
            aria-label="Restaurer"
            title="Restaurer"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={() => onRestore(item)}
         >
            <RotateCcw className="size-4" />
         </Button>
         <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={pending}
            aria-label="Supprimer définitivement"
            title="Supprimer définitivement"
            className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
            onClick={() => onDeleteForever(item)}
         >
            <Eraser className="size-4" />
         </Button>
      </div>
   );
}

function ItemInfoButton({ onClick, pending, compact, overlay = true }) {
   return (
      <Button
         type="button"
         size="icon-sm"
         variant={overlay ? "outline" : "ghost"}
         disabled={pending}
         aria-label="Informations"
         className={cn(
            "shrink-0",
            overlay &&
               "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white",
         )}
         onClick={(event) => {
            event.stopPropagation();
            onClick();
         }}
      >
         <Info className={compact ? "size-3" : "size-4"} />
      </Button>
   );
}

function ItemMenu({
   item,
   view,
   space,
   pending,
   onRename,
   onInfo,
   onTrash,
   onRestore,
   onDeleteForever,
   run,
}) {
   if (view === "trash") {
      return (
         <TrashActions
            item={item}
            pending={pending}
            onRestore={onRestore}
            onDeleteForever={onDeleteForever}
         />
      );
   }

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button
               type="button"
               size="icon-sm"
               variant="outline"
               disabled={pending}
               aria-label="Actions"
               className="shrink-0 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
               onClick={(event) => event.stopPropagation()}
            >
               <MoreHorizontal className="size-4" />
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent
            align="end"
            className="z-[100] w-52 border-0 shadow-xl"
         >
            {item.kind === "file" ? (
               <DropdownMenuItem
                  onClick={() =>
                     run(async () => {
                        const result = await getFileDownloadUrl(item.id);
                        if (!result.success) {
                           window.alert(
                              result.error || "Téléchargement impossible.",
                           );
                           return;
                        }
                        window.open(
                           result.data.url,
                           "_blank",
                           "noopener,noreferrer",
                        );
                     })
                  }
               >
                  <Download />
                  Télécharger
               </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => onInfo?.(item)}>
               <Info />
               Informations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(item)}>
               <Pencil />
               Renommer
            </DropdownMenuItem>
            <DropdownMenuItem
               onClick={async () => {
                  try {
                     let url = "";
                     if (item.kind === "folder") {
                        url = `${window.location.origin}${folderHref(
                           item.space || space,
                           item.id,
                        )}`;
                     } else {
                        const result = await getFileObjectUrl(item.id);
                        if (!result.success || !result.data?.url) {
                           toast.error(
                              result.error ||
                                 "Impossible de récupérer le lien S3.",
                           );
                           return;
                        }
                        url = result.data.url;
                     }
                     await navigator.clipboard.writeText(url);
                     toast.success("Lien copié dans le presse-papiers");
                  } catch {
                     toast.error("Impossible de copier le lien.");
                  }
               }}
            >
               <Link2 />
               Copier le lien
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onTrash(item)}>
               <Trash2 />
               Supprimer
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}

function DriveGridItem({
   item,
   index,
   compact,
   position,
   selected,
   hasSelection,
   canDrag,
   pending,
   menuProps,
   onItemDragStart,
   handleItemActivate,
   toggleItemSelection,
   openInfo,
   openLightbox,
}) {
   return (
      <motion.li
         layout={false}
         initial={{
            opacity: 0,
            y: 5,
            top: position.top,
            left: position.left,
            width: position.width,
            height: position.height,
         }}
         animate={{
            opacity: 1,
            y: 0,
            top: position.top,
            left: position.left,
            width: position.width,
            height: position.height,
         }}
         transition={{
            opacity: { ...listItemTransition, delay: listItemDelay(index) },
            y: { ...listItemTransition, delay: listItemDelay(index) },
            top: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
            left: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
            width: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
            height: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
         }}
         className="absolute"
      >
         <div
            draggable={canDrag}
            onDragStart={(event) => onItemDragStart(event, item)}
            className={cn(
               "group relative h-full w-full overflow-hidden border border-white/10 bg-black/20 transition hover:border-white/25",
               compact ? "rounded-md" : "rounded-lg",
               selected && "border-primary ring-2 ring-primary/60",
               (hasSelection || canDrag) &&
                  "cursor-grab active:cursor-grabbing",
            )}
            onClickCapture={(event) => {
               handleItemActivate(event, item, index);
            }}
         >
            <div
               className={cn(
                  "absolute top-1.5 right-1.5 z-20 transition-opacity",
                  selected || hasSelection
                     ? "opacity-100"
                     : "opacity-0 group-hover:opacity-100",
               )}
            >
               <SelectionCheckbox
                  selected={selected}
                  onChange={(_, event) =>
                     toggleItemSelection(item, index, event)
                  }
               />
            </div>

            <div className="h-full w-full">
               <FileThumbnail
                  file={item}
                  onOpen={hasSelection ? undefined : openLightbox}
                  fit="cell"
               />
            </div>

            <div
               className={
                  compact
                     ? "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-1 pt-4 pb-1 opacity-0 transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
                     : "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2.5 pt-8 pb-2.5 opacity-0 transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
               }
            >
               <div className="flex items-end gap-1">
                  <div className="min-w-0 flex-1 pointer-events-none">
                     <p
                        className={
                           compact
                              ? "truncate text-[10px] font-medium leading-tight text-white"
                              : "truncate text-sm font-medium text-white"
                        }
                     >
                        {item.name}
                     </p>
                     {!compact ? (
                        <p className="truncate text-xs text-white/70">
                           {formatBytes(item.size_bytes)}
                        </p>
                     ) : null}
                  </div>
                  <div
                     data-item-actions
                     className="flex shrink-0 scale-90 origin-bottom-right pointer-events-auto items-center gap-0.5"
                  >
                     <ItemInfoButton
                        onClick={() => openInfo(item)}
                        pending={pending}
                        compact={compact}
                     />
                     <ItemMenu item={item} {...menuProps} />
                  </div>
               </div>
            </div>
         </div>
      </motion.li>
   );
}

function DriveListRow({
   item,
   index,
   selected,
   hasSelection,
   canDrag,
   pending,
   menuProps,
   space,
   onItemDragStart,
   handleItemActivate,
   toggleItemSelection,
   openInfo,
   openLightbox,
}) {
   const isFolder = item.kind === "folder";
   const {
      active: dropActive,
      fileAction,
      showFileBadge,
      folderDropProps,
   } = useFolderDropTarget({
      folderId: item.id,
      space: item.space || space,
      disabled: !isFolder || !canDrag,
   });
   const dnd = useDriveDndOptional();
   const dropIsMove = fileAction === "move";

   return (
      <motion.li
         draggable={canDrag}
         onDragStart={(event) => onItemDragStart(event, item)}
         className={cn(
            "relative grid grid-cols-[28px_minmax(0,1fr)_88px] items-center gap-2 px-3 py-2.5 sm:grid-cols-[28px_minmax(0,1fr)_100px_88px] md:grid-cols-[28px_minmax(0,1fr)_100px_150px_88px]",
            selected && "bg-primary/10",
            dropActive &&
               (dropIsMove
                  ? "bg-red-500/15 ring-1 ring-inset ring-red-500/50"
                  : "bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/50"),
            canDrag && "cursor-grab active:cursor-grabbing",
         )}
         initial={listItemIn.initial}
         animate={listItemIn.animate}
         transition={{
            ...listItemTransition,
            delay: listItemDelay(index),
         }}
         onClickCapture={(event) => {
            handleItemActivate(event, item, index);
         }}
         {...(isFolder ? folderDropProps : {})}
      >
         {showFileBadge ? <FolderDropBadge mode={fileAction} /> : null}
         <SelectionCheckbox
            selected={selected}
            onChange={(_, event) => toggleItemSelection(item, index, event)}
            className="size-4"
         />
         {isFolder && item.href ? (
            <Link
               href={item.href}
               className={cn(
                  "flex min-w-0 items-center gap-2 font-medium hover:text-primary",
                  dnd?.isDragging && "pointer-events-none",
               )}
               onClick={(event) => {
                  handleItemActivate(event, item, index);
               }}
               draggable={false}
            >
               <Folder className="size-4 shrink-0 text-primary" />
               <span className="truncate">{item.name}</span>
            </Link>
         ) : (
            <div className="flex min-w-0 items-center gap-2">
               <div className="size-8 shrink-0 overflow-hidden rounded-md border border-white/10">
                  <FileThumbnail
                     file={item}
                     onOpen={hasSelection ? undefined : openLightbox}
                     fit="cover"
                  />
               </div>
               <span className="truncate">{item.name}</span>
            </div>
         )}

         <span className="hidden text-sm text-muted-foreground sm:block">
            {item.kind === "file" ? formatBytes(item.size_bytes) : "—"}
         </span>
         <span className="hidden text-sm text-muted-foreground md:block">
            {formatDate(item.updated_at || item.deleted_at)}
         </span>

         <div data-item-actions className="flex items-center justify-end gap-1">
            <ItemInfoButton
               onClick={() => openInfo(item)}
               pending={pending}
               overlay={false}
            />
            <ItemMenu item={item} {...menuProps} />
         </div>
      </motion.li>
   );
}

export function DriveList({
   folders = [],
   files = [],
   view,
   space,
   folderId = null,
   openFileId,
   layout = "list",
   galleryMode = false,
   filesPagination = null,
}) {
   const router = useRouter();
   const dnd = useDriveDndOptional();
   const { isBusy: pending, startTransition, runBusy } = useBusyAction();
   const [lightbox, setLightbox] = useState(null);
   const [confirm, setConfirm] = useState(null);
   const [infoItem, setInfoItem] = useState(null);
   const [renameItem, setRenameItem] = useState(null);
   const [selectedKeys, setSelectedKeys] = useState(() => new Set());
   const [selectionAnchor, setSelectionAnchor] = useState(null);

   const {
      files: galleryFiles,
      hasMore: galleryHasMore,
      loading: galleryLoading,
      loadMore: loadMoreGallery,
   } = useInfiniteFiles({
      space,
      folderId: null,
      initialFiles: files,
      initialPagination: filesPagination,
      enabled: galleryMode && view === "browse",
   });

   const displayFiles = galleryMode && view === "browse" ? galleryFiles : files;

   useEffect(() => {
      if (!openFileId) return;
      const file = displayFiles.find(
         (entry) => String(entry.id) === String(openFileId),
      );
      if (!file) return;

      let cancelled = false;
      getFilePreviewUrl(file.id).then((result) => {
         if (cancelled) return;
         if (result.success && result.data?.url) {
            setLightbox({ src: result.data.url, title: file.name });
         } else {
            toast.error(result.error || "Impossible d’ouvrir le fichier.");
         }
      });

      return () => {
         cancelled = true;
      };
   }, [openFileId, displayFiles]);

   const isGridLayout = layout === "grid" || layout === "compact";

   const items = useMemo(() => {
      const folderItems = folders.map((folder) => ({
         ...folder,
         kind: "folder",
         href:
            view === "browse"
               ? folderHref(folder.space || space, folder.id)
               : null,
      }));
      const fileItems = sortFilesByCaptureDate(
         displayFiles.map((file) => ({
            ...file,
            kind: "file",
            href: null,
         })),
      );

      if (isGridLayout) {
         return fileItems;
      }

      return [...folderItems, ...fileItems];
   }, [folders, displayFiles, view, space, isGridLayout]);

   const itemsSignature = useMemo(
      () => items.map((item) => itemSelectionKey(item)).join("|"),
      [items],
   );

   useEffect(() => {
      setSelectedKeys(new Set());
      setSelectionAnchor(null);
   }, [itemsSignature, view]);

   useEffect(() => {
      function onKeyDown(event) {
         if (event.key === "Escape" && selectedKeys.size) {
            setSelectedKeys(new Set());
            setSelectionAnchor(null);
            return;
         }

         if (
            (event.metaKey || event.ctrlKey) &&
            event.key.toLowerCase() === "a" &&
            items.length
         ) {
            const tag = event.target?.tagName;
            if (
               tag === "INPUT" ||
               tag === "TEXTAREA" ||
               event.target?.isContentEditable
            ) {
               return;
            }
            event.preventDefault();
            setSelectedKeys(new Set(items.map(itemSelectionKey)));
         }
      }

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
   }, [items, selectedKeys.size]);

   function openLightbox(payload) {
      setLightbox(payload);
   }

   function clearSelection() {
      setSelectedKeys(new Set());
      setSelectionAnchor(null);
   }

   function selectAll() {
      setSelectedKeys(new Set(items.map(itemSelectionKey)));
   }

   function applySelection(nextKeys, anchorIndex) {
      setSelectedKeys(nextKeys);
      if (typeof anchorIndex === "number") {
         setSelectionAnchor(anchorIndex);
      }
   }

   function toggleItemSelection(item, index, event) {
      const key = itemSelectionKey(item);

      if (event?.shiftKey && selectionAnchor != null) {
         const start = Math.min(selectionAnchor, index);
         const end = Math.max(selectionAnchor, index);
         const next = new Set(selectedKeys);
         for (let i = start; i <= end; i += 1) {
            next.add(itemSelectionKey(items[i]));
         }
         applySelection(next);
         return;
      }

      const next = new Set(selectedKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      applySelection(next, index);
   }

   function onItemPointerSelect(event, item, index) {
      if (!(event.metaKey || event.ctrlKey || event.shiftKey)) return false;
      event.preventDefault();
      event.stopPropagation();
      toggleItemSelection(item, index, event);
      return true;
   }

   const selectedItems = items.filter((item) =>
      selectedKeys.has(itemSelectionKey(item)),
   );
   const hasSelection = selectedKeys.size > 0;
   const canDrag = view === "browse";

   function getDragItems(item) {
      const key = itemSelectionKey(item);
      if (selectedKeys.has(key) && selectedItems.length > 0) {
         return selectedItems;
      }
      return [item];
   }

   function onItemDragStart(event, item) {
      if (!canDrag || !dnd) {
         event.preventDefault();
         return;
      }
      if (event.target.closest("[data-item-actions], [role='checkbox']")) {
         event.preventDefault();
         return;
      }
      event.stopPropagation();
      dnd.beginDrag(event, {
         space: space || item.space,
         items: getDragItems(item),
         sourceFolderId: galleryMode ? null : folderId,
      });
   }

   /** Clic normal : lightbox/navigation sauf si une sélection est active → toggle. */
   function handleItemActivate(event, item, index) {
      if (onItemPointerSelect(event, item, index)) return true;
      if (!hasSelection) return false;

      if (event.target.closest("[data-item-actions], [role='checkbox']")) {
         return false;
      }

      event.preventDefault();
      event.stopPropagation();
      toggleItemSelection(item, index, event);
      return true;
   }

   function run(action) {
      runBusy(async () => {
         await action();
         startTransition(() => {
            router.refresh();
         });
      });
   }

   function onRename(item) {
      // Laisser le dropdown se fermer avant d’ouvrir le Dialog
      window.setTimeout(() => setRenameItem(item), 0);
   }

   async function onRenameConfirm(nextName) {
      if (!renameItem) return false;

      const result =
         renameItem.kind === "folder"
            ? await renameFolder({ id: renameItem.id, name: nextName })
            : await renameFile({ id: renameItem.id, name: nextName });

      if (!result?.success) {
         toast.error(result?.error || "Renommage impossible");
         return result || { success: false, error: "Renommage impossible" };
      }

      toast.success(
         renameItem.kind === "folder" ? "Dossier renommé" : "Fichier renommé",
      );
      setRenameItem(null);
      router.refresh();
      return result;
   }

   function onTrash(item) {
      if (item.kind === "folder") {
         setConfirm({
            type: "trash",
            item,
            title: "Supprimer ce dossier ?",
            description: `« ${item.name} » et tout son contenu seront envoyés à la corbeille.`,
            confirmLabel: "Supprimer",
         });
         return;
      }

      run(async () => {
         await trashFile(item.id);
      });
   }

   function onRestore(item) {
      run(async () => {
         if (item.kind === "folder") await restoreFolder(item.id);
         else await restoreFile(item.id);
      });
   }

   function onDeleteForever(item) {
      setConfirm({
         type: "delete-forever",
         item,
         title:
            item.kind === "folder"
               ? "Supprimer définitivement ce dossier ?"
               : "Supprimer définitivement ce fichier ?",
         description:
            item.kind === "folder"
               ? `« ${item.name} » et son contenu seront définitivement effacés, y compris sur S3.`
               : `« ${item.name} » sera définitivement effacé, y compris sur S3.`,
         confirmLabel: "Supprimer définitivement",
      });
   }

   function onConfirmAction() {
      const current = confirm;
      if (!current?.item) return;

      runBusy(async () => {
         if (current.type === "trash" && current.item.kind === "folder") {
            await trashFolder(current.item.id);
         } else if (current.type === "delete-forever") {
            if (current.item.kind === "folder") {
               await deleteFolderPermanent(current.item.id);
            } else {
               await deleteFilePermanent(current.item.id);
            }
         }
         setConfirm(null);
         startTransition(() => {
            router.refresh();
         });
      });
   }

   function openInfo(item) {
      setInfoItem(item);
   }

   const activeInfoItem = infoItem
      ? items.find(
           (entry) =>
              entry.kind === infoItem.kind &&
              String(entry.id) === String(infoItem.id),
        ) || infoItem
      : null;

   const menuProps = {
      view,
      space,
      pending,
      onRename,
      onInfo: openInfo,
      onTrash,
      onRestore,
      onDeleteForever,
      run,
   };

   const busyLabel =
      confirm?.type === "delete-forever"
         ? "Suppression définitive…"
         : confirm?.type === "trash"
           ? "Mise à la corbeille…"
           : "Traitement en cours…";

   return (
      <div className="flex flex-1 flex-col gap-3">
         <BusyOverlay show={pending} label={busyLabel} />

         <ImageLightbox
            open={Boolean(lightbox)}
            src={lightbox?.src}
            title={lightbox?.title}
            onClose={() => setLightbox(null)}
         />

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
            pendingLabel={busyLabel}
            onConfirm={onConfirmAction}
         />

         <RenameDialog
            open={Boolean(renameItem)}
            onOpenChange={(open) => {
               if (!open) setRenameItem(null);
            }}
            item={renameItem}
            onConfirm={onRenameConfirm}
         />

         <ItemInfoDrawer
            open={Boolean(infoItem)}
            onOpenChange={(open) => {
               if (!open) setInfoItem(null);
            }}
            item={activeInfoItem}
            onSaved={() => router.refresh()}
         />

         <BulkActionBar
            view={view}
            selectedItems={selectedItems}
            allCount={items.length}
            onClear={clearSelection}
            onSelectAll={selectAll}
            onDone={() => router.refresh()}
         />

         {!items.length ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-16 text-sm text-muted-foreground">
               {isGridLayout && folders.length > 0
                  ? "Aucun fichier"
                  : "Aucun élément"}
            </div>
         ) : isGridLayout ? (
            <>
               <MasonryGrid
                  items={items}
                  compact={layout === "compact"}
                  showDayLabels={view === "browse"}
               >
                  {({ item, index, position, key }) => (
                     <DriveGridItem
                        key={key}
                        item={item}
                        index={index}
                        compact={layout === "compact"}
                        position={position}
                        selected={selectedKeys.has(itemSelectionKey(item))}
                        hasSelection={hasSelection}
                        canDrag={canDrag}
                        pending={pending}
                        menuProps={menuProps}
                        onItemDragStart={onItemDragStart}
                        handleItemActivate={handleItemActivate}
                        toggleItemSelection={toggleItemSelection}
                        openInfo={openInfo}
                        openLightbox={openLightbox}
                     />
                  )}
               </MasonryGrid>
               {galleryMode ? (
                  <InfiniteScrollSentinel
                     hasMore={galleryHasMore}
                     loading={galleryLoading}
                     onVisible={loadMoreGallery}
                  />
               ) : null}
            </>
         ) : (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
               <div className="grid grid-cols-[28px_minmax(0,1fr)_88px] gap-2 border-b border-white/10 px-3 py-2 text-xs text-muted-foreground sm:grid-cols-[28px_minmax(0,1fr)_100px_88px] md:grid-cols-[28px_minmax(0,1fr)_100px_150px_88px]">
                  <SelectionCheckbox
                     selected={
                        items.length > 0 && selectedKeys.size === items.length
                     }
                     onChange={() => {
                        if (selectedKeys.size === items.length)
                           clearSelection();
                        else selectAll();
                     }}
                     className="size-4"
                  />
                  <span>Nom</span>
                  <span className="hidden sm:block">Taille</span>
                  <span className="hidden md:block">Modifié</span>
                  <span className="text-right">Actions</span>
               </div>

               <ul className="divide-y divide-white/5">
                  {items.map((item, index) => {
                     const selected = selectedKeys.has(itemSelectionKey(item));
                     return (
                        <DriveListRow
                           key={`${item.kind}-${item.id}`}
                           item={item}
                           index={index}
                           selected={selected}
                           hasSelection={hasSelection}
                           canDrag={canDrag}
                           pending={pending}
                           menuProps={menuProps}
                           space={space}
                           onItemDragStart={onItemDragStart}
                           handleItemActivate={handleItemActivate}
                           toggleItemSelection={toggleItemSelection}
                           openInfo={openInfo}
                           openLightbox={openLightbox}
                        />
                     );
                  })}
               </ul>
            </div>
         )}
      </div>
   );
}
