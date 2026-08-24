import { cookies } from "next/headers";
import { Suspense } from "react";

import { getSidebarFolderTrees } from "@/actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { readBucketCookie } from "@/lib/bucket";

export default async function DashboardLayout({ children }) {
  const [trees, cookieStore] = await Promise.all([
    getSidebarFolderTrees(),
    cookies(),
  ]);

  return (
    <Suspense fallback={null}>
      <DashboardShell
        folderTrees={trees.data}
        lastBucketSpace={readBucketCookie(cookieStore)}
      >
        {children}
      </DashboardShell>
    </Suspense>
  );
}
