"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { keepDuplicateFile } from "@/actions";
import { FileThumbnail } from "@/components/drive/file-thumbnail";
import { ImageLightbox } from "@/components/drive/image-lightbox";
import { InfiniteScrollSentinel } from "@/components/drive/infinite-scroll-sentinel";
import { Button } from "@/components/ui/button";
import { useInfiniteFiles } from "@/hooks/use-infinite-files";
import { groupDuplicateFiles, spaceLabel } from "@/lib/duplicates";
import { formatBytes, formatDate } from "@/lib/format";
import { isImageFile } from "@/lib/mime";

export function DuplicatesPanel({
  initialFiles = [],
  initialPagination = null,
  stats = { fileCount: 0, totalBytes: 0 },
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const {
    files,
    hasMore,
    loading,
    loadMore,
  } = useInfiniteFiles({
    space: "sixmyk",
    view: "duplicates",
    initialFiles,
    initialPagination,
    enabled: true,
  });

  const groups = useMemo(() => groupDuplicateFiles(files), [files]);

  const lightboxImages = useMemo(
    () =>
      (lightbox?.groupItems || []).filter((file) =>
        isImageFile({ mimeType: file.mime_type, name: file.name }),
      ),
    [lightbox?.groupItems],
  );

  async function onKeepFile(keepId, groupItems) {
    if (pendingId) return;

    const trashIds = groupItems
      .map((item) => item.id)
      .filter((id) => String(id) !== String(keepId));

    if (!trashIds.length) return;

    setPendingId(keepId);

    try {
      const result = await keepDuplicateFile({ keepId, trashIds });
      if (!result?.success) {
        toast.error(result?.error || "Impossible de résoudre ce doublon.");
        return;
      }

      toast.success(
        `${result.data?.count || trashIds.length} doublon${
          (result.data?.count || trashIds.length) > 1 ? "s" : ""
        } envoyé${(result.data?.count || trashIds.length) > 1 ? "s" : ""} à la corbeille`
      );
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  function openLightbox(payload, groupItems) {
    const images = groupItems.filter((file) =>
      isImageFile({ mimeType: file.mime_type, name: file.name }),
    );
    const index = images.findIndex(
      (file) => String(file.id) === String(payload.fileId),
    );
    if (index < 0) return;

    setLightbox({
      index,
      fileId: payload.fileId,
      src: payload.src || null,
      groupItems: images,
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">
          Fichiers en double (même espace, nom et taille)
        </p>
        <p className="text-sm text-muted-foreground">
          {stats.fileCount} fichier{stats.fileCount > 1 ? "s" : ""} concerné
          {stats.fileCount > 1 ? "s" : ""}
          <span className="mx-1.5 text-white/20">·</span>
          {groups.length} groupe{groups.length > 1 ? "s" : ""} affiché
          {groups.length > 1 ? "s" : ""}
          <span className="mx-1.5 text-white/20">·</span>
          {formatBytes(stats.totalBytes)}
        </p>
      </div>

      {!groups.length ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-16 text-sm text-muted-foreground">
          {loading ? "Chargement…" : "Aucun doublon détecté"}
        </div>
      ) : (
        <ul className="space-y-4">
          {groups.map((group) => {
            const sample = group.items[0];
            return (
              <li
                key={group.key}
                className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
              >
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="truncate text-sm font-medium">{sample.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {spaceLabel(sample.space)}
                    <span className="mx-1.5 text-white/20">·</span>
                    {formatBytes(sample.size_bytes)}
                    <span className="mx-1.5 text-white/20">·</span>
                    {group.items.length} copies
                  </p>
                </div>

                <ul className="divide-y divide-white/5">
                  {group.items.map((file) => {
                    const pending = String(pendingId) === String(file.id);
                    const isImage = isImageFile({
                      mimeType: file.mime_type,
                      name: file.name,
                    });

                    return (
                      <li
                        key={file.id}
                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/40 sm:size-20">
                            <FileThumbnail
                              file={file}
                              fit="cover"
                              onOpen={
                                isImage
                                  ? (payload) =>
                                      openLightbox(payload, group.items)
                                  : undefined
                              }
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white/90">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID {file.id}
                              <span className="mx-1.5 text-white/20">·</span>
                              modifié {formatDate(file.updated_at)}
                            </p>
                            {file.tags ? (
                              <p className="mt-1 truncate text-xs text-white/70">
                                {file.tags}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={Boolean(pendingId)}
                          className="shrink-0 border-white/20 bg-white/5"
                          onClick={() => onKeepFile(file.id, group.items)}
                        >
                          {pending ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <ShieldCheck className="size-4" />
                          )}
                          Garder celui-ci
                          <Trash2 className="size-3.5 opacity-60" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      <InfiniteScrollSentinel
        hasMore={hasMore}
        loading={loading}
        onVisible={loadMore}
      />

      <ImageLightbox
        open={Boolean(lightbox)}
        index={lightbox?.index ?? 0}
        images={lightboxImages}
        seed={
          lightbox?.src && lightbox?.fileId
            ? { src: lightbox.src, fileId: lightbox.fileId }
            : null
        }
        onClose={() => setLightbox(null)}
        onIndexChange={(nextIndex) => {
          const file = lightboxImages[nextIndex];
          setLightbox((current) =>
            current
              ? {
                  ...current,
                  index: nextIndex,
                  fileId: file?.id ?? current.fileId,
                  src:
                    file && String(file.id) === String(current.fileId)
                      ? current.src
                      : null,
                }
              : null,
          );
        }}
      />
    </div>
  );
}
