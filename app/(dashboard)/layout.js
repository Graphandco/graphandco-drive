import { cookies } from "next/headers";
import { Suspense } from "react";

import { getSidebarFolderTrees, listSmartFolders } from "@/actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { readBucketCookie } from "@/lib/bucket";

export default async function DashboardLayout({ children }) {
  const [trees, smartFolders, cookieStore] = await Promise.all([
    getSidebarFolderTrees(),
    listSmartFolders(),
    cookies(),
  ]);

  return (
    <Suspense fallback={null}>
      <DashboardShell
        folderTrees={trees.data}
        smartFolders={smartFolders.data || []}
        lastBucketSpace={readBucketCookie(cookieStore)}
      >
        {children}
      </DashboardShell>
    </Suspense>
  );
}
