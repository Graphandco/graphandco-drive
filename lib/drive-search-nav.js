import { mockBuckets } from "@/config/user";
import { bucketFromPathname } from "@/lib/bucket";
import { getSpaceConfig } from "@/lib/drive";

export function readSearchQuery(searchParams) {
  return String(searchParams?.get?.("q") || "").trim();
}

export function readGlobalSearch(searchParams) {
  const value = searchParams?.get?.("global");
  return value === "1" || value === "true";
}

export function resolveDriveSearchContext(pathname, searchParams, rememberedSpace) {
  const bucket = bucketFromPathname(pathname, mockBuckets);
  const space = bucket?.space || rememberedSpace || "regis";
  const config = getSpaceConfig(space);

  const hasSmart = Boolean(searchParams?.get?.("smart"));
  const hasFavorites =
    searchParams?.get?.("favorites") === "1" ||
    searchParams?.get?.("favorites") === "true";
  const folderParam = searchParams?.get?.("folder");
  const folderId = folderParam ? Number(folderParam) : config.rootFolderId;

  const onBrowsePage = Boolean(bucket) && !hasSmart && !hasFavorites;
  const isSubfolder =
    onBrowsePage &&
    folderParam &&
    Number(folderParam) !== Number(config.rootFolderId);

  return {
    space,
    bucketBasePath: config.basePath,
    onBrowsePage,
    showGlobalToggle: Boolean(isSubfolder),
    folderId,
    pathname: bucket?.url || config.basePath,
  };
}

export function buildBrowseSearchUrl(pathname, searchParams, { q = "", globalSearch = false, showGlobalToggle = false }) {
  const params = new URLSearchParams(searchParams?.toString?.() || "");

  const trimmed = String(q || "").trim();
  if (trimmed) {
    params.set("q", trimmed);
  } else {
    params.delete("q");
  }

  if (showGlobalToggle && globalSearch) {
    params.set("global", "1");
  } else {
    params.delete("global");
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
