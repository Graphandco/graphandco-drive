"use client";

import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { BucketMemoryProvider } from "@/components/bucket-memory";
import { DriveDndProvider } from "@/components/drive/drive-dnd-provider";
import { DriveDropZone } from "@/components/drive/drive-drop-zone";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function DashboardShell({ children, folderTrees, lastBucketSpace }) {
  const pathname = usePathname();

  return (
    <DriveDndProvider>
      <DriveDropZone>
        <BucketMemoryProvider initialSpace={lastBucketSpace}>
          <SidebarProvider>
            <AppSidebar folderTrees={folderTrees} />
            <SidebarInset className="bg-transparent">
              <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />
                <PageBreadcrumb pathname={pathname} />
              </header>
              <main className="flex flex-1 flex-col p-4">{children}</main>
            </SidebarInset>
          </SidebarProvider>
        </BucketMemoryProvider>
      </DriveDropZone>
    </DriveDndProvider>
  );
}
