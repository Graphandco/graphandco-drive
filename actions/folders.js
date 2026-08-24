"use server";

import { revalidatePath } from "next/cache";

import { getSpaceConfig } from "@/lib/drive";
import { query } from "@/lib/db";

function revalidateDrive(spaceKey = "sixmyk") {
  const space = getSpaceConfig(spaceKey);
  revalidatePath(space.basePath);
  revalidatePath("/trash");
  revalidatePath("/", "layout");
}

export async function getFolder(folderId) {
  try {
    const rows = await query(
      `SELECT id, parent_id, space, name, is_shared, deleted_at, created_at, updated_at
       FROM folders
       WHERE id = ?
       LIMIT 1`,
      [folderId]
    );

    if (!rows.length) {
      return { success: false, error: "Dossier introuvable." };
    }

    return { success: true, data: rows[0] };
  } catch (error) {
    console.error("getFolder:", error);
    return {
      success: false,
      error: error?.message || "Impossible de charger le dossier.",
    };
  }
}

export async function getFolderPath(folderId) {
  try {
    const path = [];
    let currentId = folderId;

    while (currentId) {
      const rows = await query(
        `SELECT id, parent_id, space, name
         FROM folders
         WHERE id = ?
         LIMIT 1`,
        [currentId]
      );

      if (!rows.length) break;

      path.unshift(rows[0]);
      currentId = rows[0].parent_id;
    }

    return { success: true, data: path };
  } catch (error) {
    console.error("getFolderPath:", error);
    return {
      success: false,
      error: error?.message || "Impossible de construire le chemin.",
      data: [],
    };
  }
}

export async function listFolders({
  parentId = null,
  space = "sixmyk",
  view = "browse",
} = {}) {
  try {
    if (view === "trash") {
      const rows = await query(
        `SELECT id, parent_id, space, name, is_shared, deleted_at, created_at, updated_at
         FROM folders
         WHERE deleted_at IS NOT NULL
         ORDER BY deleted_at DESC`
      );
      return { success: true, data: rows };
    }


    const rows =
      parentId == null
        ? await query(
            `SELECT id, parent_id, space, name, is_shared, deleted_at, created_at, updated_at
             FROM folders
             WHERE parent_id IS NULL
               AND space = ?
               AND deleted_at IS NULL
             ORDER BY name ASC`,
            [space]
          )
        : await query(
            `SELECT id, parent_id, space, name, is_shared, deleted_at, created_at, updated_at
             FROM folders
             WHERE parent_id = ?
               AND deleted_at IS NULL
             ORDER BY name ASC`,
            [parentId]
          );

    return { success: true, data: rows };
  } catch (error) {
    console.error("listFolders:", error);
    return {
      success: false,
      error: error?.message || "Impossible de lister les dossiers.",
      data: [],
    };
  }
}

export async function createFolder({ name, parentId, space = "sixmyk" }) {
  const folderName = typeof name === "string" ? name.trim() : "";

  if (!folderName) {
    return { success: false, error: "Le nom du dossier est requis." };
  }

  if (!parentId) {
    return { success: false, error: "Le dossier parent est requis." };
  }

  try {
    const parent = await getFolder(parentId);
    if (!parent.success || parent.data.deleted_at) {
      return { success: false, error: "Dossier parent invalide." };
    }

    const result = await query(
      `INSERT INTO folders (parent_id, space, name)
       VALUES (?, ?, ?)`,
      [parentId, parent.data.space || space, folderName]
    );

    revalidateDrive(parent.data.space || space);

    return {
      success: true,
      data: {
        id: result.insertId,
        parent_id: parentId,
        space: parent.data.space || space,
        name: folderName,
      },
    };
  } catch (error) {
    console.error("createFolder:", error);
    return {
      success: false,
      error: error?.message || "Impossible de créer le dossier.",
    };
  }
}

export async function renameFolder({ id, name }) {
  const folderName = typeof name === "string" ? name.trim() : "";

  if (!id || !folderName) {
    return { success: false, error: "Identifiant et nom requis." };
  }

  try {
    const existing = await getFolder(id);
    if (!existing.success) return existing;

    const space = getSpaceConfig(existing.data.space);
    if (Number(id) === space.rootFolderId) {
      return { success: false, error: "Impossible de renommer la racine." };
    }

    if (existing.data.name === folderName) {
      return { success: true, data: { id, name: folderName } };
    }

    const pathResult = await getFolderPath(id);
    const oldPath = pathResult.data || [];
    const { buildFolderPrefix, renamePrefix, replaceKeyPrefix } = await import(
      "@/lib/storage"
    );

    const oldPrefix = buildFolderPrefix(oldPath, space.rootFolderId);
    const newPath = oldPath.map((folder) =>
      Number(folder.id) === Number(id)
        ? { ...folder, name: folderName }
        : folder
    );
    const newPrefix = buildFolderPrefix(newPath, space.rootFolderId);

    if (oldPrefix && newPrefix && oldPrefix !== newPrefix) {
      const location =
        space.storageLocation || existing.data.space || "sixmyk";

      await renamePrefix({
        location,
        fromPrefix: oldPrefix,
        toPrefix: newPrefix,
      });

      const treeIds = await getFolderTreeIds(id);
      if (treeIds.length) {
        const placeholders = treeIds.map(() => "?").join(", ");
        const files = await query(
          `SELECT id, storage_key, thumbnail_key
           FROM files
           WHERE folder_id IN (${placeholders})`,
          treeIds
        );

        for (const file of files) {
          const nextStorageKey = replaceKeyPrefix(
            file.storage_key,
            oldPrefix,
            newPrefix
          );
          const nextThumbnailKey = replaceKeyPrefix(
            file.thumbnail_key,
            oldPrefix,
            newPrefix
          );

          if (
            nextStorageKey !== file.storage_key ||
            nextThumbnailKey !== file.thumbnail_key
          ) {
            await query(
              `UPDATE files
               SET storage_key = ?, thumbnail_key = ?
               WHERE id = ?`,
              [nextStorageKey, nextThumbnailKey, file.id]
            );
          }
        }
      }
    }

    await query(`UPDATE folders SET name = ? WHERE id = ?`, [
      folderName,
      id,
    ]);
    revalidateDrive(existing.data.space);

    return { success: true, data: { id, name: folderName } };
  } catch (error) {
    console.error("renameFolder:", error);
    return {
      success: false,
      error: error?.message || "Impossible de renommer le dossier.",
    };
  }
}

export async function trashFolder(id) {
  try {
    const existing = await getFolder(id);
    if (!existing.success) return existing;

    const space = getSpaceConfig(existing.data.space);
    if (Number(id) === space.rootFolderId) {
      return { success: false, error: "Impossible de supprimer la racine." };
    }

    const treeIds = await getFolderTreeIds(id);
    if (!treeIds.length) {
      return { success: false, error: "Dossier introuvable." };
    }

    const placeholders = treeIds.map(() => "?").join(", ");

    await query(
      `UPDATE files
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE folder_id IN (${placeholders})
         AND deleted_at IS NULL`,
      treeIds
    );

    await query(
      `UPDATE folders
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders})
         AND deleted_at IS NULL`,
      treeIds
    );

    revalidateDrive(existing.data.space);

    return { success: true };
  } catch (error) {
    console.error("trashFolder:", error);
    return {
      success: false,
      error: error?.message || "Impossible de mettre le dossier à la corbeille.",
    };
  }
}

export async function restoreFolder(id) {
  try {
    const existing = await getFolder(id);
    if (!existing.success) return existing;

    const treeIds = await getFolderTreeIds(id);
    if (!treeIds.length) {
      return { success: false, error: "Dossier introuvable." };
    }

    const placeholders = treeIds.map(() => "?").join(", ");

    await query(
      `UPDATE folders SET deleted_at = NULL WHERE id IN (${placeholders})`,
      treeIds
    );
    await query(
      `UPDATE files SET deleted_at = NULL WHERE folder_id IN (${placeholders})`,
      treeIds
    );

    revalidateDrive(existing.data.space);

    return { success: true };
  } catch (error) {
    console.error("restoreFolder:", error);
    return {
      success: false,
      error: error?.message || "Impossible de restaurer le dossier.",
    };
  }
}

export async function deleteFolderPermanent(id) {
  try {
    const existing = await getFolder(id);
    if (!existing.success) return existing;

    const space = getSpaceConfig(existing.data.space);
    if (Number(id) === space.rootFolderId) {
      return { success: false, error: "Impossible de supprimer la racine." };
    }

    const treeIds = await getFolderTreeIds(id);
    if (!treeIds.length) {
      return { success: false, error: "Dossier introuvable." };
    }

    const placeholders = treeIds.map(() => "?").join(", ");
    const files = await query(
      `SELECT id, storage_key, thumbnail_key, storage_location
       FROM files
       WHERE folder_id IN (${placeholders})`,
      treeIds
    );

    const { buildFolderPrefix, deleteObject, deletePrefix } = await import(
      "@/lib/storage"
    );

    for (const file of files) {
      const location = file.storage_location || "sixmyk";
      if (file.storage_key) {
        await deleteObject({
          location,
          key: file.storage_key,
        }).catch((error) => {
          console.error("deleteFolderPermanent/storage:", error);
        });
      }
      if (file.thumbnail_key) {
        await deleteObject({
          location,
          key: file.thumbnail_key,
        }).catch((error) => {
          console.error("deleteFolderPermanent/thumbnail:", error);
        });
      }
    }

    // Purge du préfixe S3 (fichiers restants + marqueur dossier vide SeaweedFS)
    const pathResult = await getFolderPath(id);
    const prefix = buildFolderPrefix(
      pathResult.data || [],
      space.rootFolderId
    );
    if (prefix) {
      await deletePrefix({
        location: space.storageLocation || existing.data.space || "sixmyk",
        prefix,
      }).catch((error) => {
        console.error("deleteFolderPermanent/prefix:", error);
      });
    }

    await query(
      `DELETE FROM files WHERE folder_id IN (${placeholders})`,
      treeIds
    );
    // CASCADE sur parent_id : supprimer la racine du sous-arbre suffit
    await query(`DELETE FROM folders WHERE id = ?`, [id]);

    revalidateDrive(existing.data.space);

    return { success: true };
  } catch (error) {
    console.error("deleteFolderPermanent:", error);
    return {
      success: false,
      error: error?.message || "Impossible de supprimer définitivement le dossier.",
    };
  }
}

async function getFolderTreeIds(folderId) {
  const rows = await query(
    `WITH RECURSIVE folder_tree AS (
       SELECT id
       FROM folders
       WHERE id = ?
       UNION ALL
       SELECT f.id
       FROM folders f
       INNER JOIN folder_tree ft ON f.parent_id = ft.id
     )
     SELECT id FROM folder_tree`,
    [folderId]
  );

  return rows.map((row) => row.id);
}


function buildFolderTree(folders, parentId) {
  return folders
    .filter((folder) => Number(folder.parent_id) === Number(parentId))
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      space: folder.space,
      parent_id: folder.parent_id,
      children: buildFolderTree(folders, folder.id),
    }));
}

/** Arbre des dossiers (hors racines) pour la sidebar */
export async function getSidebarFolderTrees() {
  try {
    const rows = await query(
      `SELECT id, parent_id, space, name
       FROM folders
       WHERE deleted_at IS NULL
       ORDER BY name ASC`
    );

    const bySpace = { sixmyk: [], public: [], regis: [] };

    for (const row of rows) {
      if (!bySpace[row.space]) continue;
      bySpace[row.space].push(row);
    }

    return {
      success: true,
      data: {
        sixmyk: buildFolderTree(
          bySpace.sixmyk,
          getSpaceConfig("sixmyk").rootFolderId
        ),
        public: buildFolderTree(
          bySpace.public,
          getSpaceConfig("public").rootFolderId
        ),
        regis: buildFolderTree(
          bySpace.regis,
          getSpaceConfig("regis").rootFolderId
        ),
      },
    };
  } catch (error) {
    console.error("getSidebarFolderTrees:", error);
    return {
      success: false,
      error: error?.message || "Impossible de charger les dossiers sidebar.",
      data: { sixmyk: [], public: [], regis: [] },
    };
  }
}
