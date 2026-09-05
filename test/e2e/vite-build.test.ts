import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "vite";

import { hlsVideos } from "../../src/index";
import { artifactsDir, ensureSampleVideo } from "./sample";

let sample: string;
const project = join(artifactsDir, "vite-project");
const outDir = join(project, "dist");

beforeAll(async () => {
  sample = await ensureSampleVideo();
  rmSync(project, { recursive: true, force: true });
  mkdirSync(project, { recursive: true });

  copyFileSync(sample, join(project, "video.mp4"));

  const fs = await import("node:fs");
  fs.writeFileSync(
    join(project, "index.html"),
    '<!doctype html><html><body><script type="module" src="/main.ts"></script></body></html>',
  );
  fs.writeFileSync(
    join(project, "main.ts"),
    'import videoUrl from "/video.mp4";\nconsole.log(videoUrl);',
  );
}, 180_000);

afterAll(() => {
  // Left under git-ignored artifacts for inspection; clean with `test:e2e:clean`.
});

async function findFiles(
  directory: string,
  predicate: (relativePath: string) => boolean,
): Promise<string[]> {
  const matches: string[] = [];

  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      const relative = absolute
        .slice(directory.length + 1)
        .replaceAll("\\", "/");

      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (predicate(relative)) {
        matches.push(relative);
      }
    }
  }

  if (existsSync(directory)) {
    await visit(directory);
  }
  return matches;
}

describe("vite build e2e (real node-av encode)", () => {
  it("encodes the source to HLS and emits playlists + segments", async () => {
    await build({
      root: project,
      configFile: false,
      logLevel: "silent",
      plugins: [
        hlsVideos({
          mode: "adaptive",
          variants: [{ height: 180, bitrate: "500k" }],
          outputDir: "assets/hls",
          segmentDuration: 1,
          preset: "veryfast",
          crf: 28,
        }),
      ],
      build: { outDir, emptyOutDir: true },
    });

    const manifests = await findFiles(
      outDir,
      (p) => p.startsWith("assets/hls/") && p.endsWith(".m3u8"),
    );

    expect(
      manifests.some((p) => p.endsWith("/master.m3u8")),
      "expected a master playlist",
    ).toBe(true);
    expect(
      manifests.some((p) => p.endsWith("/index.m3u8")),
      "expected a media playlist",
    ).toBe(true);

    const master = manifests.find((p) => p.endsWith("/master.m3u8"));
    expect(master).toBeDefined();
    expect(await readFile(join(outDir, master!), "utf8")).toContain("#EXTM3U");

    const segments = await findFiles(outDir, (p) => p.endsWith(".m4s"));
    expect(segments.length).toBeGreaterThan(0);

    // The JS bundle references the master playlist URL.
    const bundles = await findFiles(outDir, (p) => p.endsWith(".js"));
    expect(bundles.length).toBeGreaterThan(0);
    expect(await readFile(join(outDir, bundles[0]!), "utf8")).toContain(
      "/master.m3u8",
    );
  }, 180_000);
});
