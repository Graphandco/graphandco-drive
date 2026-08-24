"use server";

import { revalidatePath } from "next/cache";

import { query } from "@/lib/db";
import { getSpaceConfig } from "@/lib/drive";
import { parseTags } from "@/lib/tags";

function revalidateSpace(spaceKey) {
  const space = getSpaceConfig(spaceKey);
  revalidatePath(space.basePath);
  revalidatePath("/", "layout");
}

export async function listSmartFolders({ space = null } = {}) {
  try {
    const rows = space
      ? await query(
          `SELECT id, space, name, tag, sort_order, created_at
           FROM smart_folders
           WHERE space = ?
           ORDER BY sort_order ASC, name ASC`,
          [space]
        )
      : await query(
          `SELECT id, space, name, tag, sort_order, created_at
           FROM smart_folders
           ORDER BY space ASC, sort_order ASC, name ASC`
        );

    return { success: true, data: rows };
  } catch (error) {
    console.error("listSmartFolders:", error);
    return {
      success: false,
      error: error?.message || "Impossible de charger les dossiers intelligents.",
      data: [],
    };
  }
}

export async function getSmartFolder(id) {
  try {
    const rows = await query(
      `SELECT id, space, name, tag, sort_order, created_at
       FROM smart_folders
       WHERE id = ?
       LIMIT 1`,
      [Number(id)]
    );

    if (!rows.length) {
      return { success: false, error: "Dossier intelligent introuvable." };
    }

    return { success: true, data: rows[0] };
  } catch (error) {
    console.error("getSmartFolder:", error);
    return {
      success: false,
      error: error?.message || "Impossible de charger le dossier intelligent.",
    };
  }
}

/** Tags distincts utilisés sur des fichiers actifs d’un espace. */
export async function listActiveTags({ space = "regis" } = {}) {
  try {
    const rows = await query(
      `SELECT tags
       FROM files
       WHERE space = ?
         AND deleted_at IS NULL
         AND tags IS NOT NULL
         AND TRIM(tags) != ''`,
      [space]
    );

    const seen = new Set();
    const tags = [];

    for (const row of rows) {
      for (const tag of parseTags(row.tags)) {
        const key = tag.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        tags.push(tag);
      }
    }

    tags.sort((a, b) => a.localeCompare(b, "fr"));

    return { success: true, data: tags };
  } catch (error) {
    console.error("listActiveTags:", error);
    return {
      success: false,
      error: error?.message || "Impossible de lister les tags.",
      data: [],
    };
  }
}

export async function createSmartFolder({ space, tag, name = null }) {
  const normalizedTag = String(tag || "").trim();
  if (!normalizedTag) {
    return { success: false, error: "Tag requis." };
  }

  if (!getSpaceConfig(space)) {
    return { success: false, error: "Espace invalide." };
  }

  const displayName = String(name || normalizedTag).trim() || normalizedTag;

  try {
    const existing = await query(
      `SELECT id FROM smart_folders WHERE space = ? AND LOWER(tag) = LOWER(?) LIMIT 1`,
      [space, normalizedTag]
    );

    if (existing.length) {
      return {
        success: false,
        error: "Un dossier intelligent existe déjà pour ce tag.",
        data: existing[0],
      };
    }

    const result = await query(
      `INSERT INTO smart_folders (space, name, tag)
       VALUES (?, ?, ?)`,
      [space, displayName, normalizedTag]
    );

    revalidateSpace(space);

    return {
      success: true,
      data: {
        id: result.insertId,
        space,
        name: displayName,
        tag: normalizedTag,
      },
    };
  } catch (error) {
    console.error("createSmartFolder:", error);
    return {
      success: false,
      error: error?.message || "Impossible de créer le dossier intelligent.",
    };
  }
}

export async function deleteSmartFolder(id) {
  try {
    const existing = await getSmartFolder(id);
    if (!existing.success) return existing;

    await query(`DELETE FROM smart_folders WHERE id = ?`, [Number(id)]);
    revalidateSpace(existing.data.space);

    return { success: true };
  } catch (error) {
    console.error("deleteSmartFolder:", error);
    return {
      success: false,
      error: error?.message || "Impossible de supprimer le dossier intelligent.",
    };
  }
}
