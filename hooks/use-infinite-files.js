"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { listFilesPaginated } from "@/actions";

/**
 * Charge les fichiers page par page (galerie accueil Régis).
 */
export function useInfiniteFiles({
  space,
  folderId = null,
  initialFiles = [],
  initialPagination = null,
  enabled = false,
}) {
  const [files, setFiles] = useState(initialFiles);
  const [hasMore, setHasMore] = useState(
    initialPagination?.hasMore ?? false
  );
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const offsetRef = useRef(initialFiles.length);

  useEffect(() => {
    setFiles(initialFiles);
    setHasMore(initialPagination?.hasMore ?? false);
    offsetRef.current = initialFiles.length;
  }, [initialFiles, initialPagination, space, folderId]);

  const loadMore = useCallback(async () => {
    if (!enabled || loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const result = await listFilesPaginated({
        space,
        folderId,
        limit: initialPagination?.limit,
        offset: offsetRef.current,
      });

      if (!result.success) return;

      const next = result.data || [];
      offsetRef.current += next.length;
      setFiles((current) => {
        const seen = new Set(current.map((file) => file.id));
        const merged = [...current];
        for (const file of next) {
          if (!seen.has(file.id)) {
            merged.push(file);
            seen.add(file.id);
          }
        }
        return merged;
      });
      setHasMore(result.pagination?.hasMore ?? false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [enabled, hasMore, space, folderId, initialPagination?.limit]);

  return { files, hasMore, loading, loadMore, setFiles };
}
