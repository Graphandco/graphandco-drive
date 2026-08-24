"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { computeMasonryLayout, getMasonryColumnCount } from "@/lib/masonry";

export function useMasonry({ items, compact = false, gap = 12 }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry?.contentRect.width ?? 0);
    });

    observer.observe(element);
    setContainerWidth(element.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onResize() {
      setViewportWidth(window.innerWidth);
    }

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const columnCount = getMasonryColumnCount(compact, viewportWidth);

  const layout = useMemo(
    () =>
      computeMasonryLayout({
        items,
        columnCount,
        gap,
        containerWidth,
      }),
    [items, columnCount, gap, containerWidth],
  );

  return { containerRef, layout, columnCount };
}
