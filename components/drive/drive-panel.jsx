"use client";

import { useEffect, useState } from "react";

import { DriveList } from "@/components/drive/drive-list";
import { DriveToolbar } from "@/components/drive/drive-toolbar";

const LAYOUT_KEY = "drive-layout";

export function DrivePanel({
  folders = [],
  files = [],
  view = "browse",
  space,
  folderId,
  folderName,
  isRootFolder = false,
  openFileId,
  trashCount,
  galleryMode = false,
  smartFolderMode = false,
  smartFolder = null,
  searchQuery = "",
  debouncedSearchQuery = "",
  onSearchMetaChange,
  filesPagination = null,
  crossSpaceMode = false,
  recentDays = null,
}) {
  const [layout, setLayout] = useState("grid");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(LAYOUT_KEY);
    if (stored === "grid" || stored === "compact" || stored === "list") {
      setLayout(stored);
    }
  }, []);

  useEffect(() => {
    setFavoritesOnly(false);
  }, [folderId, space, view, smartFolderMode, galleryMode]);

  function onLayoutChange(next) {
    setLayout(next);
    window.localStorage.setItem(LAYOUT_KEY, next);
  }

  return (
    <>
      <DriveToolbar
        folderId={folderId}
        folderName={folderName}
        isRootFolder={isRootFolder}
        space={space}
        view={view}
        layout={layout}
        onLayoutChange={onLayoutChange}
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
        smartFolderMode={smartFolderMode}
        trashCount={
          typeof trashCount === "number"
            ? trashCount
            : folders.length + files.length
        }
      />
      <DriveList
        folders={folders}
        files={files}
        view={view}
        space={space}
        folderId={folderId}
        openFileId={openFileId}
        layout={layout}
        galleryMode={galleryMode}
        smartFolderMode={smartFolderMode}
        smartFolder={smartFolder}
        searchQuery={searchQuery}
        debouncedSearchQuery={debouncedSearchQuery}
        onSearchMetaChange={onSearchMetaChange}
        filesPagination={filesPagination}
        crossSpaceMode={crossSpaceMode}
        recentDays={recentDays}
        favoritesOnly={favoritesOnly}
      />
    </>
  );
}
