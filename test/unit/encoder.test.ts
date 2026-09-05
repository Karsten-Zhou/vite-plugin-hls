import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { encodeVariant } from "../../src/encoder";
import type { ResolvedHlsOptions } from "../../src/types";

const nodeAv = vi.hoisted(() => ({
  demuxer: vi.fn(),
  muxer: vi.fn(),
  decoder: vi.fn(),
  encoder: vi.fn(),
}));

vi.mock("node-av/constants", () => ({
  FF_ENCODER_AAC: "aac",
  FF_ENCODER_LIBX264: "libx264",
}));

vi.mock("node-av/api", () => ({
  Demuxer: { open: nodeAv.demuxer },
  Muxer: { open: nodeAv.muxer },
  Decoder: { create: nodeAv.decoder },
  Encoder: { create: nodeAv.encoder },
  FilterAPI: { create: () => ({ close: () => {} }) },
}));

const singleOptions = {
  mode: "single",
  segmentDuration: 4,
  segmentType: "fmp4",
  outputDir: "assets/hls",
  preset: "medium",
  crf: 23,
} satisfies ResolvedHlsOptions;

const adaptiveOptions = {
  mode: "adaptive",
  variants: [],
  segmentDuration: 4,
  segmentType: "fmp4",
  outputDir: "assets/hls",
  preset: "medium",
  crf: 23,
} satisfies ResolvedHlsOptions;

const eofPackets = (async function* () {
  yield null;
})();

const emptyDemuxer = {
  video: () => undefined,
  audio: () => undefined,
  packets: () => eofPackets,
  async [Symbol.asyncDispose]() {},
};

const videoDemuxer = {
  video: () => ({ index: 0 }),
  audio: () => undefined,
  packets: () => eofPackets,
  async [Symbol.asyncDispose]() {},
};

const muxer = {
  addStream: vi.fn(() => 0),
  writePacket: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
  async [Symbol.asyncDispose]() {},
};

const dirs: string[] = [];

afterEach(() => {
  vi.clearAllMocks();
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "vite-plugin-hls-enc-"));
  dirs.push(dir);
  return dir;
}

describe("encodeVariant", () => {
  it("remuxes a single rendition into an HLS muxer", async () => {
    const dir = tempDir();

    nodeAv.demuxer.mockResolvedValue(emptyDemuxer);
    nodeAv.muxer.mockResolvedValue(muxer);

    await encodeVariant("input.mp4", dir, singleOptions);

    expect(existsSync(dir)).toBe(true);
    expect(nodeAv.demuxer).toHaveBeenCalledWith("input.mp4");
    expect(nodeAv.muxer).toHaveBeenCalledWith(
      join(dir, "index.m3u8"),
      expect.objectContaining({
        format: "hls",
        options: expect.objectContaining({
          hls_time: "4",
          hls_playlist_type: "vod",
        }),
      }),
    );
    expect(muxer.close).toHaveBeenCalled();
  });

  it("rejects an invalid adaptive bitrate before encoding", async () => {
    const dir = tempDir();

    nodeAv.demuxer.mockResolvedValue(videoDemuxer);
    nodeAv.muxer.mockResolvedValue(muxer);
    nodeAv.decoder.mockResolvedValue({
      frames: () => eofPackets,
      close: () => {},
    });

    await expect(
      encodeVariant("input.mp4", dir, adaptiveOptions, {
        height: 720,
        bitrate: "not-a-bitrate",
      }),
    ).rejects.toThrow(/invalid bitrate/i);

    expect(nodeAv.encoder).not.toHaveBeenCalled();
  });
});
