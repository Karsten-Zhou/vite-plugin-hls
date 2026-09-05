import { describe, expect, it } from "vitest";

import { bitrateToNumber } from "../../src/bitrate";
import { createMasterPlaylist, slugify } from "../../src/playlist";

describe("bitrateToNumber", () => {
  it.each([
    ["800", 800],
    ["1200k", 1_200_000],
    ["1.5M", 1_500_000],
    ["2M", 2_000_000],
    ["1G", 1_000_000_000],
    [" 500K ", 500_000],
  ])("%s -> %d", (input, expected) => {
    expect(bitrateToNumber(input)).toBe(expected);
  });

  it("throws for invalid bitrates", () => {
    expect(() => bitrateToNumber("nope")).toThrow(/invalid bitrate/i);
    expect(() => bitrateToNumber("")).toThrow(/invalid bitrate/i);
  });
});

describe("slugify", () => {
  it.each([
    ["My Great Video.mp4", "my-great-video"],
    ["already-good.mp4", "already-good"],
    ["Café_Clip.mov", "caf-_clip"],
    [".hidden.mp4", "hidden"],
    ["123.mp4", "123"],
    ["---.mp4", "video"],
  ])("%s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("createMasterPlaylist", () => {
  it("emits a stream entry per variant with estimated bandwidth", () => {
    const playlist = createMasterPlaylist([
      { height: 1080, bitrate: "3M" },
      { height: 720, bitrate: "1M" },
    ]);

    expect(playlist).toContain("#EXTM3U");
    expect(playlist).toContain("#EXT-X-VERSION:7");
    expect(playlist).toContain("#EXT-X-STREAM-INF:BANDWIDTH=3450000");
    expect(playlist).toContain("1080p/index.m3u8");
    expect(playlist).toContain("#EXT-X-STREAM-INF:BANDWIDTH=1150000");
    expect(playlist).toContain("720p/index.m3u8");
  });
});
