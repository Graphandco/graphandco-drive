import { getDriveContents } from "@/actions/drive";
import { DriveContent } from "@/components/drive/drive-content";

export async function DriveBrowser({
  space = "sixmyk",
  folderId,
  openFileId,
  view = "browse",
}) {
  const contents = await getDriveContents({ space, folderId, view });

  if (!contents.success && view === "browse") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {contents.error || "Impossible de charger le Drive."}
      </div>
    );
  }

  return (
    <DriveContent
      space={space}
      view={view}
      path={contents.path || []}
      stats={contents.stats || { fileCount: 0, totalBytes: 0 }}
      folders={contents.folders || []}
      files={contents.files || []}
      folder={contents.folder}
      openFileId={openFileId}
      error={contents.error || null}
      galleryMode={contents.galleryMode || false}
      filesPagination={contents.filesPagination || null}
    />
  );
}
