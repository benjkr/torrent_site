import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import ActiveTorrentsTable from "../components/ActiveTorrentsTable";
import type { TorrentInfo, FileInfo } from "../lib/types";
import { formatBytes } from "../lib/utils";

export default function TorrentsPage() {
  const [activeTorrents, setActiveTorrents] = useState<TorrentInfo[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [filesMap, setFilesMap] = useState<Record<string, FileInfo[]>>({});

  const listFetcher = useFetcher<TorrentInfo[]>();
  const filesFetcher = useFetcher<{ files: FileInfo[] }>();
  const actionFetcher = useFetcher();

  const fetchTorrents = () => {
    listFetcher.load("/api/torrents");
  };

  useEffect(() => {
    if (listFetcher.data) {
      setActiveTorrents(listFetcher.data);
    }
  }, [listFetcher.data]);

  useEffect(() => {
    fetchTorrents();
  }, []);

  useEffect(() => {
    if (!isPolling) return;
    const id = setInterval(fetchTorrents, 2000);
    return () => clearInterval(id);
  }, [isPolling]);

  const fetchTorrentFiles = (hash: string) => {
    filesFetcher.load(`/api/torrent_files?hash=${encodeURIComponent(hash)}`);
    if (filesFetcher.data) {
      setFilesMap((prev) => ({
        ...prev,
        [hash]: filesFetcher.data!.files || [],
      }));
    }
  };

  useEffect(() => {
    if (filesFetcher.data && filesFetcher.state === "idle") {
      const url = new URL(filesFetcher.formAction || "", "http://localhost");
      const hash = url.searchParams.get("hash");
      if (hash) {
        setFilesMap((prev) => ({
          ...prev,
          [hash]: (filesFetcher.data as any).files || [],
        }));
      }
    }
  }, [filesFetcher.data, filesFetcher.state]);

  const downloadFile = (hash: string, file: string) => {
    const url = `/api/download_file?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(file)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const postAction = (path: string) => {
    actionFetcher.submit(null, { method: "POST", action: path });
    setTimeout(fetchTorrents, 500);
  };

  const delAction = (hash: string, withFiles: boolean) => {
    const formData = new FormData();
    formData.set("_method", "DELETE");
    actionFetcher.submit(formData, {
      method: "POST",
      action: `/api/torrents?hash=${encodeURIComponent(hash)}&withFiles=${withFiles ? 1 : 0}`,
    });
    setTimeout(fetchTorrents, 500);
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

  return (
    <ActiveTorrentsTable
      torrents={activeTorrents}
      isPolling={isPolling}
      onTogglePolling={setIsPolling}
      onRefresh={fetchTorrents}
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
  );
}
