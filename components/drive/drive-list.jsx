"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
   Download,
   Eraser,
   Folder,
   Info,
   Link2,
   MoreHorizontal,
   Pencil,
   RotateCcw,
   Share2,
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
   listSelectionTargets,
   renameFile,
   renameFolder,
   restoreFile,
   restoreFolder,
   trashFile,
   trashFolder,
   bulkTrashItems,
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
import { FavoriteButton } from "@/components/drive/favorite-button";
import { FileThumbnail } from "@/components/drive/file-thumbnail";
import { ImageLightbox } from "@/components/drive/image-lightbox";
import { ItemInfoDrawer } from "@/components/drive/item-info-drawer";
import { InfiniteScrollSentinel } from "@/components/drive/infinite-scroll-sentinel";
import { MasonryGrid } from "@/components/drive/masonry-grid";
import { ScrollToTopButton } from "@/components/drive/scroll-to-top-button";
import { shareOrDownloadFile } from "@/lib/share-file";
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
import { folderHref, getSpaceConfig, sortFilesByCaptureDate } from "@/lib/drive";
import { filterDriveItems } from "@/lib/drive-search";
import { formatBytes, formatDate } from "@/lib/format";
import { isImageFile } from "@/lib/mime";
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
               <>
                  <DropdownMenuItem
                     onClick={() =>
                        run(async () => {
                           try {
                              const result = await shareOrDownloadFile({
                                 fileId: item.id,
                                 fileName: item.name,
                                 mimeType: item.mime_type,
                              });
                              if (result.method === "download") {
                                 toast.success(
                                    "Partage indisponible — téléchargement lancé",
                                 );
                              }
                           } catch (error) {
                              toast.error(
                                 error?.message || "Partage impossible.",
                              );
                           }
                        })
                     }
                  >
                     <Share2 />
                     Partager
                  </DropdownMenuItem>
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
               </>
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
   onFavoriteChanged,
}) {
   const isFile = item.kind === "file";

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
               compact ? "rounded-md" : "rounded-xl",
               selected && "border-primary ring-2 ring-primary/60",
               (hasSelection || canDrag) &&
                  "cursor-grab active:cursor-grabbing",
            )}
            onClickCapture={(event) => {
               handleItemActivate(event, item, index);
            }}
         >
            {isFile ? (
               <div className="absolute top-1.5 right-1.5 z-20">
                  <FavoriteButton
                     file={item}
                     compact={compact}
                     onChanged={onFavoriteChanged}
                  />
               </div>
            ) : null}

            <div className="h-full w-full">
               <FileThumbnail
                  file={item}
                  onOpen={hasSelection ? undefined : openLightbox}
                  fit="cell"
               />
            </div>

            <div
               className={cn(
                  compact
                     ? "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-1 pt-4 pb-1 transition-opacity"
                     : "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2.5 pt-6 pb-2 transition-opacity",
                  selected || hasSelection
                     ? "opacity-100"
                     : "opacity-0 group-hover:opacity-100",
               )}
            >
               <div className="flex items-end gap-1">
                  <div className="min-w-0 flex-1">
                     <p
                        className={
                           compact
                              ? "truncate text-[9px] font-medium leading-tight text-white"
                              : "truncate text-xs font-medium leading-tight text-white"
                        }
                     >
                        {item.name}
                     </p>
                     {!compact ? (
                        <p className="truncate text-[10px] text-white/70">
                           {formatBytes(item.size_bytes)}
                        </p>
                     ) : null}
                  </div>
                  <div
                     data-item-actions
                     className="pointer-events-auto flex shrink-0 scale-90 origin-bottom-right items-center gap-0.5"
                  >
                     <ItemInfoButton
                        onClick={() => openInfo(item)}
                        pending={pending}
                        compact={compact}
                     />
                     <ItemMenu item={item} {...menuProps} />
                     <SelectionCheckbox
                        selected={selected}
                        onChange={(_, event) =>
                           toggleItemSelection(item, index, event)
                        }
                     />
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
   showSpace = false,
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
            showSpace &&
               "sm:grid-cols-[28px_minmax(0,1fr)_88px_100px_88px] md:grid-cols-[28px_minmax(0,1fr)_88px_100px_150px_88px]",
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

         {showSpace ? (
            <span className="hidden text-xs text-muted-foreground sm:block">
               {item.kind === "file" ? getSpaceConfig(item.space).label : "—"}
            </span>
         ) : null}
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
   smartFolderMode = false,
   smartFolder = null,
   favoritesMode = false,
   searchQuery = "",
   debouncedSearchQuery = "",
   searchGlobal = false,
   onSearchMetaChange,
   filesPagination = null,
   crossSpaceMode = false,
   recentDays = null,
   favoritesOnly = false,
   selectAllRef = null,
   onSelectingAllChange,
}) {
   const router = useRouter();
   const dnd = useDriveDndOptional();
   const { isBusy: pending, startTransition, runBusy } = useBusyAction();
   const [lightbox, setLightbox] = useState(null);
   const [confirm, setConfirm] = useState(null);
   const [infoItem, setInfoItem] = useState(null);
   const [renameItem, setRenameItem] = useState(null);
   const [selectedKeys, setSelectedKeys] = useState(() => new Set());
   const [selectedCatalog, setSelectedCatalog] = useState(() => new Map());
   const [selectionAnchor, setSelectionAnchor] = useState(null);
   const [selectingAll, setSelectingAll] = useState(false);
   const [serverSelectionTotal, setServerSelectionTotal] = useState(null);

   const spaceWideMode = galleryMode || smartFolderMode || favoritesMode;

   const folderBrowseMode =
      view === "browse" && !spaceWideMode && !crossSpaceMode;

   const infiniteBrowse =
      view === "recent" ||
      view === "orphans" ||
      view === "untagged" ||
      view === "duplicates" ||
      (view === "browse" && spaceWideMode) ||
      folderBrowseMode;

   const serverSearchActive =
      (folderBrowseMode || spaceWideMode) &&
      (debouncedSearchQuery.trim().length > 0 || favoritesOnly);

   const browseFolderId =
      spaceWideMode || crossSpaceMode ? null : folderId;

   const searchFolderId =
      folderBrowseMode && debouncedSearchQuery.trim().length > 0
         ? searchGlobal
            ? null
            : folderId
         : browseFolderId;

   const {
      files: galleryFiles,
      hasMore: galleryHasMore,
      total: galleryTotal,
      loading: galleryLoading,
      searching: gallerySearching,
      loadMore: loadMoreGallery,
      setFiles: setGalleryFiles,
   } = useInfiniteFiles({
      space,
      folderId: searchFolderId,
      tag: smartFolderMode ? smartFolder?.tag : null,
      imagesOnly: smartFolderMode,
      search: debouncedSearchQuery,
      view: crossSpaceMode ? view : "browse",
      recentDays,
      favoritesOnly,
      initialFiles: files,
      initialPagination: filesPagination,
      enabled: infiniteBrowse,
   });

   useEffect(() => {
      if (!onSearchMetaChange) return;
      onSearchMetaChange({
        total: serverSearchActive ? galleryTotal : null,
        searching: serverSearchActive ? gallerySearching : false,
      });
   }, [
      onSearchMetaChange,
      serverSearchActive,
      galleryTotal,
      gallerySearching,
   ]);

   const displayFiles = infiniteBrowse ? galleryFiles : files;

   const visibleFolders = useMemo(
      () =>
         favoritesOnly || (folderBrowseMode && debouncedSearchQuery.trim())
            ? []
            : filterDriveItems(folders, [], searchQuery).folders,
      [
         folders,
         searchQuery,
         favoritesOnly,
         folderBrowseMode,
         debouncedSearchQuery,
      ],
   );

   const visibleFiles = useMemo(() => {
      if (serverSearchActive) {
         if (gallerySearching) {
            return filterDriveItems([], files, debouncedSearchQuery).files;
         }
         return galleryFiles;
      }
      if (!searchQuery.trim()) return displayFiles;
      return filterDriveItems([], displayFiles, searchQuery).files;
   }, [
      serverSearchActive,
      gallerySearching,
      galleryFiles,
      displayFiles,
      searchQuery,
      debouncedSearchQuery,
      files,
   ]);

   const imageItems = useMemo(
      () =>
         visibleFiles.filter((file) =>
            isImageFile({ mimeType: file.mime_type, name: file.name }),
         ),
      [visibleFiles],
   );

   useEffect(() => {
      if (!openFileId) return;
      const file = visibleFiles.find(
         (entry) => String(entry.id) === String(openFileId),
      );
      if (!file) return;

      let cancelled = false;
      getFilePreviewUrl(file.id).then((result) => {
         if (cancelled) return;
         if (result.success && result.data?.url) {
            const index = imageItems.findIndex(
               (entry) => String(entry.id) === String(file.id),
            );
            setLightbox({
               src: result.data.url,
               title: file.name,
               fileId: file.id,
               index: index >= 0 ? index : 0,
            });
         } else {
            toast.error(result.error || "Impossible d’ouvrir le fichier.");
         }
      });

      return () => {
         cancelled = true;
      };
   }, [openFileId, visibleFiles, imageItems]);

   function onFavoriteChanged(fileId, isFavorite) {
      setGalleryFiles((current) => {
         const next = current.map((file) =>
            String(file.id) === String(fileId)
               ? { ...file, is_favorite: isFavorite ? 1 : 0 }
               : file,
         );
         if (favoritesOnly && !isFavorite) {
            return next.filter(
               (file) => String(file.id) !== String(fileId),
            );
         }
         return next;
      });

      if (favoritesOnly && !isFavorite) {
         const key = itemSelectionKey({ kind: "file", id: fileId });
         setSelectedKeys((current) => {
            if (!current.has(key)) return current;
            const next = new Set(current);
            next.delete(key);
            return next;
         });
         setSelectedCatalog((current) => {
            if (!current.has(key)) return current;
            const next = new Map(current);
            next.delete(key);
            return next;
         });
      }
   }

   const isGridLayout = layout === "grid" || layout === "compact";

   const items = useMemo(() => {
      const folderItems = visibleFolders.map((folder) => ({
         ...folder,
         kind: "folder",
         href:
            view === "browse"
               ? folderHref(folder.space || space, folder.id)
               : null,
      }));
      const fileItems = crossSpaceMode
         ? visibleFiles.map((file) => ({
              ...file,
              kind: "file",
              href: null,
           }))
         : sortFilesByCaptureDate(
              visibleFiles.map((file) => ({
                 ...file,
                 kind: "file",
                 href: null,
              })),
           );

      if (isGridLayout) {
         return fileItems;
      }

      return [...folderItems, ...fileItems];
   }, [visibleFolders, visibleFiles, view, space, isGridLayout, crossSpaceMode]);

   useEffect(() => {
      setSelectedKeys(new Set());
      setSelectedCatalog(new Map());
      setSelectionAnchor(null);
      setServerSelectionTotal(null);
   }, [
      view,
      space,
      folderId,
      smartFolder?.id,
      favoritesMode,
      favoritesOnly,
      debouncedSearchQuery,
      recentDays,
      crossSpaceMode,
      galleryMode,
      smartFolderMode,
   ]);

   function toSelectionStub(item) {
      return {
         kind: item.kind,
         id: item.id,
         space: item.space || space,
         name: item.name,
         mime_type: item.mime_type || null,
      };
   }

   const selectAllFromServer = useCallback(async () => {
      if (selectingAll) return;

      setSelectingAll(true);
      try {
         const result = await listSelectionTargets({
            space,
            folderId: folderBrowseMode ? searchFolderId : browseFolderId,
            tag: smartFolderMode ? smartFolder?.tag : null,
            imagesOnly: smartFolderMode,
            search: debouncedSearchQuery,
            favoritesOnly,
            includeFolders:
               folderBrowseMode &&
               !isGridLayout &&
               !debouncedSearchQuery.trim(),
            view: crossSpaceMode ? view : "browse",
            recentDays,
         });

         if (!result?.success) {
            toast.error(
               result?.error || "Impossible de tout sélectionner.",
            );
            return;
         }

         const stubs = (result.data || []).map((item) => ({
            ...item,
            kind: item.kind,
         }));
         const nextKeys = new Set();
         const nextCatalog = new Map();
         for (const stub of stubs) {
            const key = itemSelectionKey(stub);
            nextKeys.add(key);
            nextCatalog.set(key, stub);
         }
         setSelectedKeys(nextKeys);
         setSelectedCatalog(nextCatalog);
         setServerSelectionTotal(nextKeys.size);
         setSelectionAnchor(null);
      } finally {
         setSelectingAll(false);
      }
   }, [
      selectingAll,
      space,
      browseFolderId,
      smartFolderMode,
      smartFolder?.tag,
      debouncedSearchQuery,
      favoritesOnly,
      folderBrowseMode,
      searchFolderId,
      isGridLayout,
      crossSpaceMode,
      view,
      recentDays,
   ]);

   useEffect(() => {
      onSelectingAllChange?.(selectingAll);
   }, [selectingAll, onSelectingAllChange]);

   useEffect(() => {
      if (!selectAllRef) return;
      selectAllRef.current = {
         selectAll: selectAllFromServer,
         selectingAll,
         selectedCount: selectedKeys.size,
      };
      return () => {
         if (selectAllRef.current?.selectAll === selectAllFromServer) {
            selectAllRef.current = null;
         }
      };
   }, [selectAllRef, selectAllFromServer, selectingAll, selectedKeys.size]);

   useEffect(() => {
      function onKeyDown(event) {
         if (event.key === "Escape" && selectedKeys.size) {
            setSelectedKeys(new Set());
            setSelectedCatalog(new Map());
            setServerSelectionTotal(null);
            setSelectionAnchor(null);
            return;
         }

         const tag = event.target?.tagName;
         const inField =
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            event.target?.isContentEditable;

         if (
            (event.key === "Delete" || event.key === "Backspace") &&
            selectedKeys.size > 0 &&
            view !== "trash" &&
            !inField &&
            !lightbox
         ) {
            event.preventDefault();
            const count = selectedKeys.size;
            setConfirm({
               type: "bulk-trash",
               title: "Supprimer la sélection ?",
               description: `${count} élément${count > 1 ? "s" : ""} seront envoyés à la corbeille.`,
               confirmLabel: "Supprimer",
            });
            return;
         }

         if (
            (event.metaKey || event.ctrlKey) &&
            event.key.toLowerCase() === "a"
         ) {
            if (inField) {
               return;
            }
            event.preventDefault();
            selectAllFromServer();
         }
      }

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
   }, [selectedKeys.size, view, lightbox, selectAllFromServer]);

   function openLightbox(payload) {
      const fileId = payload.fileId;
      const index =
         fileId != null
            ? imageItems.findIndex(
                 (entry) => String(entry.id) === String(fileId),
              )
            : -1;
      setLightbox({
         index: index >= 0 ? index : 0,
         fileId,
         src: payload.src || null,
         title: payload.title || null,
      });
   }

   function clearSelection() {
      setSelectedKeys(new Set());
      setSelectedCatalog(new Map());
      setServerSelectionTotal(null);
      setSelectionAnchor(null);
   }

   function selectAll() {
      selectAllFromServer();
   }

   function applySelection(nextKeys, anchorIndex, catalogUpdates = null) {
      setSelectedKeys(nextKeys);
      if (catalogUpdates) {
         setSelectedCatalog(catalogUpdates);
      }
      if (typeof anchorIndex === "number") {
         setSelectionAnchor(anchorIndex);
      }
   }

   function toggleItemSelection(item, index, event) {
      const key = itemSelectionKey(item);
      const stub = toSelectionStub(item);

      if (event?.shiftKey && selectionAnchor != null) {
         const start = Math.min(selectionAnchor, index);
         const end = Math.max(selectionAnchor, index);
         const next = new Set(selectedKeys);
         const nextCatalog = new Map(selectedCatalog);
         for (let i = start; i <= end; i += 1) {
            const rangeItem = items[i];
            if (!rangeItem) continue;
            const rangeKey = itemSelectionKey(rangeItem);
            next.add(rangeKey);
            nextCatalog.set(rangeKey, toSelectionStub(rangeItem));
         }
         applySelection(next, undefined, nextCatalog);
         return;
      }

      const next = new Set(selectedKeys);
      const nextCatalog = new Map(selectedCatalog);
      if (next.has(key)) {
         next.delete(key);
         nextCatalog.delete(key);
      } else {
         next.add(key);
         nextCatalog.set(key, stub);
      }
      applySelection(next, index, nextCatalog);
   }

   function onItemPointerSelect(event, item, index) {
      if (!(event.metaKey || event.ctrlKey || event.shiftKey)) return false;
      event.preventDefault();
      event.stopPropagation();
      toggleItemSelection(item, index, event);
      return true;
   }

   const selectedItems = useMemo(() => {
      const result = [];
      for (const key of selectedKeys) {
         const fromCatalog = selectedCatalog.get(key);
         if (fromCatalog) {
            result.push(fromCatalog);
            continue;
         }
         const loaded = items.find(
            (item) => itemSelectionKey(item) === key,
         );
         if (loaded) result.push(toSelectionStub(loaded));
      }
      return result;
   }, [selectedKeys, selectedCatalog, items, space]);

   const selectionAllCount =
      serverSelectionTotal ??
      Math.max(
         selectedItems.length,
         (folderBrowseMode && !isGridLayout
            ? visibleFolders.length
            : 0) + (galleryTotal || visibleFiles.length || 0),
         items.length,
      );
   const hasSelection = selectedKeys.size > 0;
   const canDrag =
      view === "browse" ||
      view === "orphans" ||
      view === "recent" ||
      view === "untagged" ||
      view === "duplicates";

   const bulkSourceFolderId =
      view === "browse" && !spaceWideMode && !crossSpaceMode
         ? folderId
         : null;

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
         space: item.space || space,
         items: getDragItems(item),
         sourceFolderId:
            spaceWideMode || crossSpaceMode ? null : folderId,
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
      if (!current) return;

      runBusy(async () => {
         if (current.type === "bulk-trash") {
            const fileIds = selectedItems
               .filter((item) => item.kind === "file")
               .map((item) => item.id);
            const folderIds = selectedItems
               .filter((item) => item.kind === "folder")
               .map((item) => item.id);
            const result = await bulkTrashItems({ fileIds, folderIds });
            if (!result?.success) {
               toast.error(result?.error || "Mise à la corbeille impossible");
               return;
            }
            toast.success("Sélection envoyée à la corbeille");
            clearSelection();
            setConfirm(null);
            startTransition(() => {
               router.refresh();
            });
            return;
         }

         if (!current.item) return;

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
            index={lightbox?.index ?? 0}
            images={imageItems}
            seed={
               lightbox?.src && lightbox?.fileId
                  ? { src: lightbox.src, fileId: lightbox.fileId }
                  : null
            }
            onClose={() => setLightbox(null)}
            onIndexChange={(nextIndex) => {
               const file = imageItems[nextIndex];
               setLightbox((current) =>
                  current
                     ? {
                          ...current,
                          index: nextIndex,
                          fileId: file?.id ?? current.fileId,
                          title: file?.name ?? current.title,
                          src:
                             file &&
                             String(file.id) === String(current.fileId)
                                ? current.src
                                : null,
                       }
                     : {
                          index: nextIndex,
                          fileId: file?.id,
                          title: file?.name,
                          src: null,
                       },
               );
            }}
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
            allCount={selectionAllCount}
            sourceFolderId={bulkSourceFolderId}
            onClear={clearSelection}
            onSelectAll={selectAll}
            onDone={() => router.refresh()}
         />

         {!items.length ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-16 text-sm text-muted-foreground">
               {serverSearchActive && !gallerySearching
                  ? favoritesOnly
                     ? "Aucun favori"
                     : "Aucun résultat pour cette recherche"
                  : isGridLayout && folders.length > 0
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
                        onFavoriteChanged={onFavoriteChanged}
                     />
                  )}
               </MasonryGrid>
               {infiniteBrowse ? (
                  <InfiniteScrollSentinel
                     hasMore={galleryHasMore}
                     loading={galleryLoading || gallerySearching}
                     onVisible={loadMoreGallery}
                  />
               ) : null}
            </>
         ) : (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
               <div
                  className={cn(
                     "grid grid-cols-[28px_minmax(0,1fr)_88px] gap-2 border-b border-white/10 px-3 py-2 text-xs text-muted-foreground sm:grid-cols-[28px_minmax(0,1fr)_100px_88px] md:grid-cols-[28px_minmax(0,1fr)_100px_150px_88px]",
                     crossSpaceMode &&
                        "sm:grid-cols-[28px_minmax(0,1fr)_88px_100px_88px] md:grid-cols-[28px_minmax(0,1fr)_88px_100px_150px_88px]"
                  )}
               >
                  <SelectionCheckbox
                     selected={
                        selectionAllCount > 0 &&
                        selectedKeys.size >= selectionAllCount
                     }
                     onChange={() => {
                        if (
                           selectionAllCount > 0 &&
                           selectedKeys.size >= selectionAllCount
                        )
                           clearSelection();
                        else selectAll();
                     }}
                     className="size-4"
                  />
                  <span>Nom</span>
                  {crossSpaceMode ? (
                     <span className="hidden sm:block">Espace</span>
                  ) : null}
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
                           showSpace={crossSpaceMode}
                           onItemDragStart={onItemDragStart}
                           handleItemActivate={handleItemActivate}
                           toggleItemSelection={toggleItemSelection}
                           openInfo={openInfo}
                           openLightbox={openLightbox}
                        />
                     );
                  })}
               </ul>
               {infiniteBrowse ? (
                  <InfiniteScrollSentinel
                     hasMore={galleryHasMore}
                     loading={galleryLoading || gallerySearching}
                     onVisible={loadMoreGallery}
                  />
               ) : null}
            </div>
         )}
         <ScrollToTopButton />
      </div>
   );
}
