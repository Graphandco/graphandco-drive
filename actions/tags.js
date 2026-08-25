"use server";

import { revalidatePath } from "next/cache";

import { query } from "@/lib/db";
import { getSpaceConfig, SPACES } from "@/lib/drive";
import {
  formatTags,
  mergeTags,
  parseTags,
  removeTags,
  replaceTag,
} from "@/lib/tags";

function revalidateAll() {
  for (const space of Object.keys(SPACES)) {
    revalidatePath(getSpaceConfig(space).basePath);
  }
  revalidatePath("/tags");
  revalidatePath("/recent");
  revalidatePath("/orphans");
  revalidatePath("/", "layout");
}

function tagKey(space, tag) {
  return `${space}:${String(tag).trim().toLowerCase()}`;
}

/** Tags actifs par espace avec nombre de fichiers et smart folder associé. */
export async function listTagsOverview() {
  try {
    const [fileRows, smartRows] = await Promise.all([
      query(
        `SELECT space, tags
         FROM files
         WHERE deleted_at IS NULL
           AND tags IS NOT NULL
           AND TRIM(tags) != ''`
      ),
      query(`SELECT id, space, tag FROM smart_folders`),
    ]);

    const map = new Map();

    for (const row of fileRows) {
      for (const tag of parseTags(row.tags)) {
        const key = tagKey(row.space, tag);
        if (!map.has(key)) {
          map.set(key, {
            tag,
            space: row.space,
            fileCount: 0,
            smartFolderId: null,
          });
        }
        map.get(key).fileCount += 1;
      }
    }

    for (const smart of smartRows) {
      const key = tagKey(smart.space, smart.tag);
      if (map.has(key)) {
        map.get(key).smartFolderId = smart.id;
      }
    }

    const data = Array.from(map.values()).sort((a, b) => {
      const spaceOrder = Object.keys(SPACES).indexOf(a.space) -
        Object.keys(SPACES).indexOf(b.space);
      if (spaceOrder !== 0) return spaceOrder;
      return a.tag.localeCompare(b.tag, "fr");
    });

    return { success: true, data };
  } catch (error) {
    console.error("listTagsOverview:", error);
    return {
      success: false,
      error: error?.message || "Impossible de lister les tags.",
      data: [],
    };
  }
}

async function filesWithTagInSpace(space, tag) {
  const rows = await query(
    `SELECT id, tags
     FROM files
     WHERE space = ?
       AND deleted_at IS NULL
       AND tags IS NOT NULL
       AND TRIM(tags) != ''`,
    [space]
  );

  const normalized = String(tag).trim().toLowerCase();
  return rows.filter((row) =>
    parseTags(row.tags).some((entry) => entry.toLowerCase() === normalized)
  );
}

export async function renameTag({ space, fromTag, toTag }) {
  const from = String(fromTag || "").trim();
  const to = String(toTag || "").trim();

  if (!from || !to) {
    return { success: false, error: "Tags requis." };
  }

  if (!getSpaceConfig(space)) {
    return { success: false, error: "Espace invalide." };
  }

  if (from.toLowerCase() === to.toLowerCase()) {
    return { success: true, data: { updated: 0 } };
  }

  try {
    const matches = await filesWithTagInSpace(space, from);
    let updated = 0;

    for (const row of matches) {
      const next = formatTags(replaceTag(row.tags, from, to));
      await query(`UPDATE files SET tags = ? WHERE id = ?`, [next, row.id]);
      updated += 1;
    }

    await query(
      `UPDATE smart_folders
       SET tag = ?,
           name = CASE WHEN LOWER(name) = LOWER(?) THEN ? ELSE name END
       WHERE space = ?
         AND LOWER(tag) = LOWER(?)`,
      [to, from, to, space, from]
    );

    revalidateAll();
    return { success: true, data: { updated } };
  } catch (error) {
    console.error("renameTag:", error);
    return {
      success: false,
      error: error?.message || "Impossible de renommer le tag.",
    };
  }
}

export async function mergeTagsInSpace({ space, sourceTags, targetTag }) {
  const sources = parseTags(sourceTags);
  const target = String(targetTag || "").trim();

  if (!sources.length || !target) {
    return { success: false, error: "Tags requis." };
  }

  if (!getSpaceConfig(space)) {
    return { success: false, error: "Espace invalide." };
  }

  const sourceKeys = new Set(sources.map((tag) => tag.toLowerCase()));
  if (sourceKeys.size === 1 && sourceKeys.has(target.toLowerCase())) {
    return { success: true, data: { updated: 0 } };
  }

  try {
    const rows = await query(
      `SELECT id, tags
       FROM files
       WHERE space = ?
         AND deleted_at IS NULL
         AND tags IS NOT NULL
         AND TRIM(tags) != ''`,
      [space]
    );

    let updated = 0;

    for (const row of rows) {
      const current = parseTags(row.tags);
      const hasSource = current.some((tag) => sourceKeys.has(tag.toLowerCase()));
      if (!hasSource) continue;

      const withoutSources = removeTags(row.tags, sources);
      const next = formatTags(mergeTags(withoutSources, [target]));
      await query(`UPDATE files SET tags = ? WHERE id = ?`, [next, row.id]);
      updated += 1;
    }

    const targetSmart = await query(
      `SELECT id FROM smart_folders
       WHERE space = ? AND LOWER(tag) = LOWER(?)
       LIMIT 1`,
      [space, target]
    );

    for (const source of sources) {
      if (source.toLowerCase() === target.toLowerCase()) continue;

      if (targetSmart.length) {
        await query(
          `DELETE FROM smart_folders
           WHERE space = ? AND LOWER(tag) = LOWER(?)`,
          [space, source]
        );
      } else {
        await query(
          `UPDATE smart_folders
           SET tag = ?, name = ?
           WHERE space = ? AND LOWER(tag) = LOWER(?)
           LIMIT 1`,
          [target, target, space, source]
        );
        targetSmart.push({ id: 1 });
      }
    }

    revalidateAll();
    return { success: true, data: { updated } };
  } catch (error) {
    console.error("mergeTagsInSpace:", error);
    return {
      success: false,
      error: error?.message || "Impossible de fusionner les tags.",
    };
  }
}
