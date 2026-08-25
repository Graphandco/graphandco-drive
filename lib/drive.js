export const SPACES = {
  sixmyk: {
    key: "sixmyk",
    rootFolderId: 1,
    label: "6-MyK",
    basePath: "/sixmyk",
    storageLocation: "sixmyk",
  },
  public: {
    key: "public",
    rootFolderId: 2,
    label: "Public",
    basePath: "/public",
    storageLocation: "public",
  },
  regis: {
    key: "regis",
    rootFolderId: 3,
    label: "Régis",
    basePath: "/regis",
    storageLocation: "regis",
  },
};

/** Taille de page pour la galerie (scroll infini). */
export const FILES_PAGE_SIZE = 48;

export function getSpaceConfig(spaceKey = "sixmyk") {
  return SPACES[spaceKey] || SPACES.sixmyk;
}

export function folderHref(spaceKey, folderId) {
  const space = getSpaceConfig(spaceKey);
  const rootId = space.rootFolderId;

  if (!folderId || Number(folderId) === rootId) {
    return space.basePath;
  }

  return `${space.basePath}?folder=${folderId}`;
}

/** Accueil Régis : galerie de tout l’espace (pas seulement un dossier). */
export function isGalleryHome({ space, folderId, view = "browse" }) {
  if (view !== "browse" || space !== "regis") return false;
  const rootId = getSpaceConfig(space).rootFolderId;
  return Number(folderId) === Number(rootId);
}

/** Tri par date de prise (EXIF), puis date d’upload, puis nom. */
export function sortFilesByCaptureDate(files, direction = "desc") {
  const factor = direction === "asc" ? 1 : -1;

  return [...files].sort((a, b) => {
    const aCaptured = a.captured_at ? new Date(a.captured_at).getTime() : null;
    const bCaptured = b.captured_at ? new Date(b.captured_at).getTime() : null;

    if (aCaptured != null && bCaptured != null && aCaptured !== bCaptured) {
      return (aCaptured - bCaptured) * factor;
    }
    if (aCaptured != null && bCaptured == null) return -1 * factor;
    if (aCaptured == null && bCaptured != null) return 1 * factor;

    const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (aCreated !== bCreated) {
      return (aCreated - bCreated) * factor;
    }

    return String(a.name || "").localeCompare(String(b.name || ""), "fr");
  });
}

export function smartFolderHref(spaceKey, smartFolderId) {
  return `${getSpaceConfig(spaceKey).basePath}?smart=${smartFolderId}`;
}

export function smartFolderFileHref(spaceKey, smartFolderId, fileId) {
  return `${smartFolderHref(spaceKey, smartFolderId)}&file=${fileId}`;
}

export function fileHref(spaceKey, folderId, fileId) {
  const folderUrl = folderHref(spaceKey, folderId);
  const join = folderUrl.includes("?") ? "&" : "?";
  return `${folderUrl}${join}file=${fileId}`;
}

