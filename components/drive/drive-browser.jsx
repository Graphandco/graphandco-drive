import { getDriveContents } from "@/actions/drive";
import { DriveContent } from "@/components/drive/drive-content";

export async function DriveBrowser({
  space = "sixmyk",
  folderId,
  smartFolderId,
  favoritesMode = false,
  openFileId,
  view = "browse",
  recentDays = null,
}) {
  const contents = await getDriveContents({
    space,
    folderId,
    smartFolderId,
    favoritesMode,
    view,
    recentDays,
  });

  if (
    !contents.success &&
    (view === "browse" ||
      view === "recent" ||
      view === "orphans" ||
      view === "untagged" ||
      view === "duplicates")
  ) {
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
      smartFolderMode={contents.smartFolderMode || false}
      smartFolder={contents.smartFolder || null}
      favoritesMode={contents.favoritesMode || false}
      filesPagination={contents.filesPagination || null}
      recentDays={contents.recentDays ?? recentDays}
    />
  );
}
