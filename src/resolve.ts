import { extname } from "node:path";

import type { PluginContext } from "rolldown";

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
  ".mkv",
  ".avi",
]);

const VIRTUAL_PREFIX = "\0vite-plugin-hls:";

export function isVideoSource(source: string): boolean {
  const pathname = source.split("?")[0] ?? source;

  return VIDEO_EXTENSIONS.has(extname(pathname).toLowerCase());
}

export function virtualIdForSource(source: string): string {
  return `${VIRTUAL_PREFIX}${encodeURIComponent(source)}`;
}

export function sourceFromVirtualId(id: string): string {
  return decodeURIComponent(id.slice(VIRTUAL_PREFIX.length));
}

export async function resolveVideoSource(
  source: string,
  importer: string,
  context: PluginContext,
): Promise<string | undefined> {
  if (!isVideoSource(source)) {
    return undefined;
  }

  const resolved = await context.resolve(source, importer, {
    skipSelf: true,
  });

  if (!resolved || resolved.external) {
    return undefined;
  }

  /*
   * Queries such as ?url are irrelevant here.
   * FFmpeg needs the physical file.
   */
  return resolved.id.split("?", 1)[0];
}
