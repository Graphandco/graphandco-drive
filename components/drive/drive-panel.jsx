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
}) {
  const [layout, setLayout] = useState("grid");

  useEffect(() => {
    const stored = window.localStorage.getItem(LAYOUT_KEY);
    if (stored === "grid" || stored === "compact" || stored === "list") {
      setLayout(stored);
    }
  }, []);

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
        openFileId={openFileId}
        layout={layout}
      />
    </>
  );
}
