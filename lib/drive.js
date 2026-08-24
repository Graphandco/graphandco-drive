export const SPACES = {
  sixmyk: {
    key: "sixmyk",
    rootFolderId: 1,
    label: "Six-MyK",
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

export function fileHref(spaceKey, folderId, fileId) {
  const folderUrl = folderHref(spaceKey, folderId);
  const join = folderUrl.includes("?") ? "&" : "?";
  return `${folderUrl}${join}file=${fileId}`;
}

