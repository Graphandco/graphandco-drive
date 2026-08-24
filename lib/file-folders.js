import { query } from "@/lib/db";

/** Lie un fichier à un dossier (many-to-many, idempotent). */
export async function linkFileToFolder(fileId, folderId) {
  const fid = Number(fileId);
  const did = Number(folderId);
  if (!fid || !did) return { linked: false };

  await query(
    `INSERT IGNORE INTO file_folders (file_id, folder_id) VALUES (?, ?)`,
    [fid, did]
  );

  return { linked: true };
}

/** Retire un fichier d’un dossier sans toucher S3. */
export async function unlinkFileFromFolder(fileId, folderId) {
  await query(
    `DELETE FROM file_folders WHERE file_id = ? AND folder_id = ?`,
    [Number(fileId), Number(folderId)]
  );
}

/** Retire toutes les associations dossier d’un fichier. */
export async function unlinkFileFromAllFolders(fileId) {
  await query(`DELETE FROM file_folders WHERE file_id = ?`, [Number(fileId)]);
}

/** Nombre de dossiers liés à un fichier. */
export async function countFileFolderLinks(fileId) {
  const rows = await query(
    `SELECT COUNT(*) AS count FROM file_folders WHERE file_id = ?`,
    [Number(fileId)]
  );
  return Number(rows[0]?.count || 0);
}

/** Fichier déjà présent dans le dossier ? */
export async function isFileInFolder(fileId, folderId) {
  const rows = await query(
    `SELECT 1 FROM file_folders
     WHERE file_id = ? AND folder_id = ?
     LIMIT 1`,
    [Number(fileId), Number(folderId)]
  );
  return rows.length > 0;
}

/** IDs de fichiers liés à au moins un dossier de la liste. */
export async function getFileIdsInFolders(folderIds) {
  if (!folderIds?.length) return [];
  const placeholders = folderIds.map(() => "?").join(", ");
  const rows = await query(
    `SELECT DISTINCT file_id FROM file_folders WHERE folder_id IN (${placeholders})`,
    folderIds
  );
  return rows.map((row) => row.file_id);
}

/**
 * Fichiers liés uniquement à des dossiers dans folderIds
 * (toutes leurs associations sont dans le sous-ensemble).
 */
export async function getFileIdsExclusiveToFolders(folderIds) {
  if (!folderIds?.length) return [];
  const placeholders = folderIds.map(() => "?").join(", ");
  const rows = await query(
    `SELECT ff.file_id
     FROM file_folders ff
     WHERE ff.file_id IN (
       SELECT file_id FROM file_folders WHERE folder_id IN (${placeholders})
     )
     GROUP BY ff.file_id
     HAVING COUNT(*) = SUM(CASE WHEN ff.folder_id IN (${placeholders}) THEN 1 ELSE 0 END)`,
    [...folderIds, ...folderIds]
  );
  return rows.map((row) => row.file_id);
}
