import {
  CheckIcon,
  DownloadIcon,
  LibraryIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react";

export type LibraryFilterId =
  | "all"
  | "downloading"
  | "completed"
  | "active"
  | "paused";

export const LIBRARY_FILTERS: { id: LibraryFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "downloading", label: "Downloading" },
  { id: "completed", label: "Completed" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
];

export const LIBRARY_FILTER_ICONS = {
  all: LibraryIcon,
  downloading: DownloadIcon,
  completed: CheckIcon,
  active: PlayIcon,
  paused: PauseIcon,
} as const;

export type LibraryChromeProps = {
  filter: LibraryFilterId;
  onFilterChange: (id: LibraryFilterId) => void;
  query: string;
  onQueryChange: (q: string) => void;
  counts: Record<LibraryFilterId, number>;
};

export const libraryChromeGlass = [
  "border border-white/20 bg-white/10",
  "shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]",
  "backdrop-blur-2xl backdrop-saturate-150",
].join(" ");

export const libraryChromeDenseGlass = [
  "rounded-2xl border border-white/20 bg-zinc-900/95",
  "shadow-[0_12px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.28)]",
  "backdrop-blur-2xl backdrop-saturate-150",
  "ring-0",
].join(" ");
