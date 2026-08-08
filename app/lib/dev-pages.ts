/** Meta exported from each `app/dev-pages/<slug>.tsx` for the DEV nav. */
export type DevPageMeta = {
  /** Short label for the bottom-right nav link. */
  label: string;
};

export type DevPageListItem = {
  path: string;
  label: string;
  slug: string;
};

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugFromGlobPath(file: string): string {
  const match = file.match(/\/([^/]+)\.tsx$/);
  return match?.[1] ?? file;
}

/**
 * Dev-only design / comparison pages under `app/dev-pages/*.tsx`.
 * Discovered via Vite glob — add or delete a file; no shared registry edits.
 */
export function getDevPages(): DevPageListItem[] {
  if (!import.meta.env.DEV) return [];

  const modules = import.meta.glob<{ label?: string }>("../dev-pages/*.tsx", {
    eager: true,
    import: "devPage",
  });

  return Object.entries(modules)
    .map(([file, meta]) => {
      const slug = slugFromGlobPath(file);
      if (!slug || slug.startsWith("_")) return null;
      return {
        slug,
        path: `/dev/${slug}`,
        label: meta?.label?.trim() || humanizeSlug(slug),
      };
    })
    .filter((page): page is DevPageListItem => page != null)
    .sort((a, b) => a.label.localeCompare(b.label));
}
