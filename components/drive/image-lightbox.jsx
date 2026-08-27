"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Info, Share2, Volume2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";

import { getFilePreviewUrl } from "@/actions";
import { FavoriteButton } from "@/components/drive/favorite-button";
import { isVideoFile } from "@/lib/mime";
import { getCachedThumbnailUrl } from "@/lib/thumbnail-loader";
import { shareOrDownloadFile } from "@/lib/share-file";
import { cn } from "@/lib/utils";

import "./image-lightbox.css";

/** Backup YARL : `image-lightbox-yarl.jsx` */
export { lightboxLayoutId } from "@/components/drive/lightbox-layout-id";

const PLACEHOLDER_SRC =
   "data:image/svg+xml," +
   encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100%" height="100%" fill="#0a0a0a"/></svg>`,
   );

const OPEN_EASE = [0.22, 1, 0.36, 1];
const SWIPE_THRESHOLD = 80;
const VIEW_PADDING = 0.9;

function thumbnailCacheKey(file) {
   return `${file.id}:${file.thumbnail_key || file.storage_key || ""}`;
}

function resolveFallbackSrc(file, thumbSrc) {
   if (thumbSrc) return thumbSrc;
   if (!file?.id) return PLACEHOLDER_SRC;
   return getCachedThumbnailUrl(thumbnailCacheKey(file)) || PLACEHOLDER_SRC;
}

function copyRect(rect) {
   if (!rect) return null;
   return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
   };
}

function getAspect(file, originRect) {
   if (file?.width_px > 0 && file?.height_px > 0) {
      return file.width_px / file.height_px;
   }
   if (originRect?.width > 0 && originRect?.height > 0) {
      return originRect.width / originRect.height;
   }
   if (
      isVideoFile({ mimeType: file?.mime_type, name: file?.name })
   ) {
      return 16 / 9;
   }
   return 4 / 3;
}

function getContainRect(aspect, padding = VIEW_PADDING) {
   if (typeof window === "undefined") {
      return { top: 0, left: 0, width: 0, height: 0 };
   }
   const maxW = window.innerWidth * padding;
   const maxH = window.innerHeight * padding;
   let width = maxW;
   let height = width / aspect;
   if (height > maxH) {
      height = maxH;
      width = height * aspect;
   }
   return {
      width,
      height,
      left: (window.innerWidth - width) / 2,
      top: (window.innerHeight - height) / 2,
   };
}

function LightboxCloseButton({ onClose }) {
   return (
      <button
         type="button"
         onClick={onClose}
         aria-label="Fermer"
         className={cn(
            "graphand-lightbox__close-zone absolute top-4 right-4 z-20",
            "flex size-11 cursor-pointer items-center justify-center rounded-full",
            "border-0 bg-white p-0 text-black outline-none",
            "shadow-md transition-colors duration-150",
            "hover:bg-red-950 hover:text-white",
            "focus-visible:ring-2 focus-visible:ring-white/40",
            "max-sm:top-3 max-sm:right-3 max-sm:size-8",
         )}
      >
         <X className="size-4 shrink-0 max-sm:size-3.5" strokeWidth={2.25} />
      </button>
   );
}

function LightboxActionButton({ label, onClick, children, className }) {
   return (
      <button
         type="button"
         aria-label={label}
         onClick={(event) => {
            event.stopPropagation();
            onClick?.(event);
         }}
         className={cn(
            "inline-flex size-8 cursor-pointer items-center justify-center rounded-full",
            "border-0 bg-white p-0 text-black shadow-md outline-none",
            "transition-colors duration-150 hover:bg-white/90",
            "focus-visible:ring-2 focus-visible:ring-white/40",
            className,
         )}
      >
         {children}
      </button>
   );
}

/**
 * Lightbox Motion : morph FLIP fluide thumb → image, sans cadre noir.
 * Backup YARL : `image-lightbox-yarl.jsx`
 */
export function ImageLightbox({
   open,
   index = 0,
   images = [],
   seed = null,
   onClose,
   onIndexChange,
   onInfo,
   onFavoriteChanged,
}) {
   const reduceMotion = useReducedMotion();
   const [mounted, setMounted] = useState(false);
   const [urls, setUrls] = useState(() => new Map());
   const urlsRef = useRef(urls);
   const fetchingRef = useRef(new Set());
   const indexRef = useRef(index);
   const openingIdRef = useRef(null);
   const originRectRef = useRef(null);
   const [zoom, setZoom] = useState(1);
   const [pan, setPan] = useState({ x: 0, y: 0 });
   const [viewport, setViewport] = useState(() =>
      typeof window !== "undefined"
         ? { w: window.innerWidth, h: window.innerHeight }
         : { w: 0, h: 0 },
   );
   const dragStartRef = useRef(null);
   const pinchRef = useRef(null);
   const videoRef = useRef(null);
   const [videoMuted, setVideoMuted] = useState(false);
   const [showUnmuteHint, setShowUnmuteHint] = useState(false);

   useEffect(() => {
      setMounted(true);
   }, []);

   useEffect(() => {
      urlsRef.current = urls;
   }, [urls]);

   useEffect(() => {
      indexRef.current = index;
   }, [index]);

   useEffect(() => {
      if (!open) {
         openingIdRef.current = null;
         originRectRef.current = null;
         setZoom(1);
         setPan({ x: 0, y: 0 });
         setVideoMuted(false);
         setShowUnmuteHint(false);
         const video = videoRef.current;
         if (video) {
            video.pause();
            video.removeAttribute("src");
            video.load();
         }
      }
   }, [open]);

   if (open && seed?.fileId != null && openingIdRef.current == null) {
      openingIdRef.current = seed.fileId;
      originRectRef.current = copyRect(seed.originRect);
   }

   useEffect(() => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setVideoMuted(false);
      setShowUnmuteHint(false);
      const video = videoRef.current;
      if (video) video.pause();
   }, [index]);

   useEffect(() => {
      if (!open) return;
      function measure() {
         setViewport({ w: window.innerWidth, h: window.innerHeight });
      }
      measure();
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
   }, [open]);

   const setUrl = useCallback((fileId, src) => {
      if (!fileId || !src) return;
      const key = String(fileId);
      setUrls((current) => {
         if (current.get(key) === src) return current;
         const next = new Map(current);
         next.set(key, src);
         return next;
      });
   }, []);

   useEffect(() => {
      if (!open || !seed?.fileId || !seed?.src) return;
      setUrl(seed.fileId, seed.src);
   }, [open, seed?.fileId, seed?.src, setUrl]);

   const ensurePreview = useCallback(
      async (file) => {
         if (!file?.id) return;
         const key = String(file.id);
         if (urlsRef.current.has(key)) return;
         if (fetchingRef.current.has(key)) return;

         fetchingRef.current.add(key);
         try {
            const result = await getFilePreviewUrl(file.id);
            if (result?.success && result.data?.url) {
               setUrl(file.id, result.data.url);
            }
         } finally {
            fetchingRef.current.delete(key);
         }
      },
      [setUrl],
   );

   useEffect(() => {
      if (!open || !images.length) return;

      const targets = [];
      for (let offsetIdx = -1; offsetIdx <= 2; offsetIdx += 1) {
         const i = index + offsetIdx;
         if (i >= 0 && i < images.length) targets.push(images[i]);
      }

      for (const file of targets) {
         ensurePreview(file);
      }
   }, [open, index, images, ensurePreview]);

   useEffect(() => {
      if (open) return;
      fetchingRef.current.clear();
   }, [open]);

   const safeIndex = Math.min(
      Math.max(0, index),
      Math.max(0, images.length - 1),
   );
   const currentFile = images[safeIndex] || null;
   const currentKey = currentFile ? String(currentFile.id) : null;
   const isVideo = Boolean(
      currentFile &&
         isVideoFile({
            mimeType: currentFile.mime_type,
            name: currentFile.name,
         }),
   );
   const fullSrc = currentKey ? urls.get(currentKey) : null;
   const displaySrc = isVideo
      ? fullSrc || null
      : fullSrc ||
        resolveFallbackSrc(
           currentFile,
           seed && String(seed.fileId) === currentKey ? seed.thumbSrc : null,
        );

   const isOpeningImage =
      Boolean(currentFile) &&
      String(currentFile.id) === String(openingIdRef.current);
   const originRect = isOpeningImage ? originRectRef.current : null;

   const targetRect = useMemo(() => {
      if (!currentFile || !viewport.w) return null;
      return getContainRect(
         getAspect(currentFile, originRect),
         viewport.w < 640 ? 0.94 : VIEW_PADDING,
      );
   }, [currentFile, originRect, viewport.w, viewport.h]);

   useEffect(() => {
      if (!open || !isVideo || !fullSrc) return;
      const video = videoRef.current;
      if (!video) return;

      let cancelled = false;

      async function tryPlay() {
         video.muted = false;
         setVideoMuted(false);
         setShowUnmuteHint(false);
         try {
            await video.play();
            if (cancelled) return;
         } catch {
            if (cancelled) return;
            video.muted = true;
            setVideoMuted(true);
            setShowUnmuteHint(true);
            try {
               await video.play();
            } catch {
               // Autoplay bloqué — contrôles natifs disponibles
            }
         }
      }

      if (video.readyState >= 2) {
         tryPlay();
         return () => {
            cancelled = true;
         };
      }

      const onReady = () => {
         video.removeEventListener("loadeddata", onReady);
         tryPlay();
      };
      video.addEventListener("loadeddata", onReady);
      return () => {
         cancelled = true;
         video.removeEventListener("loadeddata", onReady);
      };
   }, [open, isVideo, fullSrc, currentKey]);

   const unmuteVideo = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = false;
      setVideoMuted(false);
      setShowUnmuteHint(false);
      video.play().catch(() => {});
   }, []);

   const goTo = useCallback(
      (nextIndex) => {
         if (nextIndex < 0 || nextIndex >= images.length) return;
         if (nextIndex === indexRef.current) return;
         onIndexChange?.(nextIndex);
         const file = images[nextIndex];
         if (file) ensurePreview(file);
      },
      [images, onIndexChange, ensurePreview],
   );

   const goPrev = useCallback(() => goTo(indexRef.current - 1), [goTo]);
   const goNext = useCallback(() => goTo(indexRef.current + 1), [goTo]);

   useEffect(() => {
      if (!open) return;

      function onKeyDown(event) {
         if (event.key === "Escape") {
            event.preventDefault();
            onClose?.();
            return;
         }
         if (event.key === "ArrowLeft") {
            event.preventDefault();
            goPrev();
            return;
         }
         if (event.key === "ArrowRight") {
            event.preventDefault();
            goNext();
         }
      }

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
   }, [open, onClose, goPrev, goNext]);

   useEffect(() => {
      if (!open) return;
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
         document.body.style.overflow = previous;
      };
   }, [open]);

   const resetZoom = useCallback(() => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
   }, []);

   const handleWheel = useCallback((event) => {
      event.preventDefault();
      const delta = -event.deltaY * 0.0015;
      setZoom((current) => {
         const next = Math.min(4, Math.max(1, current + delta * current));
         if (next <= 1.01) {
            setPan({ x: 0, y: 0 });
            return 1;
         }
         return next;
      });
   }, []);

   const handleDoubleClick = useCallback(() => {
      setZoom((current) => {
         if (current > 1.01) {
            setPan({ x: 0, y: 0 });
            return 1;
         }
         return 2.5;
      });
   }, []);

   const handlePointerDown = useCallback(
      (event) => {
         dragStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            ox: pan.x,
            oy: pan.y,
            zoom,
            moved: false,
         };
         event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      [pan.x, pan.y, zoom],
   );

   const handlePointerMove = useCallback((event) => {
      const start = dragStartRef.current;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) start.moved = true;
      if (start.zoom > 1.01) {
         setPan({ x: start.ox + dx, y: start.oy + dy });
      }
   }, []);

   const handlePointerUp = useCallback(
      (event) => {
         const start = dragStartRef.current;
         dragStartRef.current = null;
         if (!start || start.zoom > 1.01 || !start.moved) return;
         const dx = event.clientX - start.x;
         if (dx > SWIPE_THRESHOLD) goPrev();
         else if (dx < -SWIPE_THRESHOLD) goNext();
      },
      [goPrev, goNext],
   );

   const handleTouchStart = useCallback(
      (event) => {
         if (event.touches.length === 2) {
            const [a, b] = event.touches;
            pinchRef.current = {
               dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
               zoom,
            };
            dragStartRef.current = null;
         }
      },
      [zoom],
   );

   const handleTouchMove = useCallback((event) => {
      if (event.touches.length !== 2 || !pinchRef.current) return;
      event.preventDefault();
      const [a, b] = event.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / Math.max(1, pinchRef.current.dist);
      const next = Math.min(4, Math.max(1, pinchRef.current.zoom * ratio));
      setZoom(next);
      if (next <= 1.01) setPan({ x: 0, y: 0 });
   }, []);

   const handleTouchEnd = useCallback(() => {
      pinchRef.current = null;
   }, []);

   const handleShare = useCallback(async () => {
      if (!currentFile?.id) return;
      try {
         const result = await shareOrDownloadFile({
            fileId: currentFile.id,
            fileName: currentFile.name,
            mimeType: currentFile.mime_type,
         });
         if (result.method === "download") {
            toast.success("Partage indisponible — téléchargement lancé");
         }
      } catch (error) {
         toast.error(error?.message || "Partage impossible.");
      }
   }, [currentFile]);

   const handleOverlayClick = useCallback(
      (event) => {
         if (event.target !== event.currentTarget) return;
         onClose?.();
      },
      [onClose],
   );

   const isOpen = open && images.length > 0 && Boolean(currentFile);
   const duration = reduceMotion ? 0 : 0.48;
   const canMorph = Boolean(originRect && targetRect && !reduceMotion);

   const imageInitial = canMorph
      ? {
           top: originRect.top,
           left: originRect.left,
           width: originRect.width,
           height: originRect.height,
           borderRadius: 8,
           scale: 1,
           opacity: 1,
        }
      : reduceMotion
        ? false
        : {
             opacity: 0,
             scale: 0.92,
             top: targetRect?.top ?? 0,
             left: targetRect?.left ?? 0,
             width: targetRect?.width ?? 0,
             height: targetRect?.height ?? 0,
          };

   if (!mounted) return null;

   return createPortal(
      <AnimatePresence>
         {isOpen && targetRect ? (
            <>
               <motion.div
                  key="graphand-lightbox-backdrop"
                  aria-hidden
                  className="graphand-lightbox-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                     duration: reduceMotion ? 0 : 0.35,
                     ease: "easeOut",
                  }}
               />

               <div
                  key="graphand-lightbox-hitbox"
                  className="graphand-lightbox-portal"
                  role="dialog"
                  aria-modal="true"
                  aria-label={currentFile?.name || (isVideo ? "Vidéo" : "Photo")}
                  onClick={handleOverlayClick}
               />

               <motion.div
                  key="graphand-lightbox-chrome"
                  className="graphand-lightbox-chrome"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                     duration: reduceMotion ? 0 : 0.25,
                     delay: reduceMotion ? 0 : 0.12,
                  }}
               >
                  <div className="graphand-lightbox-actions absolute top-3 left-3 z-20 flex items-center gap-2 sm:hidden">
                     <FavoriteButton
                        file={currentFile}
                        variant="lightbox"
                        alwaysVisible
                        onChanged={onFavoriteChanged}
                     />
                     <LightboxActionButton
                        label="Informations"
                        onClick={() => onInfo?.(currentFile)}
                     >
                        <Info className="size-3.5" strokeWidth={2.25} />
                     </LightboxActionButton>
                     <LightboxActionButton
                        label="Partager"
                        onClick={handleShare}
                     >
                        <Share2 className="size-3.5" strokeWidth={2.25} />
                     </LightboxActionButton>
                  </div>

                  {isVideo && showUnmuteHint ? (
                     <LightboxActionButton
                        label="Activer le son"
                        onClick={unmuteVideo}
                        className="absolute bottom-6 left-1/2 z-20 size-auto -translate-x-1/2 gap-2 px-3 py-2 sm:bottom-8"
                     >
                        {videoMuted ? (
                           <VolumeX className="size-4" strokeWidth={2.25} />
                        ) : (
                           <Volume2 className="size-4" strokeWidth={2.25} />
                        )}
                        <span className="text-xs font-medium">Activer le son</span>
                     </LightboxActionButton>
                  ) : null}

                  <LightboxCloseButton
                     onClose={() => {
                        resetZoom();
                        onClose?.();
                     }}
                  />

                  {images.length > 1 ? (
                     <>
                        <button
                           type="button"
                           className="graphand-lightbox-nav graphand-lightbox-nav--prev"
                           aria-label="Précédente"
                           disabled={safeIndex <= 0}
                           onClick={goPrev}
                        >
                           <ChevronLeft className="size-7" />
                        </button>
                        <button
                           type="button"
                           className="graphand-lightbox-nav graphand-lightbox-nav--next"
                           aria-label="Suivante"
                           disabled={safeIndex >= images.length - 1}
                           onClick={goNext}
                        >
                           <ChevronRight className="size-7" />
                        </button>
                     </>
                  ) : null}
               </motion.div>

               {isVideo ? (
                  <motion.div
                     key={`video-wrap-${currentKey}`}
                     className="graphand-lightbox-video-wrap"
                     initial={
                        reduceMotion
                           ? {
                                top: targetRect.top,
                                left: targetRect.left,
                                width: targetRect.width,
                                height: targetRect.height,
                             }
                           : isOpeningImage && originRect
                             ? {
                                  top: originRect.top,
                                  left: originRect.left,
                                  width: originRect.width,
                                  height: originRect.height,
                                  borderRadius: 8,
                                  opacity: 1,
                               }
                             : {
                                  opacity: 0,
                                  scale: 0.96,
                                  top: targetRect.top,
                                  left: targetRect.left,
                                  width: targetRect.width,
                                  height: targetRect.height,
                               }
                     }
                     animate={{
                        opacity: 1,
                        scale: 1,
                        top: targetRect.top,
                        left: targetRect.left,
                        width: targetRect.width,
                        height: targetRect.height,
                        borderRadius: 12,
                     }}
                     exit={{ opacity: 0, scale: 0.97 }}
                     transition={{ duration, ease: OPEN_EASE }}
                     onClick={(event) => event.stopPropagation()}
                  >
                     {displaySrc ? (
                        <video
                           ref={videoRef}
                           key={`video-${currentKey}`}
                           className="graphand-lightbox-video"
                           src={displaySrc}
                           controls
                           playsInline
                           preload="auto"
                           poster={
                              seed &&
                              String(seed.fileId) === currentKey &&
                              seed.thumbSrc
                                 ? seed.thumbSrc
                                 : undefined
                           }
                        />
                     ) : (
                        <div className="flex size-full items-center justify-center">
                           <span
                              className={cn(
                                 "inline-block size-8 animate-spin rounded-full",
                                 "border-2 border-white/25 border-t-white",
                              )}
                              aria-hidden
                           />
                        </div>
                     )}
                  </motion.div>
               ) : (
                  <motion.img
                     key={
                        isOpeningImage
                           ? `morph-${currentKey}`
                           : `slide-${currentKey}`
                     }
                     src={displaySrc}
                     alt={currentFile?.name || "Photo"}
                     draggable={false}
                     className="graphand-lightbox-image"
                     initial={
                        isOpeningImage
                           ? imageInitial
                           : reduceMotion
                             ? {
                                  top: targetRect.top,
                                  left: targetRect.left,
                                  width: targetRect.width,
                                  height: targetRect.height,
                               }
                             : {
                                  opacity: 0,
                                  x: 40,
                                  top: targetRect.top,
                                  left: targetRect.left,
                                  width: targetRect.width,
                                  height: targetRect.height,
                               }
                     }
                     animate={{
                        opacity: 1,
                        x: 0,
                        scale: zoom,
                        top: targetRect.top + (zoom > 1.01 ? pan.y : 0),
                        left: targetRect.left + (zoom > 1.01 ? pan.x : 0),
                        width: targetRect.width,
                        height: targetRect.height,
                        borderRadius: 12,
                     }}
                     exit={
                        isOpeningImage && originRect
                           ? {
                                top: originRect.top,
                                left: originRect.left,
                                width: originRect.width,
                                height: originRect.height,
                                borderRadius: 8,
                                scale: 1,
                                opacity: 1,
                                x: 0,
                             }
                           : { opacity: 0, scale: 0.97 }
                     }
                     transition={{
                        duration,
                        ease: OPEN_EASE,
                     }}
                     onClick={(event) => event.stopPropagation()}
                     onWheel={handleWheel}
                     onDoubleClick={handleDoubleClick}
                     onPointerDown={handlePointerDown}
                     onPointerMove={handlePointerMove}
                     onPointerUp={handlePointerUp}
                     onPointerCancel={handlePointerUp}
                     onTouchStart={handleTouchStart}
                     onTouchMove={handleTouchMove}
                     onTouchEnd={handleTouchEnd}
                  />
               )}
            </>
         ) : null}
      </AnimatePresence>,
      document.body,
   );
}
