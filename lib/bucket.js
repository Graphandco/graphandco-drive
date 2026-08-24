export const BUCKET_COOKIE = "drive-bucket";
export const DEFAULT_BUCKET = "regis";

export function bucketFromPathname(pathname, buckets = []) {
  if (!pathname) return null;
  return (
    buckets.find(
      (bucket) =>
        pathname === bucket.url || pathname.startsWith(`${bucket.url}/`)
    ) || null
  );
}

export function bucketFromSpace(space, buckets = []) {
  if (!space) return null;
  return buckets.find((bucket) => bucket.space === space) || null;
}

export function resolveBucket(buckets, pathname, rememberedSpace) {
  return (
    bucketFromPathname(pathname, buckets) ||
    bucketFromSpace(rememberedSpace, buckets) ||
    buckets[0] ||
    null
  );
}

export function readBucketCookie(cookieStore) {
  return cookieStore?.get?.(BUCKET_COOKIE)?.value || null;
}

/** Cookie côté client — 1 an */
export function writeBucketCookie(space) {
  if (!space || typeof document === "undefined") return space;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${BUCKET_COOKIE}=${encodeURIComponent(space)}; path=/; max-age=${maxAge}; samesite=lax`;
  return space;
}
