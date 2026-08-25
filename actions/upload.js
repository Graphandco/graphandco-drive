"use server";

import { revalidatePath } from "next/cache";

import { createFileRecord, deleteFilePermanent, getFile } from "@/actions/files";
import { getFolder } from "@/actions/folders";
import { getSpaceConfig } from "@/lib/drive";
import {
  buildObjectKey,
  buildObjectUrl,
  setObjectPublicAccess,
  checkStorageHealth,
  deleteObject,
  getSignedDownloadUrl,
  uploadObject,
} from "@/lib/storage";
import {
  buildThumbnailKey,
  createThumbnailBuffer,
} from "@/lib/thumbnail";
import { extractCapturedAt, extractImageDimensions } from "@/lib/image-meta";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function revalidateDrive(spaceKey = "sixmyk") {
  const space = getSpaceConfig(spaceKey);
  revalidatePath(space.basePath);
  revalidatePath("/trash");
  revalidatePath("/settings");
}

export async function checkBucketHealth(location = "sixmyk") {
  return checkStorageHealth(location);
}

export async function checkBucketsHealth() {
  const [sixmyk, pub, regis] = await Promise.all([
    checkStorageHealth("sixmyk"),
    checkStorageHealth("public"),
    checkStorageHealth("regis"),
  ]);

  return { sixmyk, public: pub, regis };
}

export async function uploadFile(formData) {
  try {
    const file = formData.get("file");
    const folderId = Number(formData.get("folderId"));
    const space = String(formData.get("space") || "sixmyk");
    const spaceConfig = getSpaceConfig(space);
    const location = String(
      formData.get("location") || spaceConfig.storageLocation || "sixmyk"
    );

    if (!file || typeof file === "string" || !file.name) {
      return { success: false, error: "Aucun fichier reçu." };
    }

    if (!folderId) {
      return { success: false, error: "Dossier parent requis." };
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        success: false,
        error: "Fichier trop volumineux (max 50 Mo).",
      };
    }

    const parent = await getFolder(folderId);
    if (!parent.success || parent.data.deleted_at) {
      return { success: false, error: "Dossier parent invalide." };
    }

    const resolvedSpace = parent.data.space || space;

    const key = buildObjectKey({
      fileName: file.name,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    let capturedAt = null;
    let widthPx = null;
    let heightPx = null;

    try {
      [capturedAt, { widthPx, heightPx }] = await Promise.all([
        extractCapturedAt(buffer, { mimeType, name: file.name }),
        extractImageDimensions(buffer, { mimeType, name: file.name }),
      ]);
    } catch (metaError) {
      console.warn("uploadFile/meta:", metaError?.message || metaError);
    }

    await uploadObject({
      location,
      key,
      body: buffer,
      contentType: mimeType,
      contentLength: buffer.length,
    });

    let thumbnailKey = null;
    try {
      const thumb = await createThumbnailBuffer(buffer, {
        mimeType,
        name: file.name,
      });
      if (thumb) {
        thumbnailKey = buildThumbnailKey(key);
        await uploadObject({
          location,
          key: thumbnailKey,
          body: thumb.buffer,
          contentType: thumb.contentType,
          contentLength: thumb.size,
        });
      }
    } catch (thumbError) {
      console.warn("uploadFile/thumbnail:", thumbError?.message || thumbError);
      thumbnailKey = null;
    }

    const record = await createFileRecord({
      name: file.name,
      folderId,
      space: resolvedSpace,
      mimeType,
      sizeBytes: buffer.length,
      storageKey: key,
      thumbnailKey,
      storageLocation: location,
      capturedAt,
      widthPx,
      heightPx,
    });

    if (!record.success) {
      await deleteObject({ location, key }).catch(() => {});
      if (thumbnailKey) {
        await deleteObject({ location, key: thumbnailKey }).catch(() => {});
      }
      return record;
    }

    revalidateDrive(resolvedSpace);

    return {
      success: true,
      data: {
        ...record.data,
        storage_key: key,
        thumbnail_key: thumbnailKey,
        storage_location: location,
        size_bytes: buffer.length,
      },
    };
  } catch (error) {
    console.error("uploadFile:", error);
    return {
      success: false,
      error: error?.message || "Échec de l’upload vers le stockage.",
    };
  }
}

export async function getFileDownloadUrl(fileId) {
  try {
    const existing = await getFile(fileId);
    if (!existing.success) return existing;

    const file = existing.data;
    if (!file.storage_key) {
      return {
        success: false,
        error: "Ce fichier n’a pas d’objet stockage associé.",
      };
    }

    const signed = await getSignedDownloadUrl({
      location: file.storage_location || "sixmyk",
      key: file.storage_key,
      fileName: file.name,
      disposition: "attachment",
    });

    return { success: true, data: signed };
  } catch (error) {
    console.error("getFileDownloadUrl:", error);
    return {
      success: false,
      error: error?.message || "Impossible de générer le lien de téléchargement.",
    };
  }
}

/** Original full size — lightbox / aperçu */
export async function getFilePreviewUrl(fileId) {
  try {
    const existing = await getFile(fileId);
    if (!existing.success) return existing;

    const file = existing.data;
    if (!file.storage_key) {
      return {
        success: false,
        error: "Ce fichier n’a pas d’objet stockage associé.",
      };
    }

    const signed = await getSignedDownloadUrl({
      location: file.storage_location || "sixmyk",
      key: file.storage_key,
      fileName: file.name,
      disposition: "inline",
      expiresIn: 60 * 30,
    });

    return { success: true, data: signed };
  } catch (error) {
    console.error("getFilePreviewUrl:", error);
    return {
      success: false,
      error: error?.message || "Impossible de générer l’aperçu.",
    };
  }
}

/** Miniature Sharp (fallback = original si pas de thumb) */
export async function getFileThumbnailUrl(fileId) {
  try {
    const existing = await getFile(fileId);
    if (!existing.success) return existing;

    const file = existing.data;
    const key = file.thumbnail_key || file.storage_key;
    if (!key) {
      return {
        success: false,
        error: "Ce fichier n’a pas d’objet stockage associé.",
      };
    }

    const signed = await getSignedDownloadUrl({
      location: file.storage_location || "sixmyk",
      key,
      fileName: file.thumbnail_key
        ? `${file.name}.thumb.webp`
        : file.name,
      disposition: "inline",
      expiresIn: 60 * 60,
    });

    return {
      success: true,
      data: {
        ...signed,
        isThumbnail: Boolean(file.thumbnail_key),
      },
    };
  } catch (error) {
    console.error("getFileThumbnailUrl:", error);
    return {
      success: false,
      error: error?.message || "Impossible de générer la miniature.",
    };
  }
}

/** Lien S3 permanent (sans signature), adapté au partage / aperçu */
export async function getFileObjectUrl(fileId) {
  try {
    const existing = await getFile(fileId);
    if (!existing.success) return existing;

    const file = existing.data;
    if (!file.storage_key) {
      return {
        success: false,
        error: "Ce fichier n’a pas d’objet stockage associé.",
      };
    }

    const location = file.storage_location || "sixmyk";

    // Bucket public : garantir l’accès anonyme sur le lien simplifié
    if (location === "public") {
      try {
        await setObjectPublicAccess({
          location,
          key: file.storage_key,
        });
      } catch (aclError) {
        console.warn("setObjectPublicAccess:", aclError?.message || aclError);
      }
    }

    const url = buildObjectUrl({
      location,
      key: file.storage_key,
    });

    if (!url) {
      return { success: false, error: "Impossible de construire l’URL S3." };
    }

    return { success: true, data: { url, key: file.storage_key } };
  } catch (error) {
    console.error("getFileObjectUrl:", error);
    return {
      success: false,
      error: error?.message || "Impossible de générer le lien S3.",
    };
  }
}

export async function purgeFile(fileId) {
  try {
    const existing = await getFile(fileId);
    if (!existing.success) return existing;

    const file = existing.data;
    const location = file.storage_location || "sixmyk";

    if (file.storage_key) {
      await deleteObject({
        location,
        key: file.storage_key,
      });
    }

    if (file.thumbnail_key) {
      await deleteObject({
        location,
        key: file.thumbnail_key,
      }).catch(() => {});
    }

    return deleteFilePermanent(fileId);
  } catch (error) {
    console.error("purgeFile:", error);
    return {
      success: false,
      error: error?.message || "Impossible de purger le fichier.",
    };
  }
}
