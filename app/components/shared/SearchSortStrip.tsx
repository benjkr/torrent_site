import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ApiItem } from "@/lib/types";

export type SearchSortKey = "seeders" | "size" | "age" | "name";
export type SearchSortDir = "desc" | "asc";

const SORT_OPTIONS: { key: SearchSortKey; label: string }[] = [
  { key: "seeders", label: "Seeders" },
  { key: "size", label: "Size" },
  { key: "age", label: "Age" },
  { key: "name", label: "Name" },
];

function sortValue(item: ApiItem, key: SearchSortKey): number | string {
  switch (key) {
    case "seeders":
      return +item.seeders || 0;
    case "size":
      return +item.size || 0;
    case "age":
      return +item.added || 0;
    case "name":
      return item.name.toLowerCase();
  }
}

export function sortSearchItems(
  items: ApiItem[],
  key: SearchSortKey,
  dir: SearchSortDir,
): ApiItem[] {
  const mult = dir === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv) * mult;
    }
    return ((av as number) - (bv as number)) * mult;
  });
}

export function defaultSortDir(key: SearchSortKey): SearchSortDir {
  return key === "name" ? "asc" : "desc";
}

export default function SearchSortStrip({
  sortKey,
  sortDir,
  onChange,
  className,
}: {
  sortKey: SearchSortKey;
  sortDir: SearchSortDir;
  onChange: (key: SearchSortKey, dir: SearchSortDir) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-0.5 rounded-full border border-white/20 p-0.5",
        "bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md",
        className,
      )}
      role="group"
      aria-label="Sort results"
    >
      {SORT_OPTIONS.map((opt) => {
        const on = sortKey === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            title={
              on
                ? `${opt.label} (${sortDir === "desc" ? "descending" : "ascending"}) — click to flip`
                : `Sort by ${opt.label}`
            }
            onClick={() => {
              if (on) {
                onChange(opt.key, sortDir === "desc" ? "asc" : "desc");
              } else {
                onChange(opt.key, defaultSortDir(opt.key));
              }
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium transition-colors",
              on
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
            {on ? (
              sortDir === "desc" ? (
                <ArrowDownIcon className="size-3 shrink-0" aria-hidden />
              ) : (
                <ArrowUpIcon className="size-3 shrink-0" aria-hidden />
              )
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
