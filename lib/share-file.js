/**
 * Partage natif (WhatsApp, Mail…) via Web Share API, sinon téléchargement local.
 * Passe par /api/files/[id]/content pour éviter les soucis CORS S3.
 */

export function canShareFiles() {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  try {
    const probe = new File(["x"], "probe.txt", { type: "text/plain" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

function triggerBlobDownload(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "fichier";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
}

/**
 * @param {{ fileId: number|string, fileName?: string, mimeType?: string }} opts
 * @returns {Promise<{ method: "share" | "download" | "abort" }>}
 */
export async function shareOrDownloadFile({ fileId, fileName, mimeType }) {
  if (fileId == null) {
    throw new Error("Fichier manquant.");
  }

  const response = await fetch(`/api/files/${fileId}/content`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    let message = "Impossible de récupérer le fichier.";
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const type =
    mimeType || blob.type || response.headers.get("Content-Type") || "application/octet-stream";
  const name = fileName || `fichier-${fileId}`;
  const file = new File([blob], name, { type });

  if (canShareFiles()) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: name,
        });
        return { method: "share" };
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return { method: "abort" };
      }
      // Fallback download si l’app cible refuse le fichier
    }
  }

  triggerBlobDownload(blob, name);
  return { method: "download" };
}
