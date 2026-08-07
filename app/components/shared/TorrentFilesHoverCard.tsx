import { FilesIcon, ChevronDownIcon, DownloadIcon } from "lucide-react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { FileTypeIcon } from "@/lib/file-icon";
import { cn, formatBytes as defaultFormatBytes } from "@/lib/utils";

export type TorrentFileListItem = {
  name: string;
  size?: number | null;
  progress?: number;
};

function fileNameFromUnknown(name: unknown, index: number): string {
  if (Array.isArray(name)) return String(name[0] ?? `File ${index + 1}`);
  if (typeof name === "string" && name) return name;
  return `File ${index + 1}`;
}

export function normalizeTorrentFiles(files: unknown[]): TorrentFileListItem[] {
  return files.map((file, index) => {
    const entry = file as {
      name?: unknown;
      size?: unknown;
      progress?: unknown;
    };

    return {
      name: fileNameFromUnknown(entry.name, index),
      size: entry.size != null ? Number(entry.size) : undefined,
      progress: entry.progress != null ? Number(entry.progress) : undefined,
    };
  });
}

function baseName(path: string) {
  return path.split(/[/\\]/).pop() ?? path;
}

function totalSizeLabel(
  files: TorrentFileListItem[],
  formatBytes: (bytes: number) => string,
) {
  const total = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
  return formatBytes(total);
}

function StatusAction({
  progress,
  fileName,
  onDownloadFile,
}: {
  progress: number | null;
  fileName: string;
  onDownloadFile?: (fileName: string) => void;
}) {
  if (progress == null || !onDownloadFile) return null;
  if (progress >= 100) {
    return (
      <button
        type="button"
        title="Download"
        aria-label={`Download ${fileName}`}
        className="inline-flex size-5 cursor-pointer items-center justify-center rounded-md text-emerald-400 transition-colors hover:bg-white/10"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDownloadFile(fileName);
        }}
      >
        <DownloadIcon className="size-3" />
      </button>
    );
  }
  return (
    <span className="w-7 text-right text-[0.5625rem] tabular-nums text-white/50">
      {progress}%
    </span>
  );
}

function DenseGlassFileList({
  files,
  formatBytes = defaultFormatBytes,
  onDownloadFile,
}: {
  files: TorrentFileListItem[];
  formatBytes?: (bytes: number) => string;
  onDownloadFile?: (fileName: string) => void;
}) {
  return (
    <>
      <div className="mb-1 flex items-center justify-between px-1.5 pt-0.5">
        <span className="text-[0.5625rem] font-medium uppercase tracking-wide text-white/50">
          {files.length} file{files.length !== 1 ? "s" : ""}
        </span>
        <span className="text-[0.5625rem] tabular-nums text-white/40">
          {totalSizeLabel(files, formatBytes)}
        </span>
      </div>
      <ul className="max-h-48 overflow-auto">
        {files.map((file, index) => {
          const progress =
            file.progress != null ? Math.round(file.progress * 100) : null;

          return (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/10"
            >
              <FileTypeIcon path={file.name} className="size-3 shrink-0" />
              <span
                className="min-w-0 flex-1 truncate text-[0.625rem] text-white/90"
                title={file.name}
              >
                {baseName(file.name)}
              </span>
              {file.size != null ? (
                <span className="shrink-0 text-[0.5625rem] tabular-nums text-white/40">
                  {formatBytes(file.size)}
                </span>
              ) : null}
              <StatusAction
                progress={progress}
                fileName={file.name}
                onDownloadFile={onDownloadFile}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function triggerLabel(
  fileCount: number | null | undefined,
  loading: boolean,
): string {
  if (fileCount != null) {
    return `${fileCount} file${fileCount !== 1 ? "s" : ""}`;
  }
  if (loading) return "Loading…";
  return "Files";
}

const denseGlassContent = cn(
  "max-h-56 w-72 overflow-hidden p-1.5",
  "rounded-2xl border border-white/20 bg-zinc-900/80 text-white",
  "shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.28)]",
  "backdrop-blur-2xl backdrop-saturate-150",
  "ring-0",
);

export function TorrentFilesHoverCard({
  fileCount,
  loading = false,
  awaitingFiles = false,
  files,
  onHover,
  formatBytes,
  onDownloadFile,
  triggerClassName,
  emptyLabel = "0 files",
}: {
  fileCount?: number | null;
  loading?: boolean;
  awaitingFiles?: boolean;
  files: TorrentFileListItem[];
  onHover?: () => void;
  formatBytes?: (bytes: number) => string;
  onDownloadFile?: (fileName: string) => void;
  triggerClassName?: string;
  emptyLabel?: string;
}) {
  if (fileCount === 0 && !loading && !awaitingFiles && files.length === 0) {
    return <span className="tabular-nums">{emptyLabel}</span>;
  }

  const showLoading =
    loading ||
    awaitingFiles ||
    (files.length === 0 && (fileCount ?? 0) > 0);

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={120}
        closeDelay={80}
        onMouseEnter={onHover}
        className={cn(
          "inline-flex cursor-default items-center gap-1 text-xs transition-colors hover:text-foreground",
          triggerClassName,
        )}
      >
        <FilesIcon className="size-3 shrink-0" />
        <span className="truncate tabular-nums">
          {triggerLabel(fileCount, loading)}
        </span>
        <ChevronDownIcon className="size-2.5 shrink-0 opacity-60" />
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        className={denseGlassContent}
      >
        {showLoading ? (
          <div className="py-1 text-center text-xs text-white/50">
            Loading files...
          </div>
        ) : files.length > 0 ? (
          <DenseGlassFileList
            files={files}
            formatBytes={formatBytes}
            onDownloadFile={onDownloadFile}
          />
        ) : (
          <div className="py-1 text-center text-xs text-white/50">
            No file info available
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
