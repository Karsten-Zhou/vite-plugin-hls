import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { encodeVariant } from "../../src/encoder";
import type { ResolvedHlsOptions } from "../../src/types";
import { artifactsDir, ensureSampleVideo } from "./sample";

const singleOptions = {
  mode: "single",
  segmentDuration: 1,
  segmentType: "fmp4",
  outputDir: "assets/hls",
  preset: "medium",
  crf: 23,
} satisfies ResolvedHlsOptions;

const adaptiveOptions = {
  mode: "adaptive",
  variants: [{ height: 180, bitrate: "500k" }],
  segmentDuration: 1,
  segmentType: "fmp4",
  outputDir: "assets/hls",
  preset: "veryfast",
  crf: 28,
} satisfies ResolvedHlsOptions;

let sample: string;

beforeAll(async () => {
  sample = await ensureSampleVideo();
}, 180_000);

afterAll(() => {
  // Artifacts (input + outputs) are intentionally left under the git-ignored
  // ./test/e2e/.artifacts dir for inspection. Remove with `npm run test:e2e:clean`.
});

function playlistFiles(playlist: string): string[] {
  return playlist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) => line && !line.startsWith("#") && !line.startsWith("http"),
    );
}

function assertPlayableHls(out: string): void {
  const playlist = readFileSync(join(out, "index.m3u8"), "utf8");

  expect(playlist).toContain("#EXTM3U");
  expect(playlist).toContain("#EXTINF");

  const files = playlistFiles(playlist);
  expect(files.length).toBeGreaterThan(0);

  // Every media file the playlist references must actually be on disk.
  for (const file of files) {
    expect(existsSync(join(out, file)), `missing ${file}`).toBe(true);
  }
}

describe("encodeVariant e2e", () => {
  it("remuxes a real source into an fMP4 HLS playlist", async () => {
    const out = join(artifactsDir, "single");
    rmSync(out, { recursive: true, force: true });

    await encodeVariant(sample, out, singleOptions);

    assertPlayableHls(out);
  }, 120_000);

  it("re-encodes an adaptive rendition into HLS", async () => {
    const out = join(artifactsDir, "adaptive");
    rmSync(out, { recursive: true, force: true });

    await encodeVariant(sample, out, adaptiveOptions, {
      height: 180,
      bitrate: "500k",
    });

    assertPlayableHls(out);
  }, 120_000);
});
