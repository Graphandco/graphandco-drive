"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { DrivePanel } from "@/components/drive/drive-panel";
import { useDriveHeaderSearch } from "@/components/drive/drive-search-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { filterDriveItems } from "@/lib/drive-search";
import {
  folderHref,
  favoritesHref,
  getSpaceConfig,
  smartFolderHref,
} from "@/lib/drive";
import { formatBytes } from "@/lib/format";

export function DriveContent({
  space = "sixmyk",
  view = "browse",
  path = [],
  stats = { fileCount: 0, totalBytes: 0 },
  folders = [],
  files = [],
  folder = null,
  openFileId,
  error = null,
  galleryMode = false,
  smartFolderMode = false,
  smartFolder = null,
  favoritesMode = false,
  filesPagination = null,
  recentDays = null,
}) {
  const spaceConfig = getSpaceConfig(space);
  const folderId = folder?.id || spaceConfig.rootFolderId;
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [searchMeta, setSearchMeta] = useState({
    total: null,
    searching: false,
  });

  const crossSpaceMode =
    view === "recent" ||
    view === "orphans" ||
    view === "untagged" ||
    view === "duplicates";
  const folderBrowseMode =
    view === "browse" && !galleryMode && !smartFolderMode && !favoritesMode;

  const searchPlaceholder = folderBrowseMode
    ? "Rechercher dans ce dossier…"
    : galleryMode || smartFolderMode || favoritesMode
      ? "Rechercher dans la galerie…"
      : "Rechercher (nom, tags)…";

  useDriveHeaderSearch({
    enabled: folderBrowseMode,
    query,
    setQuery,
    placeholder: searchPlaceholder,
  });

  useEffect(() => {
    setQuery("");
    setSearchMeta({ total: null, searching: false });
  }, [folderId, view, space, smartFolder?.id, favoritesMode]);

  const filtered = useMemo(
    () => filterDriveItems(folders, files, query),
    [folders, files, query]
  );

  const showBreadcrumbs = view === "browse" && path.length > 0;
  const hasQuery = query.trim().length > 0;
  const showPageMeta =
    crossSpaceMode || showBreadcrumbs || (folderBrowseMode && hasQuery);
  const folderServerSearch =
    folderBrowseMode && debouncedQuery.trim().length > 0;
  const folderBrowseInfinite =
    folderBrowseMode && !folderServerSearch;
  const infiniteBrowse =
    crossSpaceMode ||
    galleryMode ||
    smartFolderMode ||
    favoritesMode ||
    folderBrowseInfinite ||
    folderServerSearch;
  const usesServerSearch =
    hasQuery && infiniteBrowse && debouncedQuery.trim().length > 0;
  const isSearchPending =
    hasQuery &&
    infiniteBrowse &&
    (query.trim() !== debouncedQuery.trim() || searchMeta.searching);

  const resultCount =
    usesServerSearch && searchMeta.total != null
      ? searchMeta.total
      : filtered.folders.length + filtered.files.length;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {showPageMeta ? (
        <div className="flex flex-col gap-1.5">
          {showBreadcrumbs ? (
            <Breadcrumb>
              <BreadcrumbList>
                {path.map((crumb, index) => {
                  const isLast = index === path.length - 1;
                  return (
                    <span key={crumb.id} className="contents">
                      {index > 0 ? <BreadcrumbSeparator /> : null}
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link
                              href={
                                crumb.favorites
                                  ? favoritesHref(space)
                                  : crumb.smartFolderId
                                    ? smartFolderHref(space, crumb.smartFolderId)
                                    : folderHref(space, crumb.id)
                              }
                            >
                              {crumb.name}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </span>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          ) : view === "recent" ? (
            <p className="text-sm font-medium">
              {recentDays
                ? `Modifiés dans les ${recentDays} derniers jours`
                : "Tous espaces confondus"}
            </p>
          ) : view === "orphans" ? (
            <p className="text-sm font-medium">
              Fichiers non liés à un dossier
            </p>
          ) : view === "untagged" ? (
            <p className="text-sm font-medium">Fichiers sans aucun tag</p>
          ) : view === "duplicates" ? (
            <p className="text-sm font-medium">
              Fichiers en double (même espace, nom et taille)
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {hasQuery ? (
              isSearchPending ? (
                <>Recherche…</>
              ) : (
                <>
                  {resultCount} résultat{resultCount > 1 ? "s" : ""}
                </>
              )
            ) : (
              <>
                {stats.fileCount} fichier
                {stats.fileCount > 1 ? "s" : ""}
                <span className="mx-1.5 text-white/20">·</span>
                {formatBytes(stats.totalBytes)}
              </>
            )}
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DrivePanel
        folders={folders}
        files={files}
        searchQuery={query}
        debouncedSearchQuery={debouncedQuery}
        onSearchMetaChange={setSearchMeta}
        view={view}
        space={space}
        folderId={folderId}
        folderName={folder?.name}
        isRootFolder={
          Number(folderId) === Number(spaceConfig.rootFolderId)
        }
        openFileId={openFileId}
        trashCount={folders.length + files.length}
        galleryMode={galleryMode}
        smartFolderMode={smartFolderMode}
        smartFolder={smartFolder}
        favoritesMode={favoritesMode}
        filesPagination={filesPagination}
        crossSpaceMode={crossSpaceMode}
        recentDays={recentDays}
      />
    </div>
  );
}
