/**
 * Filtre dossiers / fichiers par requête (nom + tags pour les fichiers).
 */
export function filterDriveItems(folders = [], files = [], query = "") {
  const q = String(query || "").trim().toLowerCase();
  if (!q) {
    return { folders, files };
  }

  return {
    folders: folders.filter((folder) =>
      String(folder.name || "")
        .toLowerCase()
        .includes(q)
    ),
    files: files.filter((file) => {
      const name = String(file.name || "").toLowerCase();
      const tags = String(file.tags || "").toLowerCase();
      return name.includes(q) || tags.includes(q);
    }),
  };
}
