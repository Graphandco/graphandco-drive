"use client";

import { useEffect, useRef, useState } from "react";
import { File, Film, ImageIcon, Play } from "lucide-react";
import { toast } from "sonner";

import { getFilePreviewUrl, getFileThumbnailUrl } from "@/actions";
import {
  getCachedThumbnailUrl,
  loadThumbnailUrl,
  preloadImage,
} from "@/lib/thumbnail-loader";
import { isImageFile, isVideoFile } from "@/lib/mime";
import { cn } from "@/lib/utils";

function cacheKey(file) {
  return `${file.id}:${file.thumbnail_key || file.storage_key || ""}`;
}

/**
 * @param {"contain" | "cover" | "masonry" | "cell"} fit
 *   contain = hauteur fixe (legacy)
 *   cover = remplit le cadre (liste)
 *   masonry = largeur colonne, hauteur selon le ratio (CSS columns)
 *   cell = cellule masonry JS à dimensions fixes
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
  const showVideo = isVideoFile({
    mimeType: file.mime_type,
    name: file.name,
  });
  const canOpenMedia = Boolean(onOpen) && (showImage || showVideo);
  const loadThumb = showImage || (showVideo && Boolean(file.thumbnail_key));

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
    if (!visible || !loadThumb || !file.id || !file.storage_key) return;

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
  }, [
    visible,
    file.id,
    file.storage_key,
    file.thumbnail_key,
    loadThumb,
  ]);

  async function handleOpen(event) {
    if (!onOpen || opening) return;
    const trigger = event.currentTarget;
    const mediaEl = trigger.querySelector("img");
    const box = (mediaEl || trigger).getBoundingClientRect();
    const originRect = {
      top: box.top,
      left: box.left,
      width: box.width,
      height: box.height,
    };
    setOpening(true);
    try {
      const result = await getFilePreviewUrl(file.id);
      if (result.success && result.data?.url) {
        onOpen({
          src: result.data.url,
          thumbSrc: src || null,
          title: file.name,
          fileId: file.id,
          originRect,
        });
      } else {
        toast.error(result.error || "Impossible d’ouvrir le fichier.");
      }
    } finally {
      setOpening(false);
    }
  }

  const contain = fit === "contain";
  const masonry = fit === "masonry";
  const cell = fit === "cell";
  const showPhoto = loadThumb && src && !failed;

  const placeholder = (
    <div
      className={cn(
        "flex items-center justify-center bg-white/5 text-muted-foreground",
        contain || masonry || cell ? "absolute inset-0" : "size-full",
        className
      )}
    >
      {showVideo ? (
        <Film className="size-8 opacity-70" />
      ) : showImage ? (
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
      draggable={false}
      className={cn(
        "transition-opacity duration-300 ease-out",
        masonry
          ? "block h-auto w-full object-contain"
          : cell
            ? "size-full object-contain"
            : contain
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

  const playBadge = showVideo ? (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center",
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-black/55 text-white shadow-md">
        <Play className="size-4 fill-current" />
      </span>
    </span>
  ) : null;

  const frameClass = cn(
    "overflow-hidden disabled:opacity-70",
    masonry
      ? "relative block w-full"
      : cell
        ? "absolute inset-0 size-full"
        : contain
        ? "relative h-full w-auto"
        : "absolute inset-0 size-full"
  );

  let media = null;
  if (canOpenMedia) {
    media = (
      <button
        type="button"
        className={cn("cursor-pointer", frameClass)}
        onClick={handleOpen}
        disabled={opening}
        aria-label={
          showVideo ? `Lire ${file.name}` : `Agrandir ${file.name}`
        }
      >
        {image}
        {playBadge}
      </button>
    );
  } else if (showPhoto) {
    media = <div className={frameClass}>{image}</div>;
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden",
        masonry ? "w-full" : cell ? "size-full" : contain ? "h-full w-auto" : "size-full"
      )}
      style={
        cell
          ? undefined
          : masonry
          ? {
              aspectRatio: aspectRatio
                ? String(aspectRatio)
                : showImage || showVideo
                  ? "4 / 3"
                  : "1 / 1",
            }
          : contain && aspectRatio
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
