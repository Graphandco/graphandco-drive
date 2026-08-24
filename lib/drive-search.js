/** Filtre dossiers / fichiers par requête (nom + tags pour les fichiers). */
import { parseTags } from "@/lib/tags";

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
      if (name.includes(q)) return true;

      return parseTags(file.tags).some((tag) => tag.toLowerCase().includes(q));
    }),
  };
}
