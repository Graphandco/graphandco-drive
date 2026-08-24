"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FolderSearch, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteSmartFolder } from "@/actions";
import { CreateSmartFolderDialog } from "@/components/smart-folders/create-smart-folder-dialog";
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
  const [deletingId, setDeletingId] = useState(null);

  const spaceKey = active?.space || active?.url?.replace(/^\//, "");
  const activeSmartId = searchParams.get("smart");

  const foldersForSpace = useMemo(
    () => smartFolders.filter((entry) => entry.space === spaceKey),
    [smartFolders, spaceKey]
  );

  if (!active || !spaceKey) return null;

  async function onDelete(event, folder) {
    event.preventDefault();
    event.stopPropagation();
    if (deletingId) return;

    setDeletingId(folder.id);
    try {
      const result = await deleteSmartFolder(folder.id);
      if (!result.success) {
        toast.error(result.error || "Suppression impossible");
        return;
      }

      toast.success(`Dossier « ${folder.name} » supprimé`);
      if (String(activeSmartId) === String(folder.id)) {
        router.push(active.url);
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center gap-1.5">
          <Sparkles className="size-3.5" />
          Smart folders
        </SidebarGroupLabel>
        <SidebarMenu>
          {foldersForSpace.map((folder) => {
            const href = smartFolderHref(spaceKey, folder.id);
            const isActive =
              pathname === active.url && String(activeSmartId) === String(folder.id);

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
                  aria-label={`Supprimer ${folder.name}`}
                  disabled={deletingId === folder.id}
                  onClick={(event) => onDelete(event, folder)}
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
      </SidebarGroup>

      <CreateSmartFolderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        space={spaceKey}
        existingTags={foldersForSpace.map((folder) => folder.tag)}
      />
    </>
  );
}
