import exifr from "exifr";
import sharp from "sharp";

import { isImageFile } from "@/lib/mime";

function isRasterImage({ mimeType, name } = {}) {
  if (!isImageFile({ mimeType, name })) return false;
  if (mimeType === "image/svg+xml") return false;
  return !/\.svg$/i.test(String(name || ""));
}

function toValidDate(raw) {
  if (raw == null || raw === "") return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  // Ignore epoch / absurd placeholders
  if (date.getFullYear() < 1971) return null;
  return date;
}

function firstDate(data, keys) {
  if (!data) return null;
  for (const key of keys) {
    const date = toValidDate(data[key]);
    if (date) return date;
  }
  return null;
}

/**
 * Lit la date de prise depuis les métadonnées EXIF / XMP / IPTC.
 * Ordre : prise de vue → création → numérisation → modification → fallback.
 * @returns {Date | null}
 */
export async function extractCapturedAt(
  input,
  { mimeType, name, fallbackDate } = {}
) {
  if (!isImageFile({ mimeType, name })) return null;

  try {
    const data = await exifr.parse(input, {
      exif: true,
      xmp: true,
      iptc: true,
      icc: false,
      jfif: false,
      ihdr: false,
      translateKeys: true,
      reviveValues: true,
      pick: [
        // Prise de vue
        "DateTimeOriginal",
        // Création (EXIF / XMP / IPTC)
        "CreateDate",
        "DateCreated",
        "CreationDate",
        // Numérisation / autres
        "DateTimeDigitized",
        "DigitalCreationDate",
        "DateTime",
        "ModifyDate",
      ],
    });

    const fromMeta =
      firstDate(data, [
        "DateTimeOriginal",
        "CreateDate",
        "DateCreated",
        "CreationDate",
        "DateTimeDigitized",
        "DigitalCreationDate",
        "DateTime",
        "ModifyDate",
      ]) || null;

    if (fromMeta) return fromMeta;
  } catch {
    // ignore — fallback ci-dessous
  }

  return toValidDate(fallbackDate);
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
