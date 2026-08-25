"use server";

import { revalidatePath } from "next/cache";

import { getSpaceConfig, isGalleryHome, FILES_PAGE_SIZE } from "@/lib/drive";
import { resolveRecentDays } from "@/lib/recent-settings";
import { query } from "@/lib/db";
import {
  getFolder,
  getFolderPath,
  listFolders,
} from "@/actions/folders";
import {
  getFolderStats,
  getSpaceStats,
  getTagStats,
  listFilesPaginated,
} from "@/actions/files";
import { getSmartFolder } from "@/actions/smart-folders";
import { deleteObject } from "@/lib/storage";

export async function getDriveContents({
  space = "sixmyk",
  folderId,
  smartFolderId,
  favoritesMode = false,
  view = "browse",
  recentDays = null,
} = {}) {
  const spaceConfig = getSpaceConfig(space);

  if (view === "recent") {
    const days = resolveRecentDays(recentDays);
    const filesResult = await listFilesPaginated({
      view: "recent",
      recentDays: days,
      limit: FILES_PAGE_SIZE,
      offset: 0,
    });

    return {
      success: true,
      folder: null,
      path: [],
      folders: [],
      files: filesResult.data || [],
      stats: filesResult.stats || {
        fileCount: filesResult.pagination?.total || 0,
        totalBytes: 0,
      },
      galleryMode: false,
      smartFolderMode: false,
      smartFolder: null,
      favoritesMode: false,
      filesPagination: filesResult.pagination || null,
      recentDays: days,
      error: filesResult.error || null,
    };
  }

  if (view === "orphans") {
    const filesResult = await listFilesPaginated({
      view: "orphans",
      limit: FILES_PAGE_SIZE,
      offset: 0,
    });

    return {
      success: true,
      folder: null,
      path: [],
      folders: [],
      files: filesResult.data || [],
      stats: filesResult.stats || {
        fileCount: filesResult.pagination?.total || 0,
        totalBytes: 0,
      },
      galleryMode: false,
      smartFolderMode: false,
      smartFolder: null,
      filesPagination: filesResult.pagination || null,
      recentDays: null,
      error: filesResult.error || null,
    };
  }

  if (view === "untagged") {
    const filesResult = await listFilesPaginated({
      view: "untagged",
      limit: FILES_PAGE_SIZE,
      offset: 0,
    });

    return {
      success: true,
      folder: null,
      path: [],
      folders: [],
      files: filesResult.data || [],
      stats: filesResult.stats || {
        fileCount: filesResult.pagination?.total || 0,
        totalBytes: 0,
      },
      galleryMode: false,
      smartFolderMode: false,
      smartFolder: null,
      filesPagination: filesResult.pagination || null,
      recentDays: null,
      error: filesResult.error || null,
    };
  }

  if (view === "duplicates") {
    const filesResult = await listFilesPaginated({
      view: "duplicates",
      limit: FILES_PAGE_SIZE,
      offset: 0,
    });

    return {
      success: true,
      folder: null,
      path: [],
      folders: [],
      files: filesResult.data || [],
      stats: filesResult.stats || {
        fileCount: filesResult.pagination?.total || 0,
        totalBytes: 0,
      },
      galleryMode: false,
      smartFolderMode: false,
      smartFolder: null,
      filesPagination: filesResult.pagination || null,
      recentDays: null,
      error: filesResult.error || null,
    };
  }

  if (view === "browse" && favoritesMode) {
    const filesResult = await listFilesPaginated({
      space,
      folderId: null,
      favoritesOnly: true,
      limit: FILES_PAGE_SIZE,
      offset: 0,
    });

    return {
      success: true,
      folder: null,
      path: [
        {
          id: "favorites",
          name: "Favoris",
          favorites: true,
        },
      ],
      folders: [],
      files: filesResult.data || [],
      stats: filesResult.stats || {
        fileCount: filesResult.pagination?.total || 0,
        totalBytes: 0,
      },
      galleryMode: true,
      smartFolderMode: false,
      smartFolder: null,
      favoritesMode: true,
      filesPagination: filesResult.pagination || null,
      error: filesResult.error || null,
    };
  }

  if (view === "browse" && smartFolderId) {
    const smartResult = await getSmartFolder(smartFolderId);

    if (!smartResult.success) {
      return {
        success: false,
        error: smartResult.error,
        folder: null,
        path: [],
        folders: [],
        files: [],
        stats: { fileCount: 0, totalBytes: 0 },
        galleryMode: false,
        smartFolderMode: false,
        smartFolder: null,
        filesPagination: null,
      };
    }

    if (smartResult.data.space !== space) {
      return {
        success: false,
        error: "Ce dossier intelligent n’appartient pas à cet espace.",
        folder: null,
        path: [],
        folders: [],
        files: [],
        stats: { fileCount: 0, totalBytes: 0 },
        galleryMode: false,
        smartFolderMode: false,
        smartFolder: null,
        filesPagination: null,
      };
    }

    const smartFolder = smartResult.data;
    const [filesResult, statsResult] = await Promise.all([
      listFilesPaginated({
        space,
        tag: smartFolder.tag,
        imagesOnly: true,
        folderId: null,
        limit: FILES_PAGE_SIZE,
        offset: 0,
      }),
      getTagStats({ space, tag: smartFolder.tag, imagesOnly: true }),
    ]);

    return {
      success: true,
      folder: null,
      path: [
        {
          id: `smart-${smartFolder.id}`,
          name: smartFolder.name,
          smartFolderId: smartFolder.id,
        },
      ],
      folders: [],
      files: filesResult.data || [],
      stats: statsResult.data || { fileCount: 0, totalBytes: 0 },
      galleryMode: true,
      smartFolderMode: true,
      smartFolder,
      favoritesMode: false,
      filesPagination: filesResult.pagination || null,
      error: filesResult.error || statsResult.error || null,
    };
  }

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
        smartFolderMode: false,
        smartFolder: null,
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
        smartFolderMode: false,
        smartFolder: null,
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
          limit: FILES_PAGE_SIZE,
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
      smartFolderMode: false,
      smartFolder: null,
      favoritesMode: false,
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
    smartFolderMode: false,
    smartFolder: null,
    favoritesMode: false,
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
    revalidatePath("/recent");
    revalidatePath("/orphans");
    revalidatePath("/untagged");
    revalidatePath("/duplicates");
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
