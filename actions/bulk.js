"use server";

import { revalidatePath } from "next/cache";

import { getFile } from "@/actions/files";
import {
  deleteFolderPermanent,
  restoreFolder,
  trashFolder,
} from "@/actions/folders";
import { query } from "@/lib/db";
import { getSpaceConfig } from "@/lib/drive";
import { deleteObject } from "@/lib/storage";
import { formatTags, mergeTags, parseTags } from "@/lib/tags";

function revalidateDrive(spaceKey = "sixmyk") {
  const space = getSpaceConfig(spaceKey);
  revalidatePath(space.basePath);
  revalidatePath("/trash");
  revalidatePath("/settings/storage");
  revalidatePath("/", "layout");
}

function uniqueIds(ids) {
  return [...new Set((ids || []).map(Number).filter((id) => id > 0))];
}

/** Ajoute des tags aux fichiers sélectionnés (fusion, sans doublon). */
export async function bulkAddFileTags({ ids, tags }) {
  const fileIds = uniqueIds(ids);
  const toAdd = parseTags(tags);

  if (!fileIds.length) {
    return { success: false, error: "Aucun fichier sélectionné." };
  }

  if (!toAdd.length) {
    return { success: false, error: "Indiquez au moins un tag." };
  }

  try {
    const spaces = new Set();
    let updated = 0;

    for (const id of fileIds) {
      const existing = await getFile(id);
      if (!existing.success || existing.data.deleted_at) continue;

      const merged = formatTags(mergeTags(existing.data.tags, toAdd));
      await query(`UPDATE files SET tags = ? WHERE id = ?`, [merged, id]);
      spaces.add(existing.data.space);
      updated += 1;
    }

    for (const space of spaces) {
      revalidateDrive(space);
    }

    return { success: true, data: { updated } };
  } catch (error) {
    console.error("bulkAddFileTags:", error);
    return {
      success: false,
      error: error?.message || "Impossible d’ajouter les tags.",
    };
  }
}

/** Envoie fichiers + dossiers à la corbeille. */
export async function bulkTrashItems({ fileIds = [], folderIds = [] }) {
  const files = uniqueIds(fileIds);
  const folders = uniqueIds(folderIds);

  if (!files.length && !folders.length) {
    return { success: false, error: "Aucun élément sélectionné." };
  }

  try {
    const spaces = new Set();
    let count = 0;
    const errors = [];

    if (files.length) {
      const placeholders = files.map(() => "?").join(", ");
      const rows = await query(
        `SELECT id, space FROM files
         WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
        files
      );
      if (rows.length) {
        await query(
          `UPDATE files
           SET deleted_at = CURRENT_TIMESTAMP
           WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
          files
        );
        count += rows.length;
        for (const row of rows) spaces.add(row.space);
      }
    }

    for (const id of folders) {
      const result = await trashFolder(id);
      if (result.success) count += 1;
      else errors.push(result.error || `Dossier ${id}`);
    }

    for (const space of spaces) {
      revalidateDrive(space);
    }

    if (!count && errors.length) {
      return { success: false, error: errors.join(" · ") };
    }

    return {
      success: true,
      data: { count },
      error: errors.length ? errors.join(" · ") : null,
    };
  } catch (error) {
    console.error("bulkTrashItems:", error);
    return {
      success: false,
      error: error?.message || "Impossible de supprimer la sélection.",
    };
  }
}

/** Restaure fichiers + dossiers depuis la corbeille. */
export async function bulkRestoreItems({ fileIds = [], folderIds = [] }) {
  const files = uniqueIds(fileIds);
  const folders = uniqueIds(folderIds);

  if (!files.length && !folders.length) {
    return { success: false, error: "Aucun élément sélectionné." };
  }

  try {
    const spaces = new Set();
    let count = 0;
    const errors = [];

    if (files.length) {
      const placeholders = files.map(() => "?").join(", ");
      const rows = await query(
        `SELECT id, space FROM files
         WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`,
        files
      );
      if (rows.length) {
        await query(
          `UPDATE files SET deleted_at = NULL WHERE id IN (${placeholders})`,
          files
        );
        count += rows.length;
        for (const row of rows) spaces.add(row.space);
      }
    }

    for (const id of folders) {
      const result = await restoreFolder(id);
      if (result.success) count += 1;
      else errors.push(result.error || `Dossier ${id}`);
    }

    for (const space of spaces) {
      revalidateDrive(space);
    }

    return {
      success: true,
      data: { count },
      error: errors.length ? errors.join(" · ") : null,
    };
  } catch (error) {
    console.error("bulkRestoreItems:", error);
    return {
      success: false,
      error: error?.message || "Impossible de restaurer la sélection.",
    };
  }
}

/** Suppression définitive (fichiers + dossiers). */
export async function bulkDeletePermanentItems({
  fileIds = [],
  folderIds = [],
}) {
  const files = uniqueIds(fileIds);
  const folders = uniqueIds(folderIds);

  if (!files.length && !folders.length) {
    return { success: false, error: "Aucun élément sélectionné." };
  }

  try {
    const spaces = new Set();
    let count = 0;
    const errors = [];

    for (const id of files) {
      const existing = await getFile(id);
      if (!existing.success) {
        errors.push(existing.error || `Fichier ${id}`);
        continue;
      }

      const file = existing.data;
      const location = file.storage_location || "sixmyk";

      if (file.storage_key) {
        await deleteObject({ location, key: file.storage_key }).catch(() => {});
      }
      if (file.thumbnail_key) {
        await deleteObject({ location, key: file.thumbnail_key }).catch(
          () => {}
        );
      }

      await query(`DELETE FROM files WHERE id = ?`, [id]);
      spaces.add(file.space);
      count += 1;
    }

    for (const id of folders) {
      const result = await deleteFolderPermanent(id);
      if (result.success) count += 1;
      else errors.push(result.error || `Dossier ${id}`);
    }

    for (const space of spaces) {
      revalidateDrive(space);
    }

    if (!count && errors.length) {
      return { success: false, error: errors.join(" · ") };
    }

    return {
      success: true,
      data: { count },
      error: errors.length ? errors.join(" · ") : null,
    };
  } catch (error) {
    console.error("bulkDeletePermanentItems:", error);
    return {
      success: false,
      error: error?.message || "Impossible de supprimer définitivement.",
    };
  }
}
