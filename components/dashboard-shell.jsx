"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { BucketMemoryProvider } from "@/components/bucket-memory";
import { DriveDndProvider } from "@/components/drive/drive-dnd-provider";
import { DriveDropZone } from "@/components/drive/drive-drop-zone";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function DashboardShell({
  children,
  folderTrees,
  smartFolders,
  lastBucketSpace,
}) {
  const pathname = usePathname();
  const onSettings = pathname.startsWith("/settings");

  return (
    <DriveDndProvider>
      <DriveDropZone>
        <BucketMemoryProvider initialSpace={lastBucketSpace}>
          <SidebarProvider>
            <AppSidebar
              folderTrees={folderTrees}
              smartFolders={smartFolders}
            />
            <SidebarInset className="bg-transparent">
              <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />
                <PageBreadcrumb pathname={pathname} className="min-w-0 flex-1" />
                <Button
                  asChild
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Paramètres"
                  aria-current={onSettings ? "page" : undefined}
                >
                  <Link href="/settings">
                    <Settings className="size-4" />
                  </Link>
                </Button>
              </header>
              <main className="flex flex-1 flex-col p-4">{children}</main>
            </SidebarInset>
          </SidebarProvider>
        </BucketMemoryProvider>
      </DriveDropZone>
    </DriveDndProvider>
  );
}
