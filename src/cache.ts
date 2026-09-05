import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { collectFiles } from "./fs";
import type { CachedHls, ResolvedHlsOptions } from "./types";

interface CacheManifest {
  directoryName: string;
  manifest: string;
}

export async function getCacheKey(
  source: string,
  options: ResolvedHlsOptions,
): Promise<string> {
  const sourceData = await readFile(source);

  return createHash("sha256")
    .update(sourceData)
    .update(JSON.stringify(options))
    .digest("hex");
}

export async function readCache(
  cacheRoot: string,
  key: string,
): Promise<CachedHls | undefined> {
  const directory = join(cacheRoot, "hls", key);

  try {
    await stat(directory);
  } catch {
    return undefined;
  }

  const metadata = JSON.parse(
    await readFile(join(directory, "manifest.json"), "utf8"),
  ) as CacheManifest;

  const files = await collectFiles(directory);

  // manifest.json is internal bookkeeping, never an emitted asset.
  files.delete("manifest.json");

  return {
    directoryName: metadata.directoryName,

    manifest: metadata.manifest,

    files,
  };
}

export async function writeCache(
  cacheRoot: string,
  key: string,
  result: CachedHls,
): Promise<void> {
  const temporaryDirectory = join(cacheRoot, "hls", `${key}.tmp`);

  const finalDirectory = join(cacheRoot, "hls", key);

  await rm(temporaryDirectory, {
    recursive: true,
    force: true,
  });

  await mkdir(temporaryDirectory, {
    recursive: true,
  });

  for (const [filename, data] of result.files) {
    const destination = join(temporaryDirectory, filename);

    await mkdir(resolve(destination, ".."), {
      recursive: true,
    });

    await writeFile(destination, data);
  }

  await writeFile(
    join(temporaryDirectory, "manifest.json"),
    JSON.stringify({
      directoryName: result.directoryName,
      manifest: result.manifest,
    } satisfies CacheManifest),
    "utf8",
  );

  await rm(finalDirectory, {
    recursive: true,
    force: true,
  });

  await rename(temporaryDirectory, finalDirectory);
}
