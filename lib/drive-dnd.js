export const DRIVE_DND_MIME = "application/x-graphandco-drive-items";
export const DRIVE_FOLDER_DROP_ATTR = "data-drive-folder-drop";
export const DRIVE_FOLDER_SPACE_ATTR = "data-drive-folder-space";

export function getFolderDropZoneFromEvent(event) {
  const fromTarget = event.target?.closest?.(`[${DRIVE_FOLDER_DROP_ATTR}]`);
  if (fromTarget) return fromTarget;

  const x = event.clientX;
  const y = event.clientY;
  if (typeof x !== "number" || typeof y !== "number") return null;

  if (typeof document.elementsFromPoint === "function") {
    for (const el of document.elementsFromPoint(x, y)) {
      const zone = el.closest?.(`[${DRIVE_FOLDER_DROP_ATTR}]`);
      if (zone) return zone;
    }
    return null;
  }

  const el = document.elementFromPoint(x, y);
  return el?.closest?.(`[${DRIVE_FOLDER_DROP_ATTR}]`) ?? null;
}

export function serializeDriveDragPayload({ space, items, sourceFolderId = null }) {
  return JSON.stringify({
    space,
    sourceFolderId:
      sourceFolderId != null ? Number(sourceFolderId) : null,
    items: (items || []).map((item) => ({
      kind: item.kind,
      id: Number(item.id),
      name: item.name || "",
    })),
  });
}

export function parseDriveDragPayload(dataTransfer) {
  try {
    const raw =
      dataTransfer?.getData(DRIVE_DND_MIME) ||
      dataTransfer?.getData("text/plain");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.space || !Array.isArray(parsed.items)) return null;
    return {
      space: parsed.space,
      items: parsed.items
        .map((item) => ({
          kind: item.kind === "folder" ? "folder" : "file",
          id: Number(item.id),
          name: item.name || "",
        }))
        .filter((item) => item.id > 0),
    };
  } catch {
    return null;
  }
}

export function isDriveInternalDrag(dataTransfer) {
  return Array.from(dataTransfer?.types || []).includes(DRIVE_DND_MIME);
}

export function splitDriveDragItems(items = []) {
  return {
    fileIds: items.filter((i) => i.kind === "file").map((i) => i.id),
    folderIds: items.filter((i) => i.kind === "folder").map((i) => i.id),
  };
}
