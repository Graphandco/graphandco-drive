"use client";

import { useEffect, useRef, useState } from "react";
import { File, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { getFilePreviewUrl, getFileThumbnailUrl } from "@/actions";
import {
  getCachedThumbnailUrl,
  loadThumbnailUrl,
  preloadImage,
} from "@/lib/thumbnail-loader";
import { isImageFile } from "@/lib/mime";
import { cn } from "@/lib/utils";

function cacheKey(file) {
  return `${file.id}:${file.thumbnail_key || file.storage_key || ""}`;
}

/**
 * @param {"contain" | "cover"} fit
 *   contain = ratio respecté (vues grille), cover = remplit le cadre (liste)
 */
export function FileThumbnail({
  file,
  className,
  onOpen,
  fit = "contain",
}) {
  const rootRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null);
  const showImage = isImageFile({
    mimeType: file.mime_type,
    name: file.name,
  });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px", threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !showImage || !file.id || !file.storage_key) return;

    const key = cacheKey(file);
    let cancelled = false;
    setReady(false);
    setFailed(false);

    async function run() {
      try {
        const cached = getCachedThumbnailUrl(key);
        const url =
          cached ||
          (await loadThumbnailUrl(key, async () => {
            const result = await getFileThumbnailUrl(file.id);
            if (!result.success || !result.data?.url) {
              throw new Error(result.error || "Miniature indisponible");
            }
            return result.data.url;
          }));

        if (cancelled) return;

        await preloadImage(url);
        if (cancelled) return;

        setSrc(url);
        setFailed(false);
        requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [visible, file.id, file.storage_key, file.thumbnail_key, showImage]);

  async function handleOpen() {
    if (!onOpen || opening) return;
    setOpening(true);
    try {
      const result = await getFilePreviewUrl(file.id);
      if (result.success && result.data?.url) {
        onOpen({ src: result.data.url, title: file.name });
      } else {
        toast.error(result.error || "Impossible d’ouvrir le fichier.");
      }
    } finally {
      setOpening(false);
    }
  }

  const contain = fit === "contain";
  const showPhoto = showImage && src && !failed;

  const placeholder = (
    <div
      className={cn(
        "flex items-center justify-center bg-white/5 text-muted-foreground",
        contain ? "absolute inset-0" : "size-full",
        className
      )}
    >
      {showImage ? (
        <ImageIcon className="size-8 opacity-70" />
      ) : (
        <File className="size-8 opacity-70" />
      )}
    </div>
  );

  const image = showPhoto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={file.name}
      decoding="async"
      className={cn(
        "transition-opacity duration-300 ease-out",
        contain
          ? "h-full w-auto max-w-none object-contain"
          : "size-full object-cover",
        ready ? "opacity-100" : "opacity-0",
        className
      )}
      onLoad={(event) => {
        const { naturalWidth, naturalHeight } = event.currentTarget;
        if (naturalWidth > 0 && naturalHeight > 0) {
          setAspectRatio(naturalWidth / naturalHeight);
        }
      }}
      onError={() => setFailed(true)}
    />
  ) : null;

  const media = showPhoto ? (
    onOpen ? (
      <button
        type="button"
        className={cn(
          "cursor-pointer overflow-hidden disabled:opacity-70",
          contain ? "relative h-full w-auto" : "absolute inset-0 size-full"
        )}
        onClick={handleOpen}
        disabled={opening}
        aria-label={`Agrandir ${file.name}`}
      >
        {image}
      </button>
    ) : (
      <div
        className={
          contain ? "relative h-full w-auto" : "absolute inset-0"
        }
      >
        {image}
      </div>
    )
  ) : null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden",
        contain ? "h-full w-auto" : "size-full"
      )}
      style={
        contain && aspectRatio
          ? { aspectRatio: String(aspectRatio), height: "100%" }
          : contain
            ? { aspectRatio: "4 / 3", height: "100%" }
            : undefined
      }
    >
      {placeholder}
      {media}
    </div>
  );
}
