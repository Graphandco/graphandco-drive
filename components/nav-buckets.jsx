"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Folder, Home } from "lucide-react";
import { motion } from "motion/react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  useDriveDndOptional,
  useFolderDropTarget,
} from "@/components/drive/drive-dnd-provider";
import { FolderDropBadge } from "@/components/drive/folder-drop-badge";
import { folderHref, getSpaceConfig } from "@/lib/drive";
import { useActiveBucket } from "@/hooks/use-active-bucket";
import { cn } from "@/lib/utils";

function DropHighlight({
  active,
  children,
  className,
  folderDropProps,
  fileAction,
  showFileBadge,
  layoutId = "sidebar-drop-ring",
  draggable = false,
  onDragStart,
}) {
  const isMove = fileAction === "move";

  return (
    <div
      className={cn(
        "relative w-full rounded-md",
        draggable && "cursor-grab active:cursor-grabbing",
        className
      )}
      draggable={draggable}
      onDragStart={onDragStart}
      {...folderDropProps}
    >
      <motion.div
        className={cn(
          "relative w-full rounded-md",
          active && (isMove ? "bg-red-500/15" : "bg-emerald-500/15")
        )}
        animate={{ scale: active ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
      >
        {children}
      </motion.div>
      {active ? (
        <motion.span
          className={cn(
            "pointer-events-none absolute inset-0 z-10 rounded-md ring-2",
            isMove ? "ring-red-500/70" : "ring-emerald-500/70"
          )}
          layoutId={layoutId}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      ) : null}
      {showFileBadge ? (
        <FolderDropBadge mode={fileAction} className="pointer-events-none" />
      ) : null}
    </div>
  );
}

function FolderDropLink({ node, href, active, children, className }) {
  const dnd = useDriveDndOptional();
  const { active: dropActive, fileAction, showFileBadge, folderDropProps } =
    useFolderDropTarget({
      folderId: node.id,
      space: node.space,
    });

  function onDragStart(event) {
    if (!dnd) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    dnd.beginDrag(event, {
      space: node.space,
      items: [{ kind: "folder", id: node.id, name: node.name }],
      sourceFolderId: node.parent_id ?? null,
    });
  }

  return (
    <DropHighlight
      active={dropActive}
      folderDropProps={folderDropProps}
      fileAction={fileAction}
      showFileBadge={showFileBadge}
      layoutId={`sidebar-drop-ring-${node.id}`}
      draggable
      onDragStart={onDragStart}
    >
      <SidebarMenuSubButton
        asChild
        isActive={active}
        className={cn(className, dropActive && "text-primary")}
      >
        <Link
          href={href}
          draggable={false}
          onClick={(event) => {
            if (dnd?.isDragging) event.preventDefault();
          }}
        >
          {children}
        </Link>
      </SidebarMenuSubButton>
    </DropHighlight>
  );
}

function FolderNodes({ nodes }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFolder = searchParams.get("folder");

  if (!nodes?.length) return null;

  return (
    <SidebarMenuSub>
      {nodes.map((node) => {
        const href = folderHref(node.space, node.id);
        const active =
          pathname === `/${node.space}` &&
          String(currentFolder) === String(node.id);
        const hasChildren = Boolean(node.children?.length);

        if (!hasChildren) {
          return (
            <SidebarMenuSubItem key={node.id}>
              <FolderDropLink node={node} href={href} active={active}>
                <Folder />
                <span>{node.name}</span>
              </FolderDropLink>
            </SidebarMenuSubItem>
          );
        }

        return (
          <Collapsible
            key={node.id}
            asChild
            defaultOpen={active || pathname === `/${node.space}`}
            className="group/folder"
          >
            <SidebarMenuSubItem>
              <div className="flex w-full items-center gap-0.5">
                <FolderDropLink
                  node={node}
                  href={href}
                  active={active}
                  className="min-w-0 flex-1"
                >
                  <Folder />
                  <span>{node.name}</span>
                </FolderDropLink>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
                    aria-label={`Déplier ${node.name}`}
                  >
                    <ChevronRight className="size-3.5 transition-transform group-data-[state=open]/folder:rotate-90" />
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <FolderNodes nodes={node.children} />
              </CollapsibleContent>
            </SidebarMenuSubItem>
          </Collapsible>
        );
      })}
    </SidebarMenuSub>
  );
}

/** Arbre de dossiers du dernier bucket (URL ou cookie) */
export function NavBuckets({ buckets = [], folderTrees = {} }) {
  const searchParams = useSearchParams();
  const currentFolder = searchParams.get("folder");
  const { active, onDrive } = useActiveBucket(buckets);
  const dnd = useDriveDndOptional();

  if (!active) return null;

  const spaceKey = active.space || active.url.replace(/^\//, "");
  const tree = folderTrees[spaceKey] || [];
  const rootActive = onDrive && !currentFolder;
  const rootFolderId = getSpaceConfig(spaceKey).rootFolderId;

  const {
    active: rootDropActive,
    fileAction: rootFileAction,
    showFileBadge: rootShowFileBadge,
    folderDropProps: rootFolderDropProps,
  } = useFolderDropTarget({
    folderId: rootFolderId,
    space: spaceKey,
  });

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Dossiers</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropHighlight
            active={rootDropActive}
            folderDropProps={rootFolderDropProps}
            fileAction={rootFileAction}
            showFileBadge={rootShowFileBadge}
            layoutId={`sidebar-drop-ring-root-${rootFolderId}`}
          >
            <SidebarMenuButton
              asChild
              isActive={rootActive}
              tooltip={active.name}
              className={cn(rootDropActive && "text-primary")}
            >
              <Link
                href={active.url}
                aria-label={`Racine ${active.name}`}
                draggable={false}
                onClick={(event) => {
                  if (dnd?.isDragging) event.preventDefault();
                }}
              >
                <Home />
                <span>{active.name}</span>
              </Link>
            </SidebarMenuButton>
          </DropHighlight>
          {tree.length > 0 ? <FolderNodes nodes={tree} /> : null}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
