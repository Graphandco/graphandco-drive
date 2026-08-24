import exifr from "exifr";

import { isImageFile } from "@/lib/mime";

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
