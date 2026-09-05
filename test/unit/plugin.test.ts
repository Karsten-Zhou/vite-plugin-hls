import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ResolvedConfig } from "vite";

import { hlsVideos } from "../../src/index";
import { virtualIdForSource } from "../../src/resolve";

type ResolveHook = (
  this: { resolve: (...args: unknown[]) => Promise<unknown> },
  source: string,
  importer: string,
) => Promise<string | undefined>;

type LoadHook = (
  this: { emitFile: (...args: unknown[]) => unknown },
  id: string,
  options?: { ssr?: boolean },
) => Promise<string | undefined>;

const { generateHls } = vi.hoisted(() => ({ generateHls: vi.fn() }));

vi.mock("../../src/hls", () => ({ generateHls }));

const canned = {
  directoryName: "clip-abcdef123456",
  manifest: "index.m3u8",
  files: new Map<string, Buffer>([
    ["index.m3u8", Buffer.from("#EXTM3U\n")],
    ["segment-00001.m4s", Buffer.from("seg")],
  ]),
};

const source = "/abs/video.mp4";
const virtualId = virtualIdForSource(source);

let cacheDir = "";

beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), "vite-plugin-hls-test-"));
  generateHls.mockReset();
  generateHls.mockResolvedValue(canned);
});

afterEach(async () => {
  await rm(cacheDir, { recursive: true, force: true });
});

function makePlugin() {
  const plugin = hlsVideos();
  (plugin.configResolved as unknown as (config: ResolvedConfig) => void)({
    cacheDir,
  } as ResolvedConfig);
  return plugin;
}

describe("hlsVideos plugin", () => {
  it("exposes the expected plugin metadata", () => {
    const plugin = hlsVideos();
    expect(plugin.name).toBe("vite-plugin-hls");
    expect(plugin.apply).toBe("build");
    expect(plugin.enforce).toBe("pre");
  });

  it("maps a video import to a virtual module id", async () => {
    const resolve = vi.fn().mockResolvedValue({ id: `${source}?url` });
    const ctx = { resolve };
    const resolveId = makePlugin().resolveId! as unknown as ResolveHook;

    const result = await resolveId.call(
      ctx,
      "./video.mp4",
      "/proj/src/main.ts",
    );

    expect(result).toBe(virtualId);
    expect(resolve).toHaveBeenCalledWith("./video.mp4", "/proj/src/main.ts", {
      skipSelf: true,
    });
  });

  it("ignores non-video sources and import-less calls", async () => {
    const resolve = vi.fn();
    const ctx = { resolve };
    const resolveId = makePlugin().resolveId! as unknown as ResolveHook;

    await expect(
      resolveId.call(ctx, "./notes.txt", "/proj/src/main.ts"),
    ).resolves.toBeUndefined();
    await expect(
      resolveId.call(ctx, "./video.mp4", undefined as never),
    ).resolves.toBeUndefined();

    expect(resolve).not.toHaveBeenCalled();
  });

  it("loads a client module, emits assets and returns the manifest URL", async () => {
    const plugin = makePlugin();
    const emitFile = vi.fn();
    const load = plugin.load! as unknown as LoadHook;

    const code = await load.call({ emitFile }, virtualId, { ssr: false });

    expect(code).toContain("assets/hls/clip-abcdef123456/index.m3u8");
    expect(generateHls).toHaveBeenCalledWith(
      source,
      cacheDir,
      expect.objectContaining({ mode: "single" }),
    );

    expect(emitFile).toHaveBeenCalledTimes(2);
    const fileNames = emitFile.mock.calls.map(
      (call) => (call[0] as { fileName: string }).fileName,
    );
    expect(fileNames).toContain("assets/hls/clip-abcdef123456/index.m3u8");
    expect(fileNames).toContain(
      "assets/hls/clip-abcdef123456/segment-00001.m4s",
    );
  });

  it("returns the manifest URL without emitting during SSR", async () => {
    const plugin = makePlugin();
    const emitFile = vi.fn();
    const load = plugin.load! as unknown as LoadHook;

    const code = await load.call({ emitFile }, virtualId, { ssr: true });

    expect(code).toContain("assets/hls/clip-abcdef123456/index.m3u8");
    expect(emitFile).not.toHaveBeenCalled();
  });
});
