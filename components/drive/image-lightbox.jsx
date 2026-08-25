"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Share2,
  X,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shareOrDownloadFile } from "@/lib/share-file";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

export function ImageLightbox({
  open,
  src,
  title,
  fileId,
  mimeType,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [sharing, setSharing] = useState(false);
  const dragRef = useRef(null);

  const resetView = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!open) return;
    resetView();
  }, [open, src, resetView]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event) {
      if (event.key === "ArrowLeft" && hasPrev) {
        event.preventDefault();
        onPrev?.();
      }
      if (event.key === "ArrowRight" && hasNext) {
        event.preventDefault();
        onNext?.();
      }
      if (event.key === "+" || event.key === "=") {
        setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP));
      }
      if (event.key === "-") {
        setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP));
      }
      if (event.key === "0") resetView();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, resetView, hasPrev, hasNext, onPrev, onNext]);

  async function onShare() {
    if (fileId == null || sharing) return;
    setSharing(true);
    try {
      const result = await shareOrDownloadFile({
        fileId,
        fileName: title,
        mimeType,
      });
      if (result.method === "download") {
        toast.success("Partage indisponible — téléchargement lancé");
      }
    } catch (error) {
      toast.error(error?.message || "Partage impossible.");
    } finally {
      setSharing(false);
    }
  }

  function onWheel(event) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((value) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value + delta));
      if (next === MIN_ZOOM) setOffset({ x: 0, y: 0 });
      return next;
    });
  }

  function onPointerDown(event) {
    if (zoom <= MIN_ZOOM) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  }

  function onPointerMove(event) {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setOffset({
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/85"
        className="flex h-[min(92vh,900px)] w-[min(96vw,1100px)] max-w-none flex-col gap-0 overflow-hidden border-white/10 bg-[#14110e] p-0 text-white sm:max-w-none"
      >
        <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-white/10 px-4 py-3 text-left">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-sm font-medium text-white">
              {title || "Aperçu"}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              {Math.round(zoom * 100)}% — flèches pour naviguer, +/− pour zoomer
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {fileId != null ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={sharing}
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={onShare}
                aria-label="Partager"
                title="Partager"
              >
                <Share2 />
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() =>
                setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))
              }
              aria-label="Zoom arrière"
            >
              <Minus />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() =>
                setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))
              }
              aria-label="Zoom avant"
            >
              <Plus />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={resetView}
              aria-label="Réinitialiser le zoom"
            >
              <RotateCcw />
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="ml-2 size-14 rounded-md text-white hover:bg-white/10 hover:text-white [&_svg]:size-10"
                aria-label="Fermer"
              >
                <X strokeWidth={2.25} />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div
          className={cn(
            "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden",
            zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
          )}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => {
            if (zoom > 1) resetView();
            else setZoom(2);
          }}
        >
          {hasPrev ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onPrev}
              aria-label="Image précédente"
              className="absolute left-3 top-1/2 z-20 size-14 -translate-y-1/2 rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur-sm hover:bg-black/75 hover:text-white [&_svg]:size-9"
            >
              <ChevronLeft strokeWidth={2.5} />
            </Button>
          ) : null}

          {hasNext ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onNext}
              aria-label="Image suivante"
              className="absolute right-3 top-1/2 z-20 size-14 -translate-y-1/2 rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur-sm hover:bg-black/75 hover:text-white [&_svg]:size-9"
            >
              <ChevronRight strokeWidth={2.5} />
            </Button>
          ) : null}

          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={title || "Aperçu"}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-75"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              }}
            />
          ) : null}
          {zoom === 1 ? (
            <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/80">
              <ZoomIn className="size-3.5" />
              Molette ou double-clic pour zoomer
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
