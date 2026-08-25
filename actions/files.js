"use server";

import { revalidatePath } from "next/cache";

import { getFolder } from "@/actions/folders";
import { query } from "@/lib/db";
import { linkFileToFolder } from "@/lib/file-folders";
import { getSpaceConfig, FILES_PAGE_SIZE } from "@/lib/drive";
import { resolveRecentDays } from "@/lib/recent-settings";
import { tagsAndFilterClause } from "@/lib/tags";

function revalidateDrive(spaceKey = "sixmyk") {
  const space = getSpaceConfig(spaceKey);
  revalidatePath(space.basePath);
  revalidatePath("/trash");
  revalidatePath("/recent");
  revalidatePath("/orphans");
  revalidatePath("/untagged");
  revalidatePath("/duplicates");
  revalidatePath("/tags");
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

const FILE_COLUMNS = `f.id, f.space, f.name, f.mime_type, f.size_bytes, f.storage_location, f.storage_key, f.thumbnail_key, f.tags, f.captured_at, f.width_px, f.height_px, f.deleted_at, f.created_at, f.updated_at`;

const FILE_ORDER_BROWSE = `ORDER BY f.captured_at DESC, f.created_at DESC, f.name ASC`;

function normalizeLimit(limit) {
  const value = Number(limit);
  if (!Number.isFinite(value) || value < 1) return FILES_PAGE_SIZE;
  return Math.min(Math.round(value), 200);
}

function normalizeOffset(offset) {
  const value = Number(offset);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

/** LIMIT/OFFSET en littéraux (mysql2 ne supporte pas toujours les ? ici). */
function paginationClause(limit, offset) {
  const pageLimit = normalizeLimit(limit);
  const pageOffset = normalizeOffset(offset);
  return {
    pageLimit,
    pageOffset,
    sql: `LIMIT ${pageLimit} OFFSET ${pageOffset}`,
  };
}

export async function getFile(fileId) {
  try {
    const rows = await query(
      `SELECT id, folder_id, space, name, mime_type, size_bytes, storage_location, storage_key, thumbnail_key, tags, captured_at, width_px, height_px, deleted_at, created_at, updated_at
       FROM files
       WHERE id = ?
       LIMIT 1`,
      [fileId]
    );

    if (!rows.length) {
      return { success: false, error: "Fichier introuvable." };
    }

    return { success: true, data: rows[0] };
  } catch (error) {
    console.error("getFile:", error);
    return {
      success: false,
      error: error?.message || "Impossible de charger le fichier.",
    };
  }
}

/** Compte les fichiers d’un espace (galerie accueil). */
export async function countFilesInSpace(space = "sixmyk") {
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM files f
     WHERE f.space = ?
       AND f.deleted_at IS NULL`,
    [space]
  );
  return Number(rows[0]?.total || 0);
}

/** Filtre tag(s) — un tag ou CSV (AND si plusieurs). */
function tagFilterClause(tag) {
  return tagsAndFilterClause(tag);
}

const DUPLICATES_JOIN = `INNER JOIN (
  SELECT space, name, size_bytes
  FROM files
  WHERE deleted_at IS NULL
  GROUP BY space, name, size_bytes
  HAVING COUNT(*) > 1
) dup ON dup.space = f.space AND dup.name = f.name AND dup.size_bytes = f.size_bytes`;

/** Recherche libre (nom ou tags, insensible à la casse). */
function searchFilterClause(search) {
  const q = String(search || "").trim().toLowerCase();
  if (!q) return { sql: "", params: [] };

  const like = `%${q}%`;
  return {
    sql: `AND (
      LOWER(f.name) LIKE ?
      OR LOWER(COALESCE(f.tags, '')) LIKE ?
      OR CONCAT(',', REPLACE(REPLACE(LOWER(TRIM(f.tags)), ', ', ','), ';', ','), ',') LIKE ?
    )`,
    params: [like, like, `%,${q},%`],
  };
}

async function countBrowseFiles({
  space,
  folderId = null,
  tag = null,
  imagesOnly = false,
  search = null,
}) {
  const tagFilter = tagFilterClause(tag);
  const searchFilter = searchFilterClause(search);
  const imageFilter = imagesOnly ? "AND f.mime_type LIKE 'image/%'" : "";

  if (folderId != null) {
    const rows = await query(
      `SELECT COUNT(DISTINCT f.id) AS total, COALESCE(SUM(f.size_bytes), 0) AS bytes
       FROM files f
       INNER JOIN file_folders ff ON ff.file_id = f.id
       WHERE ff.folder_id = ?
         AND f.deleted_at IS NULL
         ${imageFilter}
         ${tagFilter.sql}
         ${searchFilter.sql}`,
      [Number(folderId), ...tagFilter.params, ...searchFilter.params]
    );
    return {
      fileCount: Number(rows[0]?.total || 0),
      totalBytes: Number(rows[0]?.bytes || 0),
    };
  }

  const rows = await query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(f.size_bytes), 0) AS bytes
     FROM files f
     WHERE f.space = ?
       AND f.deleted_at IS NULL
       ${imageFilter}
       ${tagFilter.sql}
       ${searchFilter.sql}`,
    [space, ...tagFilter.params, ...searchFilter.params]
  );
  return {
    fileCount: Number(rows[0]?.total || 0),
    totalBytes: Number(rows[0]?.bytes || 0),
  };
}

async function countFilesByTag({ space, tag, imagesOnly = false }) {
  const tagFilter = tagFilterClause(tag);
  const rows = await query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(f.size_bytes), 0) AS bytes
     FROM files f
     WHERE f.space = ?
       AND f.deleted_at IS NULL
       ${imagesOnly ? "AND f.mime_type LIKE 'image/%'" : ""}
       ${tagFilter.sql}`,
    [space, ...tagFilter.params]
  );
  return {
    fileCount: Number(rows[0]?.total || 0),
    totalBytes: Number(rows[0]?.bytes || 0),
  };
}

export async function getTagStats({ space, tag, imagesOnly = false }) {
  try {
    const data = await countFilesByTag({ space, tag, imagesOnly });
    return { success: true, data };
  } catch (error) {
    console.error("getTagStats:", error);
    return {
      success: false,
      error: error?.message || "Impossible de calculer les statistiques.",
      data: { fileCount: 0, totalBytes: 0 },
    };
  }
}

/** Compte les fichiers liés à un dossier. */
export async function countFilesInFolder(folderId) {
  const rows = await query(
    `SELECT COUNT(DISTINCT f.id) AS total
     FROM files f
     INNER JOIN file_folders ff ON ff.file_id = f.id
     WHERE ff.folder_id = ?
       AND f.deleted_at IS NULL`,
    [Number(folderId)]
  );
  return Number(rows[0]?.total || 0);
}

/**
 * Liste paginée : folderId = null → tout l’espace ; sinon fichiers du dossier.
 */
export async function listFilesPaginated({
  space = "sixmyk",
  folderId = null,
  tag = null,
  imagesOnly = false,
  search = null,
  view = "browse",
  recentDays = null,
  limit = FILES_PAGE_SIZE,
  offset = 0,
} = {}) {
  try {
    const { pageLimit, pageOffset, sql: pageSql } = paginationClause(
      limit,
      offset
    );
    const normalizedTag = String(tag || "").trim();
    const normalizedSearch = String(search || "").trim();
    const tagFilter = tagFilterClause(normalizedTag);
    const searchFilter = searchFilterClause(normalizedSearch);
    const imageFilter = imagesOnly ? "AND f.mime_type LIKE 'image/%'" : "";
    const useSpaceBrowse = normalizedTag || folderId == null;

    if (view === "recent") {
      const days = resolveRecentDays(recentDays);
      const searchFilter = searchFilterClause(normalizedSearch);
      const rows = await query(
        `SELECT ${FILE_COLUMNS}
         FROM files f
         WHERE f.deleted_at IS NULL
           AND f.updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
           ${searchFilter.sql}
         ORDER BY f.updated_at DESC, f.created_at DESC
         ${pageSql}`,
        [days, ...searchFilter.params]
      );
      const countRows = await query(
        `SELECT COUNT(*) AS total, COALESCE(SUM(size_bytes), 0) AS bytes
         FROM files f
         WHERE f.deleted_at IS NULL
           AND f.updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
           ${searchFilter.sql}`,
        [days, ...searchFilter.params]
      );
      const total = Number(countRows[0]?.total || 0);
      return {
        success: true,
        data: rows,
        pagination: {
          total,
          limit: pageLimit,
          offset: pageOffset,
          hasMore: pageOffset + rows.length < total,
        },
        stats: {
          fileCount: total,
          totalBytes: Number(countRows[0]?.bytes || 0),
        },
      };
    }

    if (view === "orphans") {
      const searchFilter = searchFilterClause(normalizedSearch);
      const rows = await query(
        `SELECT ${FILE_COLUMNS}
         FROM files f
         WHERE f.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM file_folders ff WHERE ff.file_id = f.id
           )
           ${searchFilter.sql}
         ORDER BY f.updated_at DESC, f.name ASC
         ${pageSql}`,
        [...searchFilter.params]
      );
      const countRows = await query(
        `SELECT COUNT(*) AS total, COALESCE(SUM(f.size_bytes), 0) AS bytes
         FROM files f
         WHERE f.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM file_folders ff WHERE ff.file_id = f.id
           )
           ${searchFilter.sql}`,
        [...searchFilter.params]
      );
      const total = Number(countRows[0]?.total || 0);
      return {
        success: true,
        data: rows,
        pagination: {
          total,
          limit: pageLimit,
          offset: pageOffset,
          hasMore: pageOffset + rows.length < total,
        },
        stats: {
          fileCount: total,
          totalBytes: Number(countRows[0]?.bytes || 0),
        },
      };
    }

    if (view === "untagged") {
      const searchFilter = searchFilterClause(normalizedSearch);
      const rows = await query(
        `SELECT ${FILE_COLUMNS}
         FROM files f
         WHERE f.deleted_at IS NULL
           AND (f.tags IS NULL OR TRIM(f.tags) = '')
           ${searchFilter.sql}
         ORDER BY f.updated_at DESC, f.name ASC
         ${pageSql}`,
        [...searchFilter.params]
      );
      const countRows = await query(
        `SELECT COUNT(*) AS total, COALESCE(SUM(f.size_bytes), 0) AS bytes
         FROM files f
         WHERE f.deleted_at IS NULL
           AND (f.tags IS NULL OR TRIM(f.tags) = '')
           ${searchFilter.sql}`,
        [...searchFilter.params]
      );
      const total = Number(countRows[0]?.total || 0);
      return {
        success: true,
        data: rows,
        pagination: {
          total,
          limit: pageLimit,
          offset: pageOffset,
          hasMore: pageOffset + rows.length < total,
        },
        stats: {
          fileCount: total,
          totalBytes: Number(countRows[0]?.bytes || 0),
        },
      };
    }

    if (view === "duplicates") {
      const searchFilter = searchFilterClause(normalizedSearch);
      const rows = await query(
        `SELECT ${FILE_COLUMNS}
         FROM files f
         ${DUPLICATES_JOIN}
         WHERE f.deleted_at IS NULL
           ${searchFilter.sql}
         ORDER BY f.space ASC, f.name ASC, f.size_bytes ASC, f.updated_at DESC
         ${pageSql}`,
        [...searchFilter.params]
      );
      const countRows = await query(
        `SELECT COUNT(*) AS total, COALESCE(SUM(f.size_bytes), 0) AS bytes
         FROM files f
         ${DUPLICATES_JOIN}
         WHERE f.deleted_at IS NULL
           ${searchFilter.sql}`,
        [...searchFilter.params]
      );
      const total = Number(countRows[0]?.total || 0);
      return {
        success: true,
        data: rows,
        pagination: {
          total,
          limit: pageLimit,
          offset: pageOffset,
          hasMore: pageOffset + rows.length < total,
        },
        stats: {
          fileCount: total,
          totalBytes: Number(countRows[0]?.bytes || 0),
        },
      };
    }

    if (view === "trash") {
      const rows = await query(
        `SELECT id, folder_id, space, name, mime_type, size_bytes, storage_location, storage_key, thumbnail_key, tags, captured_at, width_px, height_px, deleted_at, created_at, updated_at
         FROM files
         WHERE deleted_at IS NOT NULL
         ORDER BY deleted_at DESC
         ${pageSql}`
      );
      const countRows = await query(
        `SELECT COUNT(*) AS total FROM files WHERE deleted_at IS NOT NULL`
      );
      const total = Number(countRows[0]?.total || 0);
      return {
        success: true,
        data: rows,
        pagination: {
          total,
          limit: pageLimit,
          offset: pageOffset,
          hasMore: pageOffset + rows.length < total,
        },
      };
    }

    if (useSpaceBrowse) {
      const rows = await query(
        `SELECT ${FILE_COLUMNS}
         FROM files f
         WHERE f.space = ?
           AND f.deleted_at IS NULL
           ${imageFilter}
           ${tagFilter.sql}
           ${searchFilter.sql}
         ${FILE_ORDER_BROWSE}
         ${pageSql}`,
        [space, ...tagFilter.params, ...searchFilter.params]
      );
      const stats = await countBrowseFiles({
        space,
        folderId: null,
        tag: normalizedTag || null,
        imagesOnly,
        search: normalizedSearch || null,
      });
      const total = stats.fileCount;
      return {
        success: true,
        data: rows,
        pagination: {
          total,
          limit: pageLimit,
          offset: pageOffset,
          hasMore: pageOffset + rows.length < total,
        },
      };
    }

    const rows = await query(
      `SELECT ${FILE_COLUMNS}
       FROM files f
       INNER JOIN file_folders ff ON ff.file_id = f.id
       WHERE ff.folder_id = ?
         AND f.deleted_at IS NULL
         ${imageFilter}
         ${searchFilter.sql}
       ${FILE_ORDER_BROWSE}
       ${pageSql}`,
      [Number(folderId), ...searchFilter.params]
    );
    const stats = await countBrowseFiles({
      space,
      folderId,
      imagesOnly,
      search: normalizedSearch || null,
    });
    const total = stats.fileCount;
    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: pageLimit,
        offset: pageOffset,
        hasMore: pageOffset + rows.length < total,
      },
    };
  } catch (error) {
    console.error("listFilesPaginated:", error);
    return {
      success: false,
      error: error?.message || "Impossible de lister les fichiers.",
      data: [],
      pagination: { total: 0, limit: FILES_PAGE_SIZE, offset: 0, hasMore: false },
    };
  }
}

export async function listFiles({
  folderId = null,
  space = "sixmyk",
  view = "browse",
} = {}) {
  const result = await listFilesPaginated({
    space,
    folderId,
    view,
    limit: view === "trash" ? 10000 : 10000,
    offset: 0,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
    pagination: result.pagination,
  };
}

export async function createFileRecord({
  name,
  folderId,
  space = "sixmyk",
  mimeType = null,
  sizeBytes = 0,
  storageKey = null,
  thumbnailKey = null,
  storageLocation = "sixmyk",
  capturedAt = null,
  widthPx = null,
  heightPx = null,
}) {
  const fileName = typeof name === "string" ? name.trim() : "";

  if (!fileName) {
    return { success: false, error: "Le nom du fichier est requis." };
  }

  if (!folderId) {
    return { success: false, error: "Le dossier parent est requis." };
  }

  try {
    const parent = await getFolder(folderId);
    if (!parent.success || parent.data.deleted_at) {
      return { success: false, error: "Dossier parent invalide." };
    }

    const resolvedSpace = parent.data.space || space;
    const resolvedLocation =
      storageLocation || getSpaceConfig(resolvedSpace).storageLocation;

    let capturedValue = null;
    if (capturedAt) {
      const date =
        capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
      if (!Number.isNaN(date.getTime())) {
        capturedValue = date;
      }
    }

    const result = await query(
      `INSERT INTO files (
         space, name, mime_type, size_bytes,
         storage_location, storage_key, thumbnail_key, captured_at,
         width_px, height_px
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resolvedSpace,
        fileName,
        mimeType,
        Number(sizeBytes) || 0,
        resolvedLocation,
        storageKey,
        thumbnailKey,
        capturedValue,
        widthPx != null && widthPx > 0 ? Math.round(widthPx) : null,
        heightPx != null && heightPx > 0 ? Math.round(heightPx) : null,
      ]
    );

    const fileId = result.insertId;
    await linkFileToFolder(fileId, folderId);

    revalidateDrive(resolvedSpace);

    return {
      success: true,
      data: {
        id: fileId,
        name: fileName,
        space: resolvedSpace,
        storage_location: resolvedLocation,
        storage_key: storageKey,
        thumbnail_key: thumbnailKey,
        captured_at: capturedValue,
        width_px:
          widthPx != null && widthPx > 0 ? Math.round(widthPx) : null,
        height_px:
          heightPx != null && heightPx > 0 ? Math.round(heightPx) : null,
      },
    };
  } catch (error) {
    console.error("createFileRecord:", error);
    return {
      success: false,
      error: error?.message || "Impossible d’enregistrer le fichier.",
    };
  }
}

export async function renameFile({ id, name }) {
  return updateFileMetadata({ id, name });
}

export async function updateFileMetadata({ id, name, tags, captured_at }) {
  if (!id) {
    return { success: false, error: "Identifiant requis." };
  }

  try {
    const existing = await getFile(id);
    if (!existing.success) return existing;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      const fileName = typeof name === "string" ? name.trim() : "";
      if (!fileName) {
        return { success: false, error: "Le nom du fichier est requis." };
      }
      updates.push("name = ?");
      params.push(fileName);
    }

    if (tags !== undefined) {
      const normalized =
        typeof tags === "string"
          ? tags.trim().replace(/\s*,\s*/g, ", ") || null
          : null;
      updates.push("tags = ?");
      params.push(normalized);
    }

    if (captured_at !== undefined) {
      if (captured_at === null || captured_at === "") {
        updates.push("captured_at = NULL");
      } else {
        const date = new Date(captured_at);
        if (Number.isNaN(date.getTime())) {
          return { success: false, error: "Date invalide." };
        }
        updates.push("captured_at = ?");
        params.push(date);
      }
    }

    if (!updates.length) {
      return { success: true, data: existing.data };
    }

    params.push(id);
    await query(
      `UPDATE files SET ${updates.join(", ")} WHERE id = ?`,
      params
    );
    revalidateDrive(existing.data.space);

    return { success: true, data: { id } };
  } catch (error) {
    console.error("updateFileMetadata:", error);
    return {
      success: false,
      error: error?.message || "Impossible de mettre à jour le fichier.",
    };
  }
}

export async function trashFile(id) {
  try {
    const existing = await getFile(id);
    if (!existing.success) return existing;

    await query(
      `UPDATE files SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    revalidateDrive(existing.data.space);

    return { success: true };
  } catch (error) {
    console.error("trashFile:", error);
    return {
      success: false,
      error: error?.message || "Impossible de mettre le fichier à la corbeille.",
    };
  }
}

export async function restoreFile(id) {
  try {
    const existing = await getFile(id);
    if (!existing.success) return existing;

    await query(`UPDATE files SET deleted_at = NULL WHERE id = ?`, [id]);
    revalidateDrive(existing.data.space);

    return { success: true };
  } catch (error) {
    console.error("restoreFile:", error);
    return {
      success: false,
      error: error?.message || "Impossible de restaurer le fichier.",
    };
  }
}

export async function deleteFilePermanent(id) {
  try {
    const existing = await getFile(id);
    if (!existing.success) return existing;

    const location = existing.data.storage_location || "sixmyk";
    const { deleteObject } = await import("@/lib/storage");

    if (existing.data.storage_key) {
      await deleteObject({
        location,
        key: existing.data.storage_key,
      }).catch((error) => {
        console.error("deleteFilePermanent/storage:", error);
      });
    }

    if (existing.data.thumbnail_key) {
      await deleteObject({
        location,
        key: existing.data.thumbnail_key,
      }).catch((error) => {
        console.error("deleteFilePermanent/thumbnail:", error);
      });
    }

    await query(`DELETE FROM files WHERE id = ?`, [id]);
    revalidateDrive(existing.data.space);

    return { success: true };
  } catch (error) {
    console.error("deleteFilePermanent:", error);
    return {
      success: false,
      error: error?.message || "Impossible de supprimer définitivement le fichier.",
    };
  }
}

export async function getStorageStats() {
  try {
    const rows = await query(
      `SELECT
         COUNT(*) AS file_count,
         COALESCE(SUM(size_bytes), 0) AS total_bytes
       FROM files
       WHERE deleted_at IS NULL`
    );

    return {
      success: true,
      data: {
        fileCount: Number(rows[0]?.file_count || 0),
        totalBytes: Number(rows[0]?.total_bytes || 0),
      },
    };
  } catch (error) {
    console.error("getStorageStats:", error);
    return {
      success: false,
      error: error?.message || "Impossible de calculer le stockage.",
      data: { fileCount: 0, totalBytes: 0 },
    };
  }
}

/** Stats fichiers liés à un dossier ou sous-arbre. */
export async function getFolderStats(folderId) {
  try {
    const id = Number(folderId);
    if (!id) {
      return {
        success: false,
        error: "Dossier invalide.",
        data: { fileCount: 0, totalBytes: 0 },
      };
    }

    const statsRows = await query(
      `WITH RECURSIVE folder_tree AS (
         SELECT id FROM folders WHERE id = ? AND deleted_at IS NULL
         UNION ALL
         SELECT f.id FROM folders f
         INNER JOIN folder_tree ft ON f.parent_id = ft.id
         WHERE f.deleted_at IS NULL
       )
       SELECT
         COUNT(*) AS file_count,
         COALESCE(SUM(sub.size_bytes), 0) AS total_bytes
       FROM (
         SELECT DISTINCT f.id, f.size_bytes
         FROM folder_tree ft
         INNER JOIN file_folders ff ON ff.folder_id = ft.id
         INNER JOIN files f ON f.id = ff.file_id AND f.deleted_at IS NULL
       ) AS sub`,
      [id]
    );

    return {
      success: true,
      data: {
        fileCount: Number(statsRows[0]?.file_count || 0),
        totalBytes: Number(statsRows[0]?.total_bytes || 0),
      },
    };
  } catch (error) {
    console.error("getFolderStats:", error);
    return {
      success: false,
      error: error?.message || "Impossible de calculer les stats du dossier.",
      data: { fileCount: 0, totalBytes: 0 },
    };
  }
}

export async function getSpaceStats(space = "sixmyk") {
  try {
    const rows = await query(
      `SELECT
         COUNT(*) AS file_count,
         COALESCE(SUM(size_bytes), 0) AS total_bytes
       FROM files
       WHERE space = ?
         AND deleted_at IS NULL`,
      [space]
    );

    return {
      success: true,
      data: {
        fileCount: Number(rows[0]?.file_count || 0),
        totalBytes: Number(rows[0]?.total_bytes || 0),
      },
    };
  } catch (error) {
    console.error("getSpaceStats:", error);
    return {
      success: false,
      data: { fileCount: 0, totalBytes: 0 },
    };
  }
}
