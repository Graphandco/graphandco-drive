"use client";

import { useEffect, useRef, useState } from "react";

import { MasonryDayLabel } from "@/components/drive/masonry-day-label";
import { cn } from "@/lib/utils";

const DEFAULT_ANCHOR_TOP = 72;

/**
 * Sticky relatif à la grille : in-flow au départ, fixe (centré sur la grille) au scroll.
 */
export function MasonryStickyDateBadge({
  label,
  rootRef,
  anchorTop = DEFAULT_ANCHOR_TOP,
}) {
  const sentinelRef = useRef(null);
  const badgeRef = useRef(null);
  const [state, setState] = useState({
    stuck: false,
    visible: true,
    centerX: 0,
    spacerHeight: 0,
  });

  useEffect(() => {
    if (!label) return;

    function update() {
      const root = rootRef.current;
      if (!root) return;

      const rootRect = root.getBoundingClientRect();
      const sentinelRect = sentinelRef.current?.getBoundingClientRect();
      const anchorY = sentinelRect?.top ?? rootRect.top;
      const badgeHeight = badgeRef.current?.offsetHeight ?? 24;

      const visible =
        rootRect.bottom > anchorTop + 4 && rootRect.top < window.innerHeight;

      if (!visible) {
        setState({
          stuck: false,
          visible: false,
          centerX: 0,
          spacerHeight: 0,
        });
        return;
      }

      const stuck = anchorY < anchorTop;
      setState({
        stuck,
        visible: true,
        centerX: rootRect.left + rootRect.width / 2,
        spacerHeight: stuck ? badgeHeight + 8 : 0,
      });
    }

    update();
    const raf = requestAnimationFrame(update);

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [label, rootRef, anchorTop]);

  if (!label) return null;

  return (
    <>
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden />
      {state.stuck ? (
        <div
          className="w-full"
          style={{ height: state.spacerHeight }}
          aria-hidden
        />
      ) : null}
      <div
        ref={badgeRef}
        className={cn(
          "pointer-events-none z-30 flex w-full justify-center pb-2 transition-opacity",
          state.stuck && "fixed -translate-x-1/2",
          !state.visible && "opacity-0",
        )}
        style={
          state.stuck
            ? { top: anchorTop, left: state.centerX }
            : undefined
        }
      >
        <MasonryDayLabel label={label} />
      </div>
    </>
  );
}
