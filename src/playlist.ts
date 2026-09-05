import { extname } from "node:path";

import { bitrateToNumber } from "./bitrate";
import type { HlsVariant } from "./types";

/** Turns a filename into a filesystem-safe slug used for the output folder. */
export function slugify(filename: string): string {
  return (
    filename
      .replace(extname(filename), "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "video"
  );
}

/** Builds the adaptive master playlist pointing at each rendition. */
export function createMasterPlaylist(variants: readonly HlsVariant[]): string {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:7"];

  for (const variant of variants) {
    // BANDWIDTH is an estimate derived from the configured bitrate.
    const bandwidth = Math.round(bitrateToNumber(variant.bitrate) * 1.15);

    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth}`,
      `${variant.height}p/index.m3u8`,
    );
  }

  return `${lines.join("\n")}\n`;
}
