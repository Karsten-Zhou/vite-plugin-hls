import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getCacheKey, readCache, writeCache } from "../../src/cache";
import type { ResolvedHlsOptions } from "../../src/types";

const options = {
  mode: "single",
  segmentDuration: 4,
  segmentType: "fmp4",
  outputDir: "assets/hls",
  preset: "medium",
  crf: 23,
} satisfies ResolvedHlsOptions;

let cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanup.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  cleanup = [];
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "vite-plugin-hls-test-"));
  cleanup.push(dir);
  return dir;
}

describe("getCacheKey", () => {
  it("is stable for identical content and options", async () => {
    const dir = await tempDir();
    const source = join(dir, "video.mp4");
    await writeFile(source, "payload-a");

    const first = await getCacheKey(source, options);
    const second = await getCacheKey(source, options);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when the source content changes", async () => {
    const dir = await tempDir();
    const source = join(dir, "video.mp4");

    await writeFile(source, "payload-a");
    const first = await getCacheKey(source, options);

    await writeFile(source, "payload-b");
    const second = await getCacheKey(source, options);

    expect(second).not.toBe(first);
  });
});

describe("writeCache / readCache", () => {
  it("round-trips files while hiding the internal manifest", async () => {
    const dir = await tempDir();
    const cacheRoot = join(dir, "cache");

    const result = {
      directoryName: "clip-abcdef123456",
      manifest: "index.m3u8",
      files: new Map<string, Buffer>([
        ["index.m3u8", Buffer.from("#EXTM3U\n")],
        ["segment-00001.m4s", Buffer.from("seg")],
      ]),
    };

    const key = "a".repeat(64);
    await writeCache(cacheRoot, key, result);

    const read = await readCache(cacheRoot, key);

    expect(read).toBeDefined();
    expect(read?.directoryName).toBe("clip-abcdef123456");
    expect(read?.manifest).toBe("index.m3u8");
    expect(read?.files.get("index.m3u8")?.toString()).toBe("#EXTM3U\n");
    expect(read?.files.has("segment-00001.m4s")).toBe(true);
    // manifest.json is internal bookkeeping and must not surface as a file
    expect(read?.files.has("manifest.json")).toBe(false);
  });

  it("returns undefined for a missing key", async () => {
    const dir = await tempDir();

    await expect(
      readCache(join(dir, "cache"), "b".repeat(64)),
    ).resolves.toBeUndefined();
  });
});
