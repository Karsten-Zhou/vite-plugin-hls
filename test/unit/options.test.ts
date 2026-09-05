import { describe, expect, it, vi } from "vitest";

import { resolveOptions } from "../../src/options";

vi.mock("ffmpeg-static", () => ({ default: "/opt/ffmpeg" }));

describe("resolveOptions", () => {
  it("applies single-mode defaults", () => {
    expect(resolveOptions()).toEqual({
      mode: "single",
      ffmpegPath: "/opt/ffmpeg",
      segmentDuration: 4,
      segmentType: "fmp4",
      outputDir: "assets/hls",
      preset: "medium",
      crf: 23,
    });
  });

  it("keeps explicitly provided values", () => {
    const options = resolveOptions({
      ffmpegPath: "/usr/bin/ffmpeg",
      segmentDuration: 6,
      segmentType: "mpegts",
      outputDir: "static/video",
      preset: "fast",
      crf: 18,
    });

    expect(options).toMatchObject({
      mode: "single",
      ffmpegPath: "/usr/bin/ffmpeg",
      segmentDuration: 6,
      segmentType: "mpegts",
      outputDir: "static/video",
      preset: "fast",
      crf: 18,
    });
  });

  it("resolves adaptive mode with its variants", () => {
    const options = resolveOptions({
      mode: "adaptive",
      variants: [
        { height: 1080, bitrate: "3M" },
        { height: 720, bitrate: "1.5M" },
      ],
    });

    expect(options.mode).toBe("adaptive");
    expect(options).toMatchObject({
      variants: [
        { height: 1080, bitrate: "3M" },
        { height: 720, bitrate: "1.5M" },
      ],
    });
  });

  it("throws when adaptive mode has no variants", () => {
    // @ts-expect-error variants are required in adaptive mode
    expect(() => resolveOptions({ mode: "adaptive" })).toThrow(
      /at least one variant/i,
    );
  });

  it("throws when adaptive mode has an empty variant list", () => {
    expect(() => resolveOptions({ mode: "adaptive", variants: [] })).toThrow(
      /at least one variant/i,
    );
  });
});
