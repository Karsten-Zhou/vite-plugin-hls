import { describe, expect, it, vi } from "vitest";
import type { PluginContext } from "rolldown";

import {
  isVideoSource,
  resolveVideoSource,
  sourceFromVirtualId,
  virtualIdForSource,
} from "../../src/resolve";

describe("isVideoSource", () => {
  it.each([
    ["clip.mp4", true],
    ["./videos/screen.MOV", true],
    ["render.webm", true],
    ["movie.mkv", true],
    ["archive.avi", true],
    ["movie.m4v", true],
    ["clip.mp4?url", true],
    ["notes.txt", false],
    ["playlist.m3u8", false],
    ["index.ts", false],
    ["noext", false],
  ])("%s -> %s", (source, expected) => {
    expect(isVideoSource(source)).toBe(expected);
  });
});

describe("virtual id helpers", () => {
  it("round-trips a source through its virtual id", () => {
    const source = "C:/my folder/My Video.mp4";

    expect(sourceFromVirtualId(virtualIdForSource(source))).toBe(source);
  });
});

describe("resolveVideoSource", () => {
  it("resolves a video source and strips query strings", async () => {
    const context = {
      resolve: vi.fn().mockResolvedValue({ id: "/abs/clip.mp4?url" }),
    } as unknown as PluginContext;

    await expect(
      resolveVideoSource("./clip.mp4", "/proj/src/main.ts", context),
    ).resolves.toBe("/abs/clip.mp4");

    expect(context.resolve).toHaveBeenCalledWith(
      "./clip.mp4",
      "/proj/src/main.ts",
      { skipSelf: true },
    );
  });

  it("returns undefined for external modules", async () => {
    const context = {
      resolve: vi
        .fn()
        .mockResolvedValue({ id: "https://cdn/x.mp4", external: true }),
    } as unknown as PluginContext;

    await expect(
      resolveVideoSource("./clip.mp4", "/proj/src/main.ts", context),
    ).resolves.toBeUndefined();
  });

  it("returns undefined when resolution fails", async () => {
    const context = {
      resolve: vi.fn().mockResolvedValue(null),
    } as unknown as PluginContext;

    await expect(
      resolveVideoSource("./clip.mp4", "/proj/src/main.ts", context),
    ).resolves.toBeUndefined();
  });

  it("does not resolve non-video sources", async () => {
    const context = { resolve: vi.fn() } as unknown as PluginContext;

    await expect(
      resolveVideoSource("./readme.md", "/proj/src/main.ts", context),
    ).resolves.toBeUndefined();

    expect(context.resolve).not.toHaveBeenCalled();
  });
});
