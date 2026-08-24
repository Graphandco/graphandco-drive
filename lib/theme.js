export const THEME_COOKIE = "drive-theme";
export const DEFAULT_THEME = "actuel";

export const THEMES = [
   {
      id: "actuel",
      name: "Actuel",
      description: "Brume teal sur fond sombre",
   },
   {
      id: "aurora",
      name: "Aurora Beams",
      description: "Faisceaux atmosphériques",
   },
   {
      id: "smokeveil",
      name: "Smokeveil",
      description: "Voile bleu indigo + grain",
   },
   {
      id: "bloodmoon",
      name: "Blood Moon",
      description: "Nébuleuse rouge sang",
   },
   {
      id: "steelspectrum",
      name: "Steel Spectrum",
      description: "Prisme acier gris-bleu",
   },
];

export function isThemeId(value) {
   return THEMES.some((theme) => theme.id === value);
}

export function resolveTheme(value) {
   return isThemeId(value) ? value : DEFAULT_THEME;
}

export function readThemeCookie(cookieStore) {
   const value = cookieStore?.get?.(THEME_COOKIE)?.value;
   return resolveTheme(value);
}

/** Cookie côté client — 1 an */
export function writeThemeCookie(themeId) {
   const theme = resolveTheme(themeId);
   const maxAge = 60 * 60 * 24 * 365;
   document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${maxAge}; samesite=lax`;
   return theme;
}
