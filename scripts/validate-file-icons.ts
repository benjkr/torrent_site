import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { fileIconForPath } from "../app/lib/file-icon";

const samples: Record<string, string> = {
  video: "movie.mkv",
  audio: "track.flac",
  subtitles: "subs.srt",
  image: "cover.jpg",
  archive: "release.rar",
  markdown: "readme.md",
  document: "info.pdf",
  text: "readme.txt",
  default: "unknown.bin",
};

for (const [label, sample] of Object.entries(samples)) {
  const { Icon, label: iconLabel } = fileIconForPath(sample);
  const markup = renderToStaticMarkup(createElement(Icon));

  if (!markup.includes("<svg")) {
    throw new Error(`Icon for ${label} did not render an SVG`);
  }

  console.log(`ok ${label} -> ${Icon.name} (${iconLabel})`);
}

console.log("All file icons validated.");
