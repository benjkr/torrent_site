import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import LibraryTable from "../components/LibraryTable";
import type { FileInfo } from "../lib/types";
import { formatBytes } from "../lib/utils";
import { useMaindata } from "../lib/maindata";
import { useQbStatus } from "../lib/qb-status";

export default function LibraryPage() {
  const qb = useQbStatus();
  const { online, state } = qb;
  const qbError = qb.state === "offline" ? qb.error : undefined;
  const { torrents: liveTorrents } = useMaindata();
  const [filesMap, setFilesMap] = useState<Record<string, FileInfo[]>>({});
  const [error, setError] = useState<string | null>(null);

  const actionFetcher = useFetcher();

  useEffect(() => {
    if (!online) {
      setFilesMap({});
      setError(null);
    }
  }, [online]);

  const downloadFile = (hash: string, file: string) => {
    if (!online) return;
    const url = `/api/download_file?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(file)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const postAction = (path: string) => {
    if (!online) return;
    actionFetcher.submit(null, { method: "POST", action: path });
  };

  const delAction = (hash: string, withFiles: boolean) => {
    if (!online) return;
    const formData = new FormData();
    formData.set("_method", "DELETE");
    actionFetcher.submit(formData, {
      method: "POST",
      action: `/api/torrents?hash=${encodeURIComponent(hash)}&withFiles=${withFiles ? 1 : 0}`,
    });
  };

  const pause = (hash: string) =>
    postAction(`/api/torrent/pause?hash=${encodeURIComponent(hash)}`);
  const resume = (hash: string) =>
    postAction(`/api/torrent/resume?hash=${encodeURIComponent(hash)}`);
  const recheck = (hash: string) =>
    postAction(`/api/torrent/recheck?hash=${encodeURIComponent(hash)}`);
  const reannounce = (hash: string) =>
    postAction(`/api/torrent/reannounce?hash=${encodeURIComponent(hash)}`);
  const remove = (hash: string, withFiles: boolean) => {
    const msg = withFiles
      ? "Delete this torrent and all data?"
      : "Delete this torrent?";
    if (!window.confirm(msg)) return;
    delAction(hash, withFiles);
  };

  const fetchTorrentFiles = (hash: string) => {
    if (!online) return;
    fetch(`/api/torrent_files?hash=${encodeURIComponent(hash)}`)
      .then((r) => r.json())
      .then((data) => {
        setFilesMap((prev) => ({
          ...prev,
          [hash]: data.files || [],
        }));
      })
      .catch(() => {
        setFilesMap((prev) => ({ ...prev, [hash]: [] }));
        setError("Failed to load torrent files");
      });
  };

  if (!online) {
    const message =
      state === "offline"
        ? qbError || "qBittorrent is unreachable"
        : "Waiting for qBittorrent…";
    // DEV: still render the table so the simulator card can be used offline.
    if (!import.meta.env.DEV) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Library unavailable — {message}
        </div>
      );
    }
    return (
      <div>
        <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Library unavailable — {message} (DEV: simulator still available)
        </div>
        <LibraryTable
          torrents={[]}
          filesMap={{}}
          onFetchFiles={() => {}}
          onDownloadFile={() => {}}
          formatBytes={formatBytes}
          onPause={() => {}}
          onResume={() => {}}
          onRecheck={() => {}}
          onReannounce={() => {}}
          onDelete={() => {}}
        />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <LibraryTable
        torrents={liveTorrents}
        filesMap={filesMap}
        onFetchFiles={fetchTorrentFiles}
        onDownloadFile={downloadFile}
        formatBytes={formatBytes}
        onPause={pause}
        onResume={resume}
        onRecheck={recheck}
        onReannounce={reannounce}
        onDelete={remove}
      />
    </div>
  );
}
