import exifr from "exifr";
import sharp from "sharp";

import { isImageFile } from "@/lib/mime";

function isRasterImage({ mimeType, name } = {}) {
  if (!isImageFile({ mimeType, name })) return false;
  if (mimeType === "image/svg+xml") return false;
  return !/\.svg$/i.test(String(name || ""));
}

/**
 * Lit la date de prise depuis les métadonnées EXIF / XMP de la photo.
 * @returns {Date | null}
 */
export async function extractCapturedAt(input, { mimeType, name } = {}) {
  if (!isImageFile({ mimeType, name })) return null;

  try {
    const data = await exifr.parse(input, {
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "DateTimeDigitized",
        "ModifyDate",
      ],
    });

    if (!data) return null;

    const raw =
      data.DateTimeOriginal ||
      data.CreateDate ||
      data.DateTimeDigitized ||
      data.ModifyDate;

    if (!raw) return null;

    const date = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(date.getTime())) return null;

    return date;
  } catch {
    return null;
  }
}

/**
 * Dimensions en pixels de l’image originale (après rotation EXIF).
 * @returns {{ widthPx: number | null, heightPx: number | null }}
 */
export async function extractImageDimensions(input, { mimeType, name } = {}) {
  if (!isRasterImage({ mimeType, name })) {
    return { widthPx: null, heightPx: null };
  }

  try {
    const meta = await sharp(input, { failOn: "none" }).rotate().metadata();
    const width = Number(meta.width);
    const height = Number(meta.height);

    if (width > 0 && height > 0) {
      return { widthPx: width, heightPx: height };
    }
  } catch {
    // ignore
  }

  return { widthPx: null, heightPx: null };
}
