const LIBRARY_NEW_KEY = "library-has-new";
export const DOWNLOAD_STARTED_EVENT = "torrent:download-started";
export const LIBRARY_NEW_EVENT = "library:new";

export function notifyDownloadStarted(name: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LIBRARY_NEW_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(DOWNLOAD_STARTED_EVENT, { detail: { name } }),
  );
  window.dispatchEvent(new CustomEvent(LIBRARY_NEW_EVENT));
}

export function hasLibraryNew(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(LIBRARY_NEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearLibraryNew() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(LIBRARY_NEW_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(LIBRARY_NEW_EVENT));
}
