"use client";

import { useEffect, useRef, useState } from "react";

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
  favoritesMode = false,
  searchQuery = "",
  debouncedSearchQuery = "",
  onSearchMetaChange,
  filesPagination = null,
  crossSpaceMode = false,
  recentDays = null,
}) {
  const [layout, setLayout] = useState("grid");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const selectAllRef = useRef(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(LAYOUT_KEY);
    if (stored === "grid" || stored === "compact" || stored === "list") {
      setLayout(stored);
    }
  }, []);

  useEffect(() => {
    setFavoritesOnly(false);
  }, [folderId, space, view, smartFolderMode, galleryMode, favoritesMode]);

  function onLayoutChange(next) {
    setLayout(next);
    window.localStorage.setItem(LAYOUT_KEY, next);
  }

  function onSelectAll() {
    return selectAllRef.current?.selectAll?.();
  }

  const effectiveFavoritesOnly = favoritesMode || favoritesOnly;

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
        favoritesOnly={effectiveFavoritesOnly}
        onFavoritesOnlyChange={favoritesMode ? undefined : setFavoritesOnly}
        smartFolderMode={smartFolderMode || favoritesMode}
        onSelectAll={onSelectAll}
        selectingAll={selectingAll}
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
        favoritesMode={favoritesMode}
        searchQuery={searchQuery}
        debouncedSearchQuery={debouncedSearchQuery}
        onSearchMetaChange={onSearchMetaChange}
        filesPagination={filesPagination}
        crossSpaceMode={crossSpaceMode}
        recentDays={recentDays}
        favoritesOnly={effectiveFavoritesOnly}
        selectAllRef={selectAllRef}
        onSelectingAllChange={setSelectingAll}
      />
    </>
  );
}
