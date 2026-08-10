import { useEffect, useMemo, useState } from "react";
import {
  ChevronRightIcon,
  DownloadIcon,
  FolderIcon,
} from "lucide-react";

import { FileTypeIcon } from "@/lib/file-icon";
import {
  buildFileTree,
  type FileTreeNode,
} from "@/lib/torrent-file-tree";
import { cn } from "@/lib/utils";

type FlatFile = {
  name: string;
  size: number;
  progress: number;
};

function FileTreeNodeRow({
  node,
  depth,
  parentPath,
  openDirs,
  onToggle,
  formatBytes,
  onDownloadFile,
}: {
  node: FileTreeNode;
  depth: number;
  parentPath: string;
  openDirs: Set<string>;
  onToggle: (path: string) => void;
  formatBytes: (bytes: number) => string;
  onDownloadFile?: (path: string) => void;
}) {
  const path = parentPath ? `${parentPath}/${node.name}` : node.name;
  const pad = { paddingLeft: `${depth * 0.75 + 0.375}rem` };

  if (node.type === "file") {
    const fullName = path;
    const complete = node.progress >= 1;

    return (
      <li className="flex items-center gap-0.5" style={pad}>
        <div className="flex w-full min-w-0 flex-1 items-center gap-1.5 rounded-lg py-1 pr-1 text-left hover:bg-white/10">
          <FileTypeIcon path={node.name} className="size-3 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[0.625rem] text-white/90">
            {node.name}
          </span>
          <span className="shrink-0 text-[0.5625rem] tabular-nums text-white/40">
            {Math.round(node.progress * 100)}% · {formatBytes(node.size)}
          </span>
        </div>
        {onDownloadFile && complete ? (
          <button
            type="button"
            title="Download"
            aria-label={`Download ${node.name}`}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-emerald-400 transition-colors hover:bg-white/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDownloadFile(fullName);
            }}
          >
            <DownloadIcon className="size-3" />
          </button>
        ) : null}
      </li>
    );
  }

  const open = openDirs.has(path);
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(path)}
        className="flex w-full items-center gap-1 rounded-lg py-1 pr-1.5 text-left hover:bg-white/10"
        style={pad}
      >
        <ChevronRightIcon
          className={cn(
            "size-3 shrink-0 text-white/40 transition-transform",
            open && "rotate-90",
          )}
        />
        <FolderIcon className="size-3 shrink-0 text-amber-400/80" />
        <span className="min-w-0 flex-1 truncate text-[0.625rem] font-medium text-white/85">
          {node.name}
        </span>
        <span className="shrink-0 text-[0.5625rem] tabular-nums text-white/35">
          {node.children.length}
        </span>
      </button>
      {open ? (
        <ul>
          {node.children.map((child) => (
            <FileTreeNodeRow
              key={`${path}/${child.name}`}
              node={child}
              depth={depth + 1}
              parentPath={path}
              openDirs={openDirs}
              onToggle={onToggle}
              formatBytes={formatBytes}
              onDownloadFile={onDownloadFile}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function TorrentFileHierarchy({
  files,
  totalSize,
  formatBytes,
  loading = false,
  className,
  onDownloadFile,
}: {
  files: FlatFile[];
  totalSize: number;
  formatBytes: (bytes: number) => string;
  loading?: boolean;
  className?: string;
  /** Every file is downloadable when provided. */
  onDownloadFile?: (path: string) => void;
}) {
  const tree = useMemo(() => buildFileTree(files), [files]);
  const [openDirs, setOpenDirs] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const n of tree) {
      if (n.type === "dir") initial.add(n.name);
    }
    return initial;
  });

  useEffect(() => {
    const next = new Set<string>();
    for (const n of tree) {
      if (n.type === "dir") next.add(n.name);
    }
    setOpenDirs(next);
  }, [tree]);

  function toggle(path: string) {
    setOpenDirs((prev) => {
      const n = new Set(prev);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });
  }

  return (
    <div className={cn("flex min-h-0 flex-col gap-1", className)}>
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <p className="text-[0.5625rem] font-medium uppercase tracking-wide text-white/50">
          Files
        </p>
        <p className="text-[0.5625rem] tabular-nums text-white/40">
          {loading
            ? "Loading…"
            : `${files.length} · ${formatBytes(totalSize)}`}
        </p>
      </div>
      {loading && files.length === 0 ? (
        <p className="px-1 py-2 text-[0.625rem] text-white/40">Loading files…</p>
      ) : files.length === 0 ? (
        <p className="px-1 py-2 text-[0.625rem] text-white/40">
          No file info available
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {tree.map((node) => (
            <FileTreeNodeRow
              key={node.name}
              node={node}
              depth={0}
              parentPath=""
              openDirs={openDirs}
              onToggle={toggle}
              formatBytes={formatBytes}
              onDownloadFile={onDownloadFile}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
