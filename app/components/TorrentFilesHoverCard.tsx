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

/** Dense glass (A2) is production default; legacy only via DEV debug flag. */
export type TorrentFilesViewerStyle = "dense-glass" | "legacy";

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
  glass,
}: {
  progress: number | null;
  fileName: string;
  onDownloadFile?: (fileName: string) => void;
  glass: boolean;
}) {
  if (progress == null || !onDownloadFile) return null;
  if (progress >= 100) {
    return (
      <button
        type="button"
        title="Download"
        aria-label={`Download ${fileName}`}
        className={cn(
          "inline-flex size-5 cursor-pointer items-center justify-center rounded-md transition-colors",
          glass
            ? "text-emerald-400 hover:bg-white/10"
            : "text-emerald-600 hover:bg-emerald-500/15",
        )}
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
    <span
      className={cn(
        "w-7 text-right text-[0.5625rem] tabular-nums",
        glass ? "text-white/50" : "text-muted-foreground",
      )}
    >
      {progress}%
    </span>
  );
}

/** Previous flat popover list — DEV rollback only. */
function LegacyFileList({
  files,
  formatBytes = defaultFormatBytes,
  onDownloadFile,
}: {
  files: TorrentFileListItem[];
  formatBytes?: (bytes: number) => string;
  onDownloadFile?: (fileName: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {files.map((file, index) => {
        const progress =
          file.progress != null ? Math.round(file.progress * 100) : null;

        return (
          <li
            key={`${file.name}-${index}`}
            className="flex items-center justify-between gap-2 text-[0.6875rem] leading-tight"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <FileTypeIcon path={file.name} />
              <span className="truncate font-mono" title={file.name}>
                {file.name}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {file.size != null && (
                <span className="text-muted-foreground tabular-nums">
                  {formatBytes(file.size)}
                </span>
              )}
              <StatusAction
                progress={progress}
                fileName={file.name}
                onDownloadFile={onDownloadFile}
                glass={false}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** A2 dense glass file list. */
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
                glass
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
  /** DEV-only comparison; production always uses dense-glass. */
  viewerStyle = "dense-glass",
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
  viewerStyle?: TorrentFilesViewerStyle;
}) {
  if (fileCount === 0 && !loading && !awaitingFiles && files.length === 0) {
    return <span className="tabular-nums">{emptyLabel}</span>;
  }

  const showLoading =
    loading ||
    awaitingFiles ||
    (files.length === 0 && (fileCount ?? 0) > 0);

  const effectiveStyle: TorrentFilesViewerStyle = import.meta.env.DEV
    ? viewerStyle
    : "dense-glass";
  const glass = effectiveStyle === "dense-glass";

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
        className={
          glass
            ? denseGlassContent
            : "max-h-52 w-72 overflow-auto p-2"
        }
      >
        {showLoading ? (
          <div
            className={cn(
              "py-1 text-center text-xs",
              glass ? "text-white/50" : "text-muted-foreground",
            )}
          >
            Loading files...
          </div>
        ) : files.length > 0 ? (
          glass ? (
            <DenseGlassFileList
              files={files}
              formatBytes={formatBytes}
              onDownloadFile={onDownloadFile}
            />
          ) : (
            <LegacyFileList
              files={files}
              formatBytes={formatBytes}
              onDownloadFile={onDownloadFile}
            />
          )
        ) : (
          <div
            className={cn(
              "py-1 text-center text-xs",
              glass ? "text-white/50" : "text-muted-foreground",
            )}
          >
            No file info available
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
