import { basename, extname, join } from "node:path";
import { writeFile } from "node:fs/promises";

import {
  encodeVariant,
  createEncodeDirectory,
  removeEncodeDirectory,
} from "./encoder";
import { readCache, getCacheKey, writeCache } from "./cache";
import { collectFiles } from "./fs";
import { slugify, createMasterPlaylist } from "./playlist";
import type { CachedHls, ResolvedHlsOptions } from "./types";

export async function generateHls(
  source: string,
  cacheRoot: string,
  options: ResolvedHlsOptions,
): Promise<CachedHls> {
  const key = await getCacheKey(source, options);

  const cached = await readCache(cacheRoot, key);

  if (cached) {
    console.log(`[vite-plugin-hls] cache hit ${source}`);

    return cached;
  }

  console.log(`[vite-plugin-hls] encoding ${source}`);

  const temporaryDirectory = await createEncodeDirectory();

  try {
    const videoName = slugify(basename(source, extname(source)));

    const directoryName = `${videoName}-${key.slice(0, 12)}`;

    let manifest: string;

    if (options.mode === "single") {
      await encodeVariant(source, temporaryDirectory, options);

      manifest = "index.m3u8";
    } else {
      for (const variant of options.variants) {
        await encodeVariant(
          source,
          join(temporaryDirectory, `${variant.height}p`),
          options,
          {
            height: variant.height,
            bitrate: variant.bitrate,
          },
        );
      }

      const master = createMasterPlaylist(options.variants);

      await writeFile(join(temporaryDirectory, "master.m3u8"), master, "utf8");

      manifest = "master.m3u8";
    }

    const result: CachedHls = {
      directoryName,
      manifest,
      files: await collectFiles(temporaryDirectory),
    };

    await writeCache(cacheRoot, key, result);

    console.log(`[vite-plugin-hls] generated ${directoryName}/${manifest}`);

    return result;
  } finally {
    await removeEncodeDirectory(temporaryDirectory);
  }
}
