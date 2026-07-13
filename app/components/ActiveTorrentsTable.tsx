import { useState } from "react";
import { formatDuration, intervalToDuration } from "date-fns";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TorrentInfo, FileInfo } from "../lib/types";

interface ActiveTorrentsTableProps {
  torrents: TorrentInfo[];
  isPolling: boolean;
  onTogglePolling: (v: boolean) => void;
  onRefresh: () => void;
  filesMap: Record<string, FileInfo[]>;
  onFetchFiles: (hash: string) => void;
  onDownloadFile: (hash: string, file: string) => void;
  formatBytes: (bytes: number) => string;
  onPause: (hash: string) => void;
  onResume: (hash: string) => void;
  onRecheck: (hash: string) => void;
  onReannounce: (hash: string) => void;
  onDelete: (hash: string, withFiles: boolean) => void;
}

export default function ActiveTorrentsTable({
  torrents,
  isPolling,
  onTogglePolling,
  onRefresh,
  filesMap,
  onFetchFiles,
  onDownloadFile,
  formatBytes,
  onPause,
  onResume,
  onRecheck,
  onReannounce,
  onDelete,
}: ActiveTorrentsTableProps) {
  const [openFiles, setOpenFiles] = useState<Set<string>>(new Set());

  const toggleFiles = (hash: string) => {
    setOpenFiles((prev) => {
      const next = new Set(prev);
      if (next.has(hash)) {
        next.delete(hash);
      } else {
        next.add(hash);
        onFetchFiles(hash);
      }
      return next;
    });
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <h4 className="m-0 text-sm font-semibold">Active Torrents</h4>
        <Button size="sm" variant="secondary" onClick={onRefresh}>
          Refresh
        </Button>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Switch
            checked={isPolling}
            onCheckedChange={onTogglePolling}
            size="sm"
          />
          Auto refresh
        </label>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>DL</TableHead>
            <TableHead>UL</TableHead>
            <TableHead>Seeds</TableHead>
            <TableHead>Peers</TableHead>
            <TableHead>ETA</TableHead>
            <TableHead>Files</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {torrents.map((t) => {
            const progress = Math.round((t.progress || 0) * 100);
            const isPaused =
              t.state && String(t.state).toLowerCase().includes("stopped");
            const isComplete = progress >= 100;
            const eta =
              t.eta > 0
                ? formatDuration(
                    intervalToDuration({ start: 0, end: t.eta * 1000 }),
                  )
                : "-";
            return (
              <TableRow key={t.hash}>
                <TableCell>{t.name}</TableCell>
                <TableCell>
                  <div className="min-w-40 flex items-center gap-2">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
                      {progress}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>{t.state}</TableCell>
                <TableCell>{formatBytes(t.dlspeed || 0)}</TableCell>
                <TableCell>{formatBytes(t.upspeed || 0)}</TableCell>
                <TableCell>{t.num_seeds ?? "-"}</TableCell>
                <TableCell>{t.num_leechs ?? t.num_leechers ?? "-"}</TableCell>
                <TableCell>{eta}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleFiles(t.hash)}
                  >
                    {openFiles.has(t.hash) ? "Hide Files" : "Show Files"}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {isPaused && !isComplete && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => onResume(t.hash)}
                      >
                        Resume
                      </Button>
                    )}
                    {!isPaused && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/20"
                        onClick={() => onPause(t.hash)}
                      >
                        Pause
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] items-center justify-center whitespace-nowrap text-sm font-medium transition-all outline-none select-none border border-border bg-background hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5">
                        More
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onReannounce(t.hash)}>
                          Reannounce
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRecheck(t.hash)}>
                          Force Recheck
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(t.hash, false)}
                        >
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(t.hash, true)}
                          variant="destructive"
                        >
                          Delete with files
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {torrents.map((t) =>
        openFiles.has(t.hash) && filesMap[t.hash] ? (
          <div key={`${t.hash}-files`} className="mb-4">
            <h6 className="mb-2 text-xs font-semibold">{t.name} files</h6>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filesMap[t.hash].map((f) => {
                  const p = Math.round((f.progress || 0) * 100);
                  return (
                    <TableRow key={f.name}>
                      <TableCell>{f.name}</TableCell>
                      <TableCell>{formatBytes(f.size || 0)}</TableCell>
                      <TableCell>
                        <div className="min-w-36 flex items-center gap-2">
                          <Progress value={p} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
                            {p}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          disabled={p < 100}
                          onClick={() => onDownloadFile(t.hash, f.name)}
                        >
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : openFiles.has(t.hash) && !filesMap[t.hash] ? (
          <div key={`${t.hash}-files`} className="mb-4">
            <p className="text-xs text-muted-foreground">Loading files...</p>
          </div>
        ) : null,
      )}
    </div>
  );
}
