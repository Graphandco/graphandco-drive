import { getDriveContents } from "@/actions/drive";
import { DuplicatesPanel } from "@/components/drive/duplicates-panel";

export async function DuplicatesBrowser() {
  const contents = await getDriveContents({ view: "duplicates" });

  if (!contents.success) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {contents.error || "Impossible de charger les doublons."}
      </div>
    );
  }

  return (
    <DuplicatesPanel
      initialFiles={contents.files || []}
      initialPagination={contents.filesPagination || null}
      stats={contents.stats || { fileCount: 0, totalBytes: 0 }}
    />
  );
}
