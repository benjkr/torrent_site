import type { IconType } from "react-icons";
import {
  Si7Zip,
  SiAudacity,
  SiFiles,
  SiLibreoffice,
  SiMarkdown,
  SiVlcmediaplayer,
} from "react-icons/si";
import { TbBadgeCc, TbFileTypeTxt, TbPhoto } from "react-icons/tb";

import { cn } from "@/lib/utils";

export type FileIconEntry = {
  Icon: IconType;
  className: string;
  label: string;
};

const FILE_ICONS = {
  video: {
    Icon: SiVlcmediaplayer,
    className: "text-[#FF8800]",
    label: "VLC media player",
  },
  audio: {
    Icon: SiAudacity,
    className: "text-[#0000CC]",
    label: "Audacity",
  },
  subtitles: {
    Icon: TbBadgeCc,
    className: "text-amber-600",
    label: "Closed captions",
  },
  image: {
    Icon: TbPhoto,
    className: "text-sky-600",
    label: "Picture",
  },
  archive: {
    Icon: Si7Zip,
    className: "text-[#000000] dark:text-[#EE2E24]",
    label: "7-Zip",
  },
  markdown: {
    Icon: SiMarkdown,
    className: "text-neutral-800 dark:text-neutral-200",
    label: "Markdown",
  },
  document: {
    Icon: SiLibreoffice,
    className: "text-[#18A303]",
    label: "LibreOffice",
  },
  text: {
    Icon: TbFileTypeTxt,
    className: "text-slate-500",
    label: "Text file",
  },
  default: {
    Icon: SiFiles,
    className: "text-muted-foreground",
    label: "File",
  },
} as const satisfies Record<string, FileIconEntry>;

function extensionFromPath(path: string): string {
  const base = path.split(/[/\\]/).pop() ?? path;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function fileIconForPath(path: string): FileIconEntry {
  const ext = extensionFromPath(path);

  if (
    ["mkv", "mp4", "avi", "m4v", "mov", "wmv", "webm", "ts", "m2ts", "mpg", "mpeg"].includes(
      ext,
    )
  ) {
    return FILE_ICONS.video;
  }

  if (["mp3", "flac", "aac", "ogg", "wav", "m4a", "opus", "ape"].includes(ext)) {
    return FILE_ICONS.audio;
  }

  if (["srt", "ass", "ssa", "sub", "idx", "vtt", "sup", "smi"].includes(ext)) {
    return FILE_ICONS.subtitles;
  }

  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tiff"].includes(ext)) {
    return FILE_ICONS.image;
  }

  if (["rar", "zip", "7z", "tar", "gz", "bz2", "xz", "tgz"].includes(ext)) {
    return FILE_ICONS.archive;
  }

  if (ext === "md") {
    return FILE_ICONS.markdown;
  }

  if (["pdf", "doc", "docx", "rtf"].includes(ext)) {
    return FILE_ICONS.document;
  }

  if (["nfo", "txt"].includes(ext)) {
    return FILE_ICONS.text;
  }

  return FILE_ICONS.default;
}

export function FileTypeIcon({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  const { Icon, className: color, label } = fileIconForPath(path);

  return (
    <Icon
      className={cn("size-3 shrink-0", color, className)}
      aria-label={label}
      role="img"
    />
  );
}
