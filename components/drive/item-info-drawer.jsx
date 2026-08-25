"use client";

import { useEffect, useState, useTransition } from "react";
import { File, Folder, Pencil } from "lucide-react";
import { toast } from "sonner";

import { renameFolder, updateFileMetadata } from "@/actions";
import { FileThumbnail } from "@/components/drive/file-thumbnail";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/drive/tag-input";
import { isImageFile } from "@/lib/mime";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function spaceLabel(space) {
  if (space === "public") return "Public";
  if (space === "sixmyk") return "6-MyK";
  if (space === "regis") return "Régis";
  return space || "—";
}

function InfoRow({ label, children, className }) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-xs font-medium text-white/50">{label}</dt>
      <dd className="text-sm text-white/90">{children}</dd>
    </div>
  );
}

function EditableField({
  label,
  value,
  editValue,
  editable = true,
  pending,
  inputType = "text",
  placeholder,
  tagSpace = null,
  onSave,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(editValue ?? value ?? "");
  const FieldInput = tagSpace ? TagInput : Input;

  useEffect(() => {
    if (!editing) {
      setDraft(editValue ?? value ?? "");
    }
  }, [value, editValue, editing]);

  async function handleSave() {
    const result = await onSave(draft);
    if (result !== false) {
      setEditing(false);
    }
  }

  return (
    <InfoRow label={label}>
      {editing ? (
        <div className="flex flex-col gap-2">
          <FieldInput
            type={tagSpace ? "text" : inputType}
            space={tagSpace || undefined}
            value={draft}
            placeholder={placeholder}
            disabled={pending}
            className="border-white/15 bg-black/30 text-white"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSave();
              if (event.key === "Escape") setEditing(false);
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={handleSave}
            >
              Enregistrer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              className="text-white/70 hover:text-white"
              onClick={() => setEditing(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 break-words">
            {value?.toString()?.trim() ? value : "—"}
          </span>
          {editable ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              disabled={pending}
              aria-label={`Modifier ${label}`}
              className="shrink-0 text-white/50 hover:bg-white/10 hover:text-white"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
          ) : null}
        </div>
      )}
    </InfoRow>
  );
}

export function ItemInfoDrawer({ open, onOpenChange, item, onSaved }) {
  const [pending, startTransition] = useTransition();

  if (!item) return null;

  const isFile = item.kind === "file";
  const isImage =
    isFile && isImageFile({ mimeType: item.mime_type, name: item.name });

  function save(partial) {
    return new Promise((resolve) => {
      startTransition(async () => {
        let result;
        if (item.kind === "folder") {
          if (partial.name !== undefined) {
            result = await renameFolder({ id: item.id, name: partial.name });
          } else {
            resolve(true);
            return;
          }
        } else {
          result = await updateFileMetadata({ id: item.id, ...partial });
        }

        if (!result?.success) {
          toast.error(result?.error || "Enregistrement impossible.");
          resolve(false);
          return;
        }

        toast.success("Enregistré.");
        onSaved?.();
        resolve(true);
      });
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full max-h-none text-white">
        <DrawerHeader>
          <DrawerTitle>
            {isFile ? "Informations fichier" : "Informations dossier"}
          </DrawerTitle>
          <DrawerDescription>
            {isFile
              ? "Métadonnées et détails du fichier."
              : "Détails du dossier."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
          {isFile && isImage ? (
            <div className="mx-auto h-40 w-full max-w-[200px] overflow-hidden rounded-lg border border-white/10 bg-black/30">
              <FileThumbnail file={item} fit="contain" />
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-lg border border-white/10 bg-primary/10">
              {isFile ? (
                <File className="size-10 text-white/50" />
              ) : (
                <Folder className="size-10 text-primary" />
              )}
            </div>
          )}

          <dl className="space-y-4">
            <EditableField
              label="Nom"
              value={item.name}
              pending={pending}
              onSave={(next) => save({ name: next })}
            />

            {isFile ? (
              <>
                <EditableField
                  label="Tags"
                  value={item.tags || ""}
                  pending={pending}
                  placeholder="vacances, famille, 2024"
                  tagSpace={item.space}
                  onSave={(next) => save({ tags: next })}
                />
                <EditableField
                  label="Date de prise"
                  value={
                    item.captured_at ? formatDate(item.captured_at) : ""
                  }
                  editValue={toDatetimeLocalValue(item.captured_at)}
                  pending={pending}
                  inputType="datetime-local"
                  onSave={(next) =>
                    save({ captured_at: next?.trim() ? next : null })
                  }
                />
                <InfoRow label="Type">{item.mime_type || "—"}</InfoRow>
                <InfoRow label="Taille">
                  {formatBytes(item.size_bytes)}
                </InfoRow>
                {isImage ? (
                  <InfoRow label="Dimensions">
                    {item.width_px && item.height_px
                      ? `${item.width_px} × ${item.height_px} px`
                      : "—"}
                  </InfoRow>
                ) : null}
              </>
            ) : null}

            <InfoRow label="Espace">{spaceLabel(item.space)}</InfoRow>
            <InfoRow label="Créé le">{formatDate(item.created_at)}</InfoRow>
            <InfoRow label="Modifié le">{formatDate(item.updated_at)}</InfoRow>

            {item.deleted_at ? (
              <InfoRow label="Supprimé le">
                {formatDate(item.deleted_at)}
              </InfoRow>
            ) : null}

            {isFile && item.storage_key ? (
              <InfoRow label="Clé stockage">
                <span className="break-all font-mono text-xs text-white/60">
                  {item.storage_key}
                </span>
              </InfoRow>
            ) : null}
          </dl>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
