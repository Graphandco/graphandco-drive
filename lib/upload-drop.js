import { createFolder, uploadFile } from "@/actions";

const SKIP_BASENAMES = new Set([
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
]);

export function shouldSkipUploadPath(relativePath) {
  const parts = String(relativePath || "")
    .split("/")
    .filter(Boolean);
  if (!parts.length) return true;
  if (parts.some((part) => part === "__MACOSX")) return true;
  const base = parts[parts.length - 1];
  return SKIP_BASENAMES.has(base);
}

function readDirectoryEntries(dirReader) {
  return new Promise((resolve, reject) => {
    const entries = [];

    function readBatch() {
      dirReader.readEntries((batch) => {
        if (!batch.length) {
          resolve(entries);
          return;
        }
        entries.push(...batch);
        readBatch();
      }, reject);
    }

    readBatch();
  });
}

function entryToFile(fileEntry) {
  return new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject);
  });
}

async function traverseEntry(entry, pathPrefix = "") {
  if (!entry) return [];

  const relativePath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;

  if (entry.isFile) {
    const file = await entryToFile(entry);
    return [{ relativePath, file, isDirectory: false }];
  }

  if (entry.isDirectory) {
    const results = [{ relativePath, file: null, isDirectory: true }];
    const children = await readDirectoryEntries(entry.createReader());
    for (const child of children) {
      results.push(...(await traverseEntry(child, relativePath)));
    }
    return results;
  }

  return [];
}

/**
 * Lit un DataTransfer (drop) en préservant l’arborescence,
 * y compris les dossiers vides via webkitGetAsEntry.
 *
 * Important : webkitGetAsEntry() doit être appelé de façon synchrone
 * pour TOUS les items pendant l’événement drop — après un await,
 * les entrées suivantes deviennent null.
 */
export async function collectDataTransferEntries(dataTransfer) {
  const items = Array.from(dataTransfer?.items || []);

  // Snapshot synchrone de toutes les entrées / fichiers
  const rootEntries = [];
  for (const item of items) {
    if (item.kind !== "file") continue;
    const entry =
      typeof item.webkitGetAsEntry === "function"
        ? item.webkitGetAsEntry()
        : null;
    if (entry) rootEntries.push(entry);
  }

  const fallbackFiles = Array.from(dataTransfer?.files || []);

  if (rootEntries.length) {
    const results = [];
    for (const entry of rootEntries) {
      results.push(...(await traverseEntry(entry)));
    }
    const filtered = results.filter(
      (entry) => !shouldSkipUploadPath(entry.relativePath)
    );
    if (filtered.length) return filtered;
  }

  return fallbackFiles
    .map((file) => ({
      relativePath: file.webkitRelativePath || file.name,
      file,
      isDirectory: false,
    }))
    .filter((entry) => !shouldSkipUploadPath(entry.relativePath));
}

/**
 * Convertit une FileList (input webkitdirectory / multiple) en entrées.
 */
export function collectFileListEntries(fileList) {
  return Array.from(fileList || [])
    .map((file) => ({
      relativePath: file.webkitRelativePath || file.name,
      file,
      isDirectory: false,
    }))
    .filter((entry) => !shouldSkipUploadPath(entry.relativePath));
}

async function ensureFolderPath(relativeDirPath, rootFolderId, space, cache) {
  if (!relativeDirPath) return rootFolderId;

  const parts = relativeDirPath.split("/").filter(Boolean);
  let parentId = rootFolderId;
  let built = "";

  for (const part of parts) {
    built = built ? `${built}/${part}` : part;
    if (cache.has(built)) {
      parentId = cache.get(built);
      continue;
    }

    const result = await createFolder({
      name: part,
      parentId,
      space,
    });

    if (!result?.success) {
      throw new Error(
        result?.error || `Impossible de créer le dossier « ${part} ».`
      );
    }

    parentId = result.data.id;
    cache.set(built, parentId);
  }

  return parentId;
}

function parentDirOf(relativePath) {
  const idx = relativePath.lastIndexOf("/");
  return idx === -1 ? "" : relativePath.slice(0, idx);
}

/**
 * Crée les dossiers nécessaires puis upload les fichiers.
 * @returns {{ ok: number, fail: number, folders: number, errors: string[] }}
 */
export async function uploadEntryTree(entries, target, { onProgress } = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const files = list.filter((entry) => entry.file && !entry.isDirectory);
  const dirs = list.filter((entry) => entry.isDirectory);

  if (!files.length && !dirs.length) {
    return { ok: 0, fail: 0, folders: 0, errors: [] };
  }

  const cache = new Map();
  const errors = [];
  let ok = 0;
  let foldersCreated = 0;

  // Dossiers vides / parents explicites d’abord (par profondeur)
  const dirPaths = [
    ...new Set([
      ...dirs.map((entry) => entry.relativePath),
      ...files.map((entry) => parentDirOf(entry.relativePath)).filter(Boolean),
    ]),
  ].sort((a, b) => a.split("/").length - b.split("/").length);

  for (const dirPath of dirPaths) {
    try {
      const before = cache.size;
      await ensureFolderPath(dirPath, target.folderId, target.space, cache);
      foldersCreated += Math.max(0, cache.size - before);
    } catch (error) {
      errors.push(`${dirPath}: ${error?.message || "création dossier impossible"}`);
    }
  }

  const totalFiles = files.length;
  for (let i = 0; i < files.length; i += 1) {
    const entry = files[i];
    onProgress?.({ done: i, total: totalFiles, name: entry.file.name });

    try {
      const dirPath = parentDirOf(entry.relativePath);
      const folderId = await ensureFolderPath(
        dirPath,
        target.folderId,
        target.space,
        cache
      );

      const formData = new FormData();
      formData.set("file", entry.file);
      formData.set("folderId", String(folderId));
      formData.set("space", target.space);
      formData.set("location", target.location);

      const result = await uploadFile(formData);
      if (result?.success) {
        ok += 1;
      } else {
        errors.push(
          `${entry.relativePath}: ${result?.error || "échec"}`
        );
      }
    } catch (error) {
      errors.push(
        `${entry.relativePath}: ${error?.message || "échec réseau"}`
      );
    }
  }

  onProgress?.({ done: totalFiles, total: totalFiles });

  return {
    ok,
    fail: errors.length,
    folders: foldersCreated,
    errors,
  };
}
