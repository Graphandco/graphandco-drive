export function isImageFile({ mimeType, name } = {}) {
  if (mimeType && String(mimeType).startsWith("image/")) {
    return true;
  }

  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(String(name || ""));
}

export function isVideoFile({ mimeType, name } = {}) {
  if (mimeType && String(mimeType).startsWith("video/")) {
    return true;
  }

  return /\.(mp4|webm|mov|m4v|mkv|avi|ogv)$/i.test(String(name || ""));
}

export function isMediaFile({ mimeType, name } = {}) {
  return (
    isImageFile({ mimeType, name }) || isVideoFile({ mimeType, name })
  );
}
