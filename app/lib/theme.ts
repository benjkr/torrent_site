/** App is dark-only. Keeps `.dark` on <html> for existing `dark:` utilities. */

export type Theme = "dark";

export function applyTheme() {
  document.documentElement.classList.add("dark");
}

/** Inline head script: force dark before paint. */
export const THEME_INIT_SCRIPT =
  '(function(){document.documentElement.classList.add("dark")})();';
