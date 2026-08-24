"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Folder, Home } from "lucide-react";

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
import { folderHref } from "@/lib/drive";
import { useActiveBucket } from "@/hooks/use-active-bucket";

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
              <SidebarMenuSubButton asChild isActive={active}>
                <Link href={href}>
                  <Folder />
                  <span>{node.name}</span>
                </Link>
              </SidebarMenuSubButton>
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
              <div className="flex w-full items-center">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
                    aria-label={`Déplier ${node.name}`}
                  >
                    <ChevronRight className="size-3.5 transition-transform group-data-[state=open]/folder:rotate-90" />
                  </button>
                </CollapsibleTrigger>
                <SidebarMenuSubButton
                  asChild
                  isActive={active}
                  className="flex-1"
                >
                  <Link href={href}>
                    <Folder />
                    <span>{node.name}</span>
                  </Link>
                </SidebarMenuSubButton>
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

  if (!active) return null;

  const spaceKey = active.space || active.url.replace(/^\//, "");
  const tree = folderTrees[spaceKey] || [];
  const rootActive = onDrive && !currentFolder;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Dossiers</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={rootActive}
            tooltip={active.name}
          >
            <Link href={active.url} aria-label={`Racine ${active.name}`}>
              <Home />
              <span>{active.name}</span>
            </Link>
          </SidebarMenuButton>
          {tree.length > 0 ? <FolderNodes nodes={tree} /> : null}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
