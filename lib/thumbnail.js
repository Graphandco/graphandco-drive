import sharp from "sharp";

import { isImageFile } from "@/lib/mime";

/** Hauteur cible des miniatures (largeur proportionnelle, sans crop). */
export function getThumbnailHeight() {
  const raw = Number(
    process.env.THUMBNAIL_HEIGHT || process.env.THUMBNAIL_SIZE
  );
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 200;
}

/** Qualité WebP 1–100. Réglable via env. */
export function getThumbnailQuality() {
  const raw = Number(process.env.THUMBNAIL_QUALITY);
  if (!Number.isFinite(raw)) return 80;
  return Math.min(100, Math.max(1, Math.round(raw)));
}

export function canGenerateThumbnail({ mimeType, name } = {}) {
  if (!isImageFile({ mimeType, name })) return false;
  // SVG : sharp possible mais peu fiable ; on garde l’original en grille
  if (
    mimeType === "image/svg+xml" ||
    /\.svg$/i.test(String(name || ""))
  ) {
    return false;
  }
  return true;
}

/** Clé S3 dérivée : original.jpg → original.jpg.thumb.webp */
export function buildThumbnailKey(storageKey) {
  if (!storageKey) return null;
  return `${storageKey}.thumb.webp`;
}

/**
 * Génère un WebP hauteur fixe (défaut 200px), largeur adaptée — pas de crop.
 * @returns {{ buffer: Buffer, contentType: string, size: number, quality: number, width: number, height: number } | null}
 */
export async function createThumbnailBuffer(input, { mimeType, name } = {}) {
  if (!canGenerateThumbnail({ mimeType, name })) return null;

  const height = getThumbnailHeight();
  const quality = getThumbnailQuality();

  const pipeline = sharp(input, { failOn: "none" }).rotate().resize({
    height,
    fit: "inside",
    withoutEnlargement: false,
  });

  const { data, info } = await pipeline
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    contentType: "image/webp",
    size: data.length,
    quality,
    width: info.width,
    height: info.height,
  };
}
