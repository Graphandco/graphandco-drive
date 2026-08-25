export const RECENT_DAYS_COOKIE = "drive-recent-days";
export const DEFAULT_RECENT_DAYS = 30;

export const RECENT_DAYS_OPTIONS = [7, 14, 30, 60, 90, 180, 365];

export function resolveRecentDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_RECENT_DAYS;
  const rounded = Math.round(n);
  if (RECENT_DAYS_OPTIONS.includes(rounded)) return rounded;
  return Math.min(365, Math.max(1, rounded));
}

export function readRecentDaysCookie(cookieStore) {
  const value = cookieStore?.get?.(RECENT_DAYS_COOKIE)?.value;
  return resolveRecentDays(value);
}

/** Cookie côté client — 1 an */
export function writeRecentDaysCookie(days) {
  const resolved = resolveRecentDays(days);
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${RECENT_DAYS_COOKIE}=${resolved}; path=/; max-age=${maxAge}; samesite=lax`;
  return resolved;
}
