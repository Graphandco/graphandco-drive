"use server";

import { revalidatePath } from "next/cache";

import { getSpaceConfig, isGalleryHome, FILES_PAGE_SIZE } from "@/lib/drive";
import { query } from "@/lib/db";
import {
  getFolder,
  getFolderPath,
  listFolders,
} from "@/actions/folders";
import {
  getFolderStats,
  getSpaceStats,
  listFilesPaginated,
} from "@/actions/files";
import { deleteObject } from "@/lib/storage";

export async function getDriveContents({
  space = "sixmyk",
  folderId,
  view = "browse",
} = {}) {
  const spaceConfig = getSpaceConfig(space);
  const resolvedFolderId =
    view === "browse"
      ? Number(folderId) || spaceConfig.rootFolderId
      : null;

  if (view === "browse") {
    const folderResult = await getFolder(resolvedFolderId);

    if (!folderResult.success) {
      return {
        success: false,
        error: folderResult.error,
        folder: null,
        path: [],
        folders: [],
        files: [],
        stats: { fileCount: 0, totalBytes: 0 },
        galleryMode: false,
        filesPagination: null,
      };
    }

    if (folderResult.data.space !== space) {
      return {
        success: false,
        error: "Ce dossier n’appartient pas à cet espace.",
        folder: null,
        path: [],
        folders: [],
        files: [],
        stats: { fileCount: 0, totalBytes: 0 },
        galleryMode: false,
        filesPagination: null,
      };
    }

    const galleryMode = isGalleryHome({
      space,
      folderId: resolvedFolderId,
      view,
    });

    const [pathResult, foldersResult, filesResult, statsResult] =
      await Promise.all([
        getFolderPath(resolvedFolderId),
        listFolders({ parentId: resolvedFolderId, space, view }),
        listFilesPaginated({
          space,
          folderId: galleryMode ? null : resolvedFolderId,
          view,
          limit: galleryMode ? FILES_PAGE_SIZE : 10000,
          offset: 0,
        }),
        galleryMode
          ? getSpaceStats(space)
          : getFolderStats(resolvedFolderId),
      ]);

    return {
      success: true,
      folder: folderResult.data,
      path: pathResult.data || [],
      folders: foldersResult.data || [],
      files: filesResult.data || [],
      stats: statsResult.data || { fileCount: 0, totalBytes: 0 },
      galleryMode,
      filesPagination: filesResult.pagination || null,
      error:
        foldersResult.error ||
        filesResult.error ||
        pathResult.error ||
        statsResult.error ||
        null,
    };
  }

  const [foldersResult, filesResult] = await Promise.all([
    listFolders({ space, view }),
    listFilesPaginated({ space, view, limit: 10000, offset: 0 }),
  ]);

  return {
    success: true,
    folder: null,
    path: [],
    folders: foldersResult.data || [],
    files: filesResult.data || [],
    stats: { fileCount: 0, totalBytes: 0 },
    galleryMode: false,
    filesPagination: filesResult.pagination || null,
    error: foldersResult.error || filesResult.error || null,
  };
}

/** Purge définitive de toute la corbeille (DB + S3) */
export async function emptyTrash() {
  try {
    const files = await query(
      `SELECT id, storage_key, thumbnail_key, storage_location
       FROM files
       WHERE deleted_at IS NOT NULL`
    );

    for (const file of files) {
      const location = file.storage_location || "sixmyk";
      if (file.storage_key) {
        await deleteObject({
          location,
          key: file.storage_key,
        }).catch((error) => {
          console.error("emptyTrash/storage:", error);
        });
      }
      if (file.thumbnail_key) {
        await deleteObject({
          location,
          key: file.thumbnail_key,
        }).catch((error) => {
          console.error("emptyTrash/thumbnail:", error);
        });
      }
    }

    const rootIds = [
      getSpaceConfig("sixmyk").rootFolderId,
      getSpaceConfig("public").rootFolderId,
      getSpaceConfig("regis").rootFolderId,
    ];

    await query(`DELETE FROM files WHERE deleted_at IS NOT NULL`);

    await query(
      `DELETE FROM folders
       WHERE deleted_at IS NOT NULL
         AND id NOT IN (?, ?, ?)`,
      rootIds
    );

    revalidatePath("/trash");
    revalidatePath("/sixmyk");
    revalidatePath("/regis");
    revalidatePath("/public");
    revalidatePath("/", "layout");

    return {
      success: true,
      data: {
        deletedFiles: files.length,
      },
    };
  } catch (error) {
    console.error("emptyTrash:", error);
    return {
      success: false,
      error: error?.message || "Impossible de vider la corbeille.",
    };
  }
}
