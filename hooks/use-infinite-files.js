"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { listFilesPaginated } from "@/actions";
import { FILES_PAGE_SIZE } from "@/lib/drive";

/**
 * Charge les fichiers page par page (galerie, smart folder, recherche, favoris).
 */
export function useInfiniteFiles({
  space,
  folderId = null,
  tag = null,
  imagesOnly = false,
  search = "",
  view = "browse",
  recentDays = null,
  favoritesOnly = false,
  initialFiles = [],
  initialPagination = null,
  enabled = false,
}) {
  const [files, setFiles] = useState(initialFiles);
  const [hasMore, setHasMore] = useState(initialPagination?.hasMore ?? false);
  const [total, setTotal] = useState(
    initialPagination?.total ?? initialFiles.length
  );
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const loadingRef = useRef(false);
  const offsetRef = useRef(initialFiles.length);
  const pageLimit = initialPagination?.limit ?? FILES_PAGE_SIZE;

  const normalizedSearch = String(search || "").trim();
  const hasSearch = Boolean(normalizedSearch);
  const needsServerFetch = hasSearch || favoritesOnly;

  useEffect(() => {
    if (!enabled || needsServerFetch) return;

    setFiles(initialFiles);
    setHasMore(initialPagination?.hasMore ?? false);
    setTotal(initialPagination?.total ?? initialFiles.length);
    offsetRef.current = initialFiles.length;
  }, [
    enabled,
    needsServerFetch,
    initialFiles,
    initialPagination,
    space,
    folderId,
    tag,
    imagesOnly,
    view,
    recentDays,
    favoritesOnly,
  ]);

  useEffect(() => {
    if (!enabled || !needsServerFetch) return;

    let cancelled = false;

    async function fetchFilteredPage() {
      loadingRef.current = true;
      setSearching(true);
      setFiles([]);
      setHasMore(false);
      offsetRef.current = 0;

      try {
        const result = await listFilesPaginated({
          space,
          folderId: tag ? null : folderId,
          tag: tag || null,
          imagesOnly,
          search: hasSearch ? normalizedSearch : null,
          view,
          recentDays,
          favoritesOnly,
          limit: pageLimit,
          offset: 0,
        });

        if (cancelled) return;

        if (!result.success) {
          setFiles([]);
          setHasMore(false);
          setTotal(0);
          return;
        }

        const next = result.data || [];
        setFiles(next);
        offsetRef.current = next.length;
        setHasMore(result.pagination?.hasMore ?? false);
        setTotal(result.pagination?.total ?? next.length);
      } finally {
        if (!cancelled) {
          loadingRef.current = false;
          setSearching(false);
        }
      }
    }

    fetchFilteredPage();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    needsServerFetch,
    hasSearch,
    normalizedSearch,
    space,
    folderId,
    tag,
    imagesOnly,
    pageLimit,
    view,
    recentDays,
    favoritesOnly,
  ]);

  const loadMore = useCallback(async () => {
    if (!enabled || loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const result = await listFilesPaginated({
        space,
        folderId: tag ? null : folderId,
        tag: tag || null,
        imagesOnly,
        search: hasSearch ? normalizedSearch : null,
        view,
        recentDays,
        favoritesOnly,
        limit: pageLimit,
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
      setTotal(result.pagination?.total ?? offsetRef.current);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [
    enabled,
    hasMore,
    hasSearch,
    normalizedSearch,
    space,
    folderId,
    tag,
    imagesOnly,
    pageLimit,
    view,
    recentDays,
    favoritesOnly,
  ]);

  return {
    files,
    hasMore,
    total,
    loading,
    searching,
    loadMore,
    setFiles,
  };
}
