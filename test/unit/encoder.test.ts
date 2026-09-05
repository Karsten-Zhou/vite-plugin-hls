import { describe, expect, it } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { encodeVariant } from "../../src/encoder";
import type { ResolvedHlsOptions } from "../../src/types";

const missingFfmpeg = join(
  tmpdir(),
  "vite-plugin-hls-ffmpeg-that-does-not-exist",
);

const singleOptions = {
  mode: "single",
  ffmpegPath: missingFfmpeg,
  segmentDuration: 4,
  segmentType: "fmp4",
  outputDir: "assets/hls",
  preset: "medium",
  crf: 23,
} satisfies ResolvedHlsOptions;

const adaptiveOptions = {
  mode: "adaptive",
  variants: [],
  ffmpegPath: missingFfmpeg,
  segmentDuration: 4,
  segmentType: "fmp4",
  outputDir: "assets/hls",
  preset: "medium",
  crf: 23,
} satisfies ResolvedHlsOptions;

describe("encodeVariant error handling", () => {
  it("rejects with a clear error when ffmpeg is missing", async () => {
    await expect(
      encodeVariant("input.mp4", "out", singleOptions),
    ).rejects.toThrow(/ffmpeg was not found/i);
  });

  it("rejects an invalid adaptive bitrate before spawning ffmpeg", async () => {
    await expect(
      encodeVariant("input.mp4", "out", adaptiveOptions, {
        height: 720,
        bitrate: "not-a-bitrate",
      }),
    ).rejects.toThrow(/invalid bitrate/i);
  });
});
