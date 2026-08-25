import { NextResponse } from "next/server";

import { getFile } from "@/actions/files";
import { getObjectPayload } from "@/lib/storage";

function asciiFileName(name) {
  return String(name || "file")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const fileId = Number(id);
    if (!Number.isFinite(fileId) || fileId <= 0) {
      return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
    }

    const existing = await getFile(fileId);
    if (!existing.success || !existing.data) {
      return NextResponse.json(
        { error: existing.error || "Fichier introuvable." },
        { status: 404 }
      );
    }

    const file = existing.data;
    if (!file.storage_key) {
      return NextResponse.json(
        { error: "Ce fichier n’a pas d’objet stockage associé." },
        { status: 404 }
      );
    }

    const { stream, contentType, contentLength } = await getObjectPayload({
      location: file.storage_location || "sixmyk",
      key: file.storage_key,
    });

    const headers = new Headers();
    headers.set("Content-Type", file.mime_type || contentType);
    headers.set(
      "Content-Disposition",
      `inline; filename="${asciiFileName(file.name)}"`
    );
    headers.set("Cache-Control", "private, max-age=60");
    if (contentLength != null) {
      headers.set("Content-Length", String(contentLength));
    }

    return new NextResponse(stream, { status: 200, headers });
  } catch (error) {
    console.error("GET /api/files/[id]/content:", error);
    return NextResponse.json(
      { error: error?.message || "Impossible de lire le fichier." },
      { status: 500 }
    );
  }
}
