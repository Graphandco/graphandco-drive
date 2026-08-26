export const LIGHTBOX_LAYOUT_ID_PREFIX = "drive-photo-";

export function lightboxLayoutId(fileId) {
  if (fileId == null) return undefined;
  return `${LIGHTBOX_LAYOUT_ID_PREFIX}${fileId}`;
}
