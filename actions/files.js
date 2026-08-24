"use server";

import { revalidatePath } from "next/cache";

import { getFolder } from "@/actions/folders";
import { query } from "@/lib/db";
import { getSpaceConfig } from "@/lib/drive";

function revalidateDrive(spaceKey = "sixmyk") {
  const space = getSpaceConfig(spaceKey);
  revalidatePath(space.basePath);
  revalidatePath("/trash");
  revalidatePath("/settings/storage");
  revalidatePath("/", "layout");
}

const FILE_COLUMNS = `id, folder_id, space, name, mime_type, size_bytes, storage_location, storage_key, thumbnail_key, tags, captured_at, is_shared, deleted_at, created_at, updated_at`;

export async function getFile(fileId) {
  try {
    const rows = await query(
      `SELECT ${FILE_COLUMNS}
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

export async function listFiles({
  folderId = null,
  space = "sixmyk",
  view = "browse",
} = {}) {
  try {
    if (view === "trash") {
      const rows = await query(
        `SELECT ${FILE_COLUMNS}
         FROM files
         WHERE deleted_at IS NOT NULL
         ORDER BY deleted_at DESC`
      );
      return { success: true, data: rows };
    }


    const rows =
      folderId == null
        ? await query(
            `SELECT ${FILE_COLUMNS}
             FROM files
             WHERE folder_id IS NULL
               AND space = ?
               AND deleted_at IS NULL
             ORDER BY name ASC`,
            [space]
          )
        : await query(
            `SELECT ${FILE_COLUMNS}
             FROM files
             WHERE folder_id = ?
               AND deleted_at IS NULL
             ORDER BY name ASC`,
            [folderId]
          );

    return { success: true, data: rows };
  } catch (error) {
    console.error("listFiles:", error);
    return {
      success: false,
      error: error?.message || "Impossible de lister les fichiers.",
      data: [],
    };
  }
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
         folder_id, space, name, mime_type, size_bytes,
         storage_location, storage_key, thumbnail_key, captured_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        folderId,
        resolvedSpace,
        fileName,
        mimeType,
        Number(sizeBytes) || 0,
        resolvedLocation,
        storageKey,
        thumbnailKey,
        capturedValue,
      ]
    );

    revalidateDrive(resolvedSpace);

    return {
      success: true,
      data: {
        id: result.insertId,
        folder_id: folderId,
        name: fileName,
        space: resolvedSpace,
        storage_location: resolvedLocation,
        storage_key: storageKey,
        thumbnail_key: thumbnailKey,
        captured_at: capturedValue,
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

/** Stats fichiers d’un dossier (sous-arbre inclus) */
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

    const rows = await query(
      `WITH RECURSIVE folder_tree AS (
         SELECT id
         FROM folders
         WHERE id = ?
           AND deleted_at IS NULL
         UNION ALL
         SELECT f.id
         FROM folders f
         INNER JOIN folder_tree ft ON f.parent_id = ft.id
         WHERE f.deleted_at IS NULL
       )
       SELECT
         COUNT(files.id) AS file_count,
         COALESCE(SUM(files.size_bytes), 0) AS total_bytes
       FROM folder_tree
       LEFT JOIN files
         ON files.folder_id = folder_tree.id
        AND files.deleted_at IS NULL`,
      [id]
    );

    return {
      success: true,
      data: {
        fileCount: Number(rows[0]?.file_count || 0),
        totalBytes: Number(rows[0]?.total_bytes || 0),
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

