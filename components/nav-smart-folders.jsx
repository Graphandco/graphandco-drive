"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronRight, FolderSearch, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteSmartFolder } from "@/actions";
import { ConfirmDialog } from "@/components/drive/confirm-dialog";
import { CreateSmartFolderDialog } from "@/components/smart-folders/create-smart-folder-dialog";
import { EditSmartFolderDialog } from "@/components/smart-folders/edit-smart-folder-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useActiveBucket } from "@/hooks/use-active-bucket";
import { smartFolderHref } from "@/lib/drive";
import { cn } from "@/lib/utils";

export function NavSmartFolders({ buckets = [], smartFolders = [] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { active } = useActiveBucket(buckets);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmFolder, setConfirmFolder] = useState(null);
  const [editFolder, setEditFolder] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const spaceKey = active?.space || active?.url?.replace(/^\//, "");
  const activeSmartId = searchParams.get("smart");

  const foldersForSpace = useMemo(
    () => smartFolders.filter((entry) => entry.space === spaceKey),
    [smartFolders, spaceKey]
  );

  const hasActiveSmartFolder = foldersForSpace.some(
    (folder) =>
      pathname === active?.url &&
      String(activeSmartId) === String(folder.id)
  );

  if (!active || !spaceKey) return null;

  async function runDelete() {
    if (!confirmFolder || deleting) return;

    setDeleting(true);
    try {
      const result = await deleteSmartFolder(confirmFolder.id);
      if (!result.success) {
        toast.error(result.error || "Suppression impossible");
        return;
      }

      toast.success(`Dossier « ${confirmFolder.name} » supprimé`);
      if (String(activeSmartId) === String(confirmFolder.id)) {
        router.push(active.url);
      }
      router.refresh();
      setConfirmFolder(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Collapsible
        defaultOpen={hasActiveSmartFolder || foldersForSpace.length > 0}
        className="group/smart-folders"
      >
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-1.5 [&>svg:last-child]:ml-auto">
              <Sparkles className="size-3.5" />
              Smart folders
              <ChevronRight className="size-3.5 transition-transform duration-200 group-data-[state=open]/smart-folders:rotate-90" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarMenu>
              {foldersForSpace.map((folder) => {
                const href = smartFolderHref(spaceKey, folder.id);
                const isActive =
                  pathname === active.url &&
                  String(activeSmartId) === String(folder.id);

                return (
                  <SidebarMenuItem key={folder.id}>
                    <SidebarMenuButton
                      asChild
                      tooltip={folder.name}
                      isActive={isActive}
                      className={cn(isActive && "text-primary")}
                    >
                      <Link href={href}>
                        <FolderSearch />
                        <span className="truncate">{folder.name}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      aria-label={`Modifier ${folder.name}`}
                      disabled={deleting}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setEditFolder(folder);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </SidebarMenuAction>
                    <SidebarMenuAction
                      showOnHover
                      aria-label={`Supprimer ${folder.name}`}
                      disabled={deleting}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setConfirmFolder(folder);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton
                  type="button"
                  tooltip="Nouveau dossier intelligent"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus />
                  <span>Ajouter…</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>

      <CreateSmartFolderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        space={spaceKey}
        existingTags={foldersForSpace.map((folder) => folder.tag)}
      />

      <EditSmartFolderDialog
        open={Boolean(editFolder)}
        onOpenChange={(open) => !open && setEditFolder(null)}
        folder={editFolder}
        existingTags={foldersForSpace.map((folder) => folder.tag)}
      />

      <ConfirmDialog
        open={Boolean(confirmFolder)}
        onOpenChange={(open) => {
          if (!open && !deleting) setConfirmFolder(null);
        }}
        title="Supprimer ce dossier intelligent ?"
        description={
          confirmFolder
            ? `« ${confirmFolder.name} » sera retiré de la sidebar.\nLes fichiers et leurs tags ne seront pas modifiés.`
            : undefined
        }
        confirmLabel="Supprimer"
        destructive
        pending={deleting}
        pendingLabel="Suppression…"
        onConfirm={runDelete}
      />
    </>
  );
}
