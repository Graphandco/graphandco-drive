export function isImageFile({ mimeType, name } = {}) {
  if (mimeType && String(mimeType).startsWith("image/")) {
    return true;
  }

  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(String(name || ""));
}
