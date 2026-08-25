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
 * Extrait une date du nom de fichier (fallback uniquement).
 * Ex. 00003075-PHOTO-2024-12-15-10-16-23
 *     IMG_20241215_101623
 *     2024-12-15
 * @returns {Date | null}
 */
export function parseDateFromFileName(fileName) {
  const base = String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .trim();
  if (!base) return null;

  // 2024-12-15-10-16-23 | 2024_12_15_10_16_23 | 2024-12-15 10:16:23
  const dashed = base.match(
    /(20\d{2})[-_. ](0[1-9]|1[0-2])[-_. ](0[1-9]|[12]\d|3[01])(?:[-_. T]([01]\d|2[0-3])[-_.:]?([0-5]\d)[-_.:]?([0-5]\d))?/
  );
  if (dashed) {
    const [, y, mo, d, h = "0", mi = "0", s = "0"] = dashed;
    return toValidDate(
      new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s)
      )
    );
  }

  // IMG_20241215_101623 / 20241215_101623 / 20241215101623
  const compact = base.match(
    /(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:[_-]?([01]\d|2[0-3])([0-5]\d)([0-5]\d))?/
  );
  if (compact) {
    const [, y, mo, d, h = "0", mi = "0", s = "0"] = compact;
    return toValidDate(
      new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s)
      )
    );
  }

  return null;
}

/**
 * Lit la date de prise depuis les métadonnées EXIF / XMP / IPTC.
 * Fallback : date dans le nom de fichier, puis lastModified navigateur.
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

  const fromName = parseDateFromFileName(name);
  if (fromName) return fromName;

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
