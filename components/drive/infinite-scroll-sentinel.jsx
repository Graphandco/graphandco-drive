"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

/** Sentinel IntersectionObserver pour charger la page suivante. */
export function InfiniteScrollSentinel({
  onVisible,
  loading = false,
  hasMore = false,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!hasMore) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onVisible?.();
        }
      },
      { rootMargin: "800px 0px", threshold: 0 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, onVisible]);

  if (!hasMore && !loading) return null;

  return (
    <div
      ref={ref}
      className="flex w-full items-center justify-center py-8"
      role="status"
      aria-live="polite"
    >
      {loading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : hasMore ? (
        <span className="sr-only">Charger plus</span>
      ) : null}
    </div>
  );
}
