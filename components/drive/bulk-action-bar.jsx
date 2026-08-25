"use client";

import { useState } from "react";
import {
   Check,
   Download,
   FolderInput,
   Loader2,
   Minus,
   Plus,
   Tags,
   Trash2,
   RotateCcw,
   Eraser,
   X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import {
   bulkAddFileTags,
   bulkDeletePermanentItems,
   bulkRemoveFileTags,
   bulkRestoreItems,
   bulkTrashItems,
   getFileDownloadUrl,
} from "@/actions";
import { BulkMoveDialog } from "@/components/drive/bulk-move-dialog";
import { TagInput } from "@/components/drive/tag-input";
import { BusyOverlay } from "@/components/drive/busy-overlay";
import { ConfirmDialog } from "@/components/drive/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { useBusyAction } from "@/hooks/use-busy-action";
import { slideUpIn, springSnappy } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function SelectionCheckbox({
   selected,
   onChange,
   className,
   visible = true,
}) {
   return (
      <motion.button
         type="button"
         role="checkbox"
         aria-checked={selected}
         aria-label={selected ? "Désélectionner" : "Sélectionner"}
         className={cn(
            "flex size-5 items-center justify-center rounded border border-white/40 bg-black/55 text-white shadow-sm",
            "hover:border-primary hover:bg-black/70",
            selected && "border-primary bg-primary text-primary-foreground",
            !visible && "pointer-events-none opacity-0",
            className,
         )}
         whileTap={{ scale: 0.88 }}
         animate={{ scale: selected ? 1.05 : 1 }}
         transition={springSnappy}
         onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onChange(!selected, event);
         }}
      >
         <AnimatePresence initial={false}>
            {selected ? (
               <motion.span
                  key="check"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={springSnappy}
               >
                  <Check className="size-3" strokeWidth={3} />
               </motion.span>
            ) : null}
         </AnimatePresence>
      </motion.button>
   );
}

export function BulkActionBar({
   view = "browse",
   selectedItems = [],
   allCount = 0,
   sourceFolderId = null,
   onClear,
   onSelectAll,
   onDone,
}) {
   const { isBusy: pending, runBusy } = useBusyAction();
   const [tagsOpen, setTagsOpen] = useState(false);
   const [tagsMode, setTagsMode] = useState("add");
   const [tagsDraft, setTagsDraft] = useState("");
   const [moveOpen, setMoveOpen] = useState(false);
   const [confirm, setConfirm] = useState(null);

   const count = selectedItems.length;
   const fileIds = selectedItems
      .filter((item) => item.kind === "file")
      .map((item) => item.id);
   const folderIds = selectedItems
      .filter((item) => item.kind === "folder")
      .map((item) => item.id);
   const fileCount = fileIds.length;
   const hasMovableItems = fileCount > 0 || folderIds.length > 0;
   const tagSpace =
      selectedItems.find((item) => item.kind === "file")?.space ||
      selectedItems[0]?.space ||
      null;

   const busyLabel =
      confirm?.type === "delete-forever"
         ? "Suppression définitive…"
         : confirm?.type === "trash"
           ? "Mise à la corbeille…"
           : "Traitement en cours…";

   function run(action, { successMessage } = {}) {
      runBusy(async () => {
         const result = await action();
         if (!result?.success) {
            toast.error(result?.error || "Action impossible");
            return;
         }
         if (result.error) {
            toast.warning(successMessage || "Terminé", {
               description: result.error,
            });
         } else {
            toast.success(successMessage || "Terminé");
         }
         setConfirm(null);
         setTagsOpen(false);
         setTagsDraft("");
         onClear();
         onDone?.();
      });
   }

   function onApplyTags() {
      if (tagsMode === "add") {
         run(() => bulkAddFileTags({ ids: fileIds, tags: tagsDraft }), {
            successMessage:
               fileCount === 1
                  ? "Tags ajoutés au fichier"
                  : `Tags ajoutés à ${fileCount} fichiers`,
         });
         return;
      }

      run(() => bulkRemoveFileTags({ ids: fileIds, tags: tagsDraft }), {
         successMessage:
            fileCount === 1
               ? "Tags retirés du fichier"
               : `Tags retirés de ${fileCount} fichiers`,
      });
   }

   function onDownload() {
      if (!fileCount) return;

      runBusy(async () => {
         let ok = 0;
         const errors = [];

         for (const id of fileIds) {
            const result = await getFileDownloadUrl(id);
            if (!result?.success || !result.data?.url) {
               errors.push(result?.error || `Fichier ${id}`);
               continue;
            }

            const anchor = document.createElement("a");
            anchor.href = result.data.url;
            anchor.rel = "noopener noreferrer";
            anchor.target = "_blank";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            ok += 1;

            if (fileIds.length > 1) {
               await new Promise((resolve) => setTimeout(resolve, 250));
            }
         }

         if (ok === 0) {
            toast.error(errors.join(" · ") || "Téléchargement impossible");
         } else if (errors.length) {
            toast.warning(`${ok} téléchargé(s), ${errors.length} échec(s)`, {
               description: errors.slice(0, 3).join(" · "),
            });
         } else {
            toast.success(
               ok === 1
                  ? "Téléchargement lancé"
                  : `${ok} téléchargements lancés`,
            );
         }
      });
   }

   function onMoveDone(result) {
      const total = result?.data?.total || 0;
      if (result?.error) {
         toast.warning(
            total
               ? `${total} élément${total > 1 ? "s" : ""} déplacé${total > 1 ? "s" : ""}`
               : "Déplacement partiel",
            { description: result.error }
         );
      } else {
         toast.success(
            total === 1
               ? "Élément déplacé"
               : `${total} éléments déplacés`
         );
      }
      onClear();
      onDone?.();
   }

   return (
      <>
         <BusyOverlay show={pending && Boolean(confirm)} label={busyLabel} />

         <AnimatePresence>
            {count > 0 ? (
               <div className="pointer-events-none fixed inset-x-0 bottom-16 z-50 flex justify-center px-3">
                  <motion.div
                     key="bulk-bar"
                     className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-[#100e0b]/95 px-3 py-2 shadow-2xl backdrop-blur-md"
                     {...slideUpIn}
                     transition={springSnappy}
                  >
               <span className="px-1 text-sm font-medium text-white">
                  {count} sélectionné{count > 1 ? "s" : ""}
               </span>

               {typeof onSelectAll === "function" && count < allCount ? (
                  <Button
                     type="button"
                     size="sm"
                     variant="ghost"
                     disabled={pending}
                     className="text-white/80 hover:text-white"
                     onClick={onSelectAll}
                  >
                     Tout sélectionner
                  </Button>
               ) : null}

               {view !== "trash" ? (
                  <>
                     <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending || !hasMovableItems}
                        className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => setMoveOpen(true)}
                        title={
                           !hasMovableItems
                              ? "Sélectionnez au moins un élément"
                              : undefined
                        }
                     >
                        <FolderInput className="size-4" />
                        Déplacer vers dossier…
                     </Button>
                     <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending || fileCount === 0}
                        className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                        onClick={onDownload}
                        title={
                           fileCount === 0
                              ? "Sélectionnez au moins un fichier"
                              : undefined
                        }
                     >
                        {pending ? (
                           <Loader2 className="animate-spin" />
                        ) : (
                           <Download className="size-4" />
                        )}
                        Télécharger
                        {fileCount > 0 ? ` (${fileCount})` : ""}
                     </Button>
                     <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending || fileCount === 0}
                        className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => {
                           setTagsMode("add");
                           setTagsOpen(true);
                        }}
                        title={
                           fileCount === 0
                              ? "Sélectionnez au moins un fichier"
                              : undefined
                        }
                     >
                        <Tags className="size-4" />
                        Tags
                        {fileCount > 0 ? ` (${fileCount})` : ""}
                     </Button>
                     <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                        onClick={() =>
                           setConfirm({
                              type: "trash",
                              title: "Supprimer la sélection ?",
                              description: `${count} élément${
                                 count > 1 ? "s" : ""
                              } seront envoyés à la corbeille.`,
                              confirmLabel: "Supprimer",
                           })
                        }
                     >
                        <Trash2 className="size-4" />
                        Supprimer
                     </Button>
                  </>
               ) : (
                  <>
                     <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                        onClick={() =>
                           run(() => bulkRestoreItems({ fileIds, folderIds }), {
                              successMessage: "Sélection restaurée",
                           })
                        }
                     >
                        {pending ? (
                           <Loader2 className="animate-spin" />
                        ) : (
                           <RotateCcw className="size-4" />
                        )}
                        Restaurer
                     </Button>
                     <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                        onClick={() =>
                           setConfirm({
                              type: "delete-forever",
                              title: "Supprimer définitivement ?",
                              description: `${count} élément${
                                 count > 1 ? "s" : ""
                              } seront effacés définitivement (y compris sur S3).`,
                              confirmLabel: "Supprimer définitivement",
                           })
                        }
                     >
                        <Eraser className="size-4" />
                        Définitif
                     </Button>
                  </>
               )}

               <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={pending}
                  aria-label="Effacer la sélection"
                  className="text-white/70 hover:text-white"
                  onClick={onClear}
               >
                  <X className="size-4" />
               </Button>
                  </motion.div>
               </div>
            ) : null}
         </AnimatePresence>

         <BulkMoveDialog
            open={moveOpen}
            onOpenChange={setMoveOpen}
            selectedItems={selectedItems}
            sourceFolderId={sourceFolderId}
            pending={pending}
            onMove={onMoveDone}
         />

         <Dialog
            open={tagsOpen}
            onOpenChange={(open) => {
               if (!pending) {
                  setTagsOpen(open);
                  if (!open) {
                     setTagsDraft("");
                     setTagsMode("add");
                  }
               }
            }}
         >
            <DialogContent className="border-white/10 bg-[#161310] text-white sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Tags</DialogTitle>
                  <DialogDescription className="text-white/60">
                     {fileCount} fichier{fileCount > 1 ? "s" : ""} sélectionné
                     {fileCount > 1 ? "s" : ""}.
                     {folderIds.length > 0
                        ? " Les dossiers sélectionnés sont ignorés."
                        : ""}
                  </DialogDescription>
               </DialogHeader>

               <div className="flex gap-1 rounded-lg border border-white/10 p-1">
                  <Button
                     type="button"
                     size="sm"
                     variant={tagsMode === "add" ? "secondary" : "ghost"}
                     className="flex-1"
                     onClick={() => setTagsMode("add")}
                  >
                     <Plus className="size-3.5" />
                     Ajouter
                  </Button>
                  <Button
                     type="button"
                     size="sm"
                     variant={tagsMode === "remove" ? "secondary" : "ghost"}
                     className="flex-1"
                     onClick={() => setTagsMode("remove")}
                  >
                     <Minus className="size-3.5" />
                     Retirer
                  </Button>
               </div>

               <TagInput
                  space={tagSpace}
                  value={tagsDraft}
                  disabled={pending}
                  placeholder={
                     tagsMode === "add"
                        ? "ex. vacances, 2024, famille"
                        : "ex. brouillon, temporaire"
                  }
                  className="border-white/15 bg-black/30 text-white"
                  onChange={(event) => setTagsDraft(event.target.value)}
                  onKeyDown={(event) => {
                     if (event.key === "Enter") onApplyTags();
                  }}
                  autoFocus
               />

               <DialogFooter>
                  <Button
                     type="button"
                     variant="ghost"
                     disabled={pending}
                     className="text-white/70 hover:text-white"
                     onClick={() => setTagsOpen(false)}
                  >
                     Annuler
                  </Button>
                  <Button
                     type="button"
                     disabled={pending || !tagsDraft.trim()}
                     onClick={onApplyTags}
                  >
                     {pending ? <Loader2 className="animate-spin" /> : null}
                     {tagsMode === "add" ? "Ajouter" : "Retirer"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

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
            onConfirm={() => {
               if (confirm?.type === "trash") {
                  run(() => bulkTrashItems({ fileIds, folderIds }), {
                     successMessage: "Sélection mise à la corbeille",
                  });
                  return;
               }
               if (confirm?.type === "delete-forever") {
                  run(() => bulkDeletePermanentItems({ fileIds, folderIds }), {
                     successMessage: "Sélection supprimée définitivement",
                  });
               }
            }}
         />
      </>
   );
}
