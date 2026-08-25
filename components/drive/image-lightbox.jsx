"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

import { getFilePreviewUrl } from "@/actions";
import { getCachedThumbnailUrl } from "@/lib/thumbnail-loader";
import { cn } from "@/lib/utils";

import "./image-lightbox.css";

const PLACEHOLDER_SRC =
   "data:image/svg+xml," +
   encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100%" height="100%" fill="#0a0a0a"/></svg>`,
   );

function thumbnailCacheKey(file) {
   return `${file.id}:${file.thumbnail_key || file.storage_key || ""}`;
}

function resolveFallbackSrc(file) {
   if (!file?.id) return PLACEHOLDER_SRC;
   return getCachedThumbnailUrl(thumbnailCacheKey(file)) || PLACEHOLDER_SRC;
}

const LIGHTBOX_BACKDROP_Z = 9998;

function LightboxBackdrop({ open }) {
   const [mounted, setMounted] = useState(false);
   const [visible, setVisible] = useState(false);
   const backdropRef = useRef(null);

   useEffect(() => {
      setMounted(true);
   }, []);

   useEffect(() => {
      if (!open) {
         setVisible(false);
         return;
      }

      setVisible(false);
      const frame = requestAnimationFrame(() => {
         setVisible(true);
      });
      return () => cancelAnimationFrame(frame);
   }, [open]);

   useEffect(() => {
      if (!open) return;
      const node = backdropRef.current;
      if (!node) return;

      const keepBackdropActive = () => {
         node.removeAttribute("inert");
         node.removeAttribute("aria-hidden");
      };

      keepBackdropActive();
      const observer = new MutationObserver(keepBackdropActive);
      observer.observe(node, { attributes: true, attributeFilter: ["inert", "aria-hidden"] });
      return () => observer.disconnect();
   }, [open]);

   if (!mounted || !open) return null;

   return createPortal(
      <div
         ref={backdropRef}
         aria-hidden
         className={cn(
            "graphand-lightbox-backdrop",
            visible && "graphand-lightbox-backdrop--open",
         )}
      />,
      document.body,
   );
}

function LightboxCloseButton({ onClose }) {
   return (
      <button
         type="button"
         onClick={onClose}
         aria-label="Fermer"
         className={cn(
            "graphand-lightbox__close-zone group flex size-32 cursor-pointer items-center justify-center",
            "border-0 bg-transparent p-0 outline-none",
            "rounded-full focus-visible:ring-2 focus-visible:ring-white/25",
            "max-sm:size-36",
         )}
      >
         <span
            aria-hidden
            className={cn(
               "flex size-12 items-center justify-center rounded-full",
               "text-white/90 transition-colors duration-150",
               "group-hover:bg-red-950 group-hover:text-white",
               "max-sm:size-14",
            )}
         >
            <X className="size-4 shrink-0" strokeWidth={2.25} />
         </span>
      </button>
   );
}

/**
 * Lightbox 90 % viewport : image centrée, swipe, zoom pinch/double-tap.
 */
export function ImageLightbox({
   open,
   index = 0,
   images = [],
   seed = null,
   onClose,
   onIndexChange,
}) {
   const [urls, setUrls] = useState(() => new Map());
   const urlsRef = useRef(urls);
   const fetchingRef = useRef(new Set());
   const indexRef = useRef(index);

   useEffect(() => {
      urlsRef.current = urls;
   }, [urls]);

   useEffect(() => {
      indexRef.current = index;
   }, [index]);

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
      for (let offset = -1; offset <= 2; offset += 1) {
         const i = index + offset;
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

   const slides = useMemo(
      () =>
         images.map((file) => {
            const key = String(file.id);
            const src = urls.get(key) || resolveFallbackSrc(file);
            return {
               src,
               alt: file.name || "Photo",
               width: file.width_px || undefined,
               height: file.height_px || undefined,
            };
         }),
      [images, urls],
   );

   const safeIndex = Math.min(
      Math.max(0, index),
      Math.max(0, slides.length - 1),
   );

   const handleOverlayClick = useCallback(
      (event) => {
         const target = event.target;
         if (!(target instanceof HTMLElement)) return;
         if (target.closest(".yarl__container")) return;
         onClose?.();
      },
      [onClose],
   );

   const isOpen = open && slides.length > 0;

   return (
      <>
      <LightboxBackdrop open={isOpen} />
      <Lightbox
         open={isOpen}
         close={onClose}
         index={safeIndex}
         slides={slides}
         plugins={[Zoom]}
         carousel={{
            finite: true,
            preload: 2,
            padding: "0px",
            spacing: "16px",
            imageFit: "contain",
         }}
         animation={{
            fade: 220,
            swipe: 380,
            easing: {
               fade: "ease",
               swipe: "cubic-bezier(0.22, 1, 0.36, 1)",
               navigation: "cubic-bezier(0.22, 1, 0.36, 1)",
            },
         }}
         controller={{
            closeOnBackdropClick: false,
            closeOnPullDown: true,
            closeOnEscape: true,
         }}
         portal={{
            container: {
               onClick: handleOverlayClick,
            },
         }}
         zoom={{
            maxZoomPixelRatio: 4,
            scrollToZoom: true,
            doubleClickMaxStops: 2,
         }}
         toolbar={{
            buttons: ["close"],
         }}
         render={{
            buttonClose: () => <LightboxCloseButton onClose={onClose} />,
            buttonZoom: () => null,
            buttonPrev: slides.length <= 1 ? () => null : undefined,
            buttonNext: slides.length <= 1 ? () => null : undefined,
            iconLoading: () => (
               <span
                  className={cn(
                     "inline-block size-8 animate-spin rounded-full",
                     "border-2 border-white/25 border-t-white",
                  )}
                  aria-hidden
               />
            ),
         }}
         labels={{
            Close: "Fermer",
            Next: "Suivante",
            Previous: "Précédente",
            ZoomIn: "Zoom avant",
            ZoomOut: "Zoom arrière",
         }}
         className="graphand-lightbox"
         styles={{
            root: { zIndex: LIGHTBOX_BACKDROP_Z + 1 },
         }}
         on={{
            view: ({ index: nextIndex }) => {
               if (nextIndex === indexRef.current) return;
               onIndexChange?.(nextIndex);
               const file = images[nextIndex];
               if (file) ensurePreview(file);
            },
         }}
      />
      </>
   );
}
