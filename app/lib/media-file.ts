const VIDEO_EXTENSIONS = [
  "mkv",
  "mp4",
  "avi",
  "m4v",
  "mov",
  "wmv",
  "webm",
  "ts",
  "m2ts",
  "mpg",
  "mpeg",
] as const;

export function extensionFromPath(path: string): string {
  const base = path.split(/[/\\]/).pop() ?? path;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function isVideoFilePath(path: string): boolean {
  return (VIDEO_EXTENSIONS as readonly string[]).includes(
    extensionFromPath(path),
  );
}
