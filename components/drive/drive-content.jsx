"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

import { DrivePanel } from "@/components/drive/drive-panel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { filterDriveItems } from "@/lib/drive-search";
import { folderHref, getSpaceConfig } from "@/lib/drive";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  filesPagination = null,
}) {
  const spaceConfig = getSpaceConfig(space);
  const folderId = folder?.id || spaceConfig.rootFolderId;
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery("");
  }, [folderId, view, space]);

  const filtered = useMemo(
    () => filterDriveItems(folders, files, query),
    [folders, files, query]
  );

  const showBreadcrumbs = view === "browse" && path.length > 0;
  const hasQuery = query.trim().length > 0;

  const resultCount = filtered.folders.length + filtered.files.length;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          {showBreadcrumbs ? (
            <div className="flex flex-col gap-1.5">
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
                              <Link href={folderHref(space, crumb.id)}>
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
              <p className="text-sm text-muted-foreground">
                {hasQuery ? (
                  <>
                    {resultCount} résultat{resultCount > 1 ? "s" : ""}
                  </>
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
        </div>

        <div className="relative ml-auto w-full shrink-0 sm:w-64 md:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher (nom, tags)…"
            aria-label="Rechercher par nom ou tags"
            className={cn("pl-8", hasQuery && "pr-8")}
          />
          {hasQuery ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DrivePanel
        folders={filtered.folders}
        files={filtered.files}
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
        filesPagination={filesPagination}
      />
    </div>
  );
}
