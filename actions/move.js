"use server";

import { revalidatePath } from "next/cache";

import { getFile } from "@/actions/files";
import { getFolder } from "@/actions/folders";
import { query } from "@/lib/db";
import {
  isFileInFolder,
  linkFileToFolder,
  unlinkFileFromAllFolders,
  unlinkFileFromFolder,
} from "@/lib/file-folders";
import { getSpaceConfig } from "@/lib/drive";

function revalidateDrive(spaceKey = "sixmyk") {
  const space = getSpaceConfig(spaceKey);
  revalidatePath(space.basePath);
  revalidatePath("/trash");
  revalidatePath("/recent");
  revalidatePath("/orphans");
  revalidatePath("/untagged");
  revalidatePath("/tags");
  revalidatePath("/", "layout");
}

function uniqueIds(ids) {
  return [...new Set((ids || []).map(Number).filter((id) => id > 0))];
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

async function resolveTargetFolder(targetFolderId) {
  const target = await getFolder(targetFolderId);
  if (!target.success || target.data.deleted_at) {
    return { success: false, error: "Dossier cible invalide." };
  }
  return target;
}

/**
 * Déplace des dossiers (parent_id) ou assigne / déplace des fichiers (file_folders).
 * fileMode: "assign" ( défaut ) ajoute un lien ; "move" retire la source puis lie la cible.
 */
export async function moveItems({
  targetFolderId,
  fileIds = [],
  folderIds = [],
  fileMode = "assign",
  sourceFolderId = null,
}) {
  const files = uniqueIds(fileIds);
  const folders = uniqueIds(folderIds);
  const targetId = Number(targetFolderId);

  if (!targetId) {
    return { success: false, error: "Dossier cible requis." };
  }

  if (!files.length && !folders.length) {
    return { success: false, error: "Aucun élément à déplacer." };
  }

  try {
    const target = await resolveTargetFolder(targetId);
    if (!target.success) return target;

    const spaceKey = target.data.space;
    const space = getSpaceConfig(spaceKey);
    const errors = [];
    let movedFiles = 0;
    let movedFolders = 0;

    for (const folderId of folders) {
      if (Number(folderId) === space.rootFolderId) {
        errors.push("Impossible de déplacer la racine.");
        continue;
      }

      if (Number(folderId) === targetId) {
        errors.push("Impossible de déplacer un dossier sur lui-même.");
        continue;
      }

      const existing = await getFolder(folderId);
      if (!existing.success || existing.data.deleted_at) {
        errors.push(`Dossier ${folderId} introuvable.`);
        continue;
      }

      if (existing.data.space !== spaceKey) {
        errors.push(`« ${existing.data.name} » : autre espace.`);
        continue;
      }

      if (Number(existing.data.parent_id) === targetId) {
        continue;
      }

      const treeIds = await getFolderTreeIds(folderId);
      if (treeIds.some((id) => Number(id) === targetId)) {
        errors.push(
          `Impossible de déplacer « ${existing.data.name} » dans un de ses sous-dossiers.`
        );
        continue;
      }

      await query(`UPDATE folders SET parent_id = ? WHERE id = ?`, [
        targetId,
        folderId,
      ]);
      movedFolders += 1;
    }

    const moveFiles = fileMode === "move";
    const sourceId =
      sourceFolderId != null && Number(sourceFolderId) > 0
        ? Number(sourceFolderId)
        : null;

    for (const fileId of files) {
      const existing = await getFile(fileId);
      if (!existing.success || existing.data.deleted_at) {
        errors.push(`Fichier ${fileId} introuvable.`);
        continue;
      }

      const file = existing.data;
      if (file.space !== spaceKey) {
        errors.push(`« ${file.name} » : autre espace.`);
        continue;
      }

      if (moveFiles) {
        if (sourceId) {
          if (sourceId !== targetId) {
            await unlinkFileFromFolder(fileId, sourceId);
          }
        } else {
          await unlinkFileFromAllFolders(fileId);
        }
      }

      if (await isFileInFolder(fileId, targetId)) {
        if (moveFiles) movedFiles += 1;
        continue;
      }

      await linkFileToFolder(fileId, targetId);
      movedFiles += 1;
    }

    revalidateDrive(spaceKey);

    const total = movedFiles + movedFolders;
    if (!total && errors.length) {
      return { success: false, error: errors.join(" · ") };
    }

    return {
      success: true,
      data: { movedFiles, movedFolders, total },
      error: errors.length ? errors.join(" · ") : null,
    };
  } catch (error) {
    console.error("moveItems:", error);
    return {
      success: false,
      error: error?.message || "Impossible de déplacer la sélection.",
    };
  }
}
