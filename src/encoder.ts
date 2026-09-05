import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { Decoder, Demuxer, Encoder, FilterAPI, Muxer } from "node-av/api";
import { FF_ENCODER_AAC, FF_ENCODER_LIBX264 } from "node-av/constants";

import { bitrateToNumber } from "./bitrate";
import type { ResolvedHlsOptions } from "./types";

interface EncodeVariantOptions {
  height?: number;
  bitrate?: string;
}

const PLAYLIST = "index.m3u8";

type HlsOptions = {
  hls_time: string;
  hls_playlist_type: "vod";
  hls_segment_filename: string;
  hls_segment_type?: "mpegts" | "fmp4";
  hls_fmp4_init_filename?: string;
};

function hlsMuxerOptions(
  outputDirectory: string,
  options: ResolvedHlsOptions,
): HlsOptions {
  const extension = options.segmentType === "fmp4" ? "m4s" : "ts";

  const hls: HlsOptions = {
    hls_time: String(options.segmentDuration),
    hls_playlist_type: "vod",
    hls_segment_filename: join(outputDirectory, `segment-%05d.${extension}`),
  };

  if (options.segmentType === "fmp4") {
    hls.hls_segment_type = "fmp4";

    /*
     * The init filename must be absolute so the file lands next to the
     * playlist. A relative name would be resolved against the process CWD
     * (the project root) and leak there. The playlist is relativized after
     * encoding (see relativizePlaylist).
     */
    hls.hls_fmp4_init_filename = join(outputDirectory, "init.mp4");
  }

  return hls;
}

/*
 * ffmpeg references an absolute init path literally in EXT-X-MAP (segment
 * URIs are already emitted as basenames). Rewrite it to a path relative to
 * the output directory so the playlist stays portable.
 */
async function relativizePlaylist(
  playlist: string,
  outputDirectory: string,
): Promise<void> {
  let text: string;
  try {
    text = await readFile(playlist, "utf8");
  } catch {
    return; // nothing written (e.g. mocked in tests)
  }

  const prefix = outputDirectory.replace(/[\\/]+$/, "");

  text = text
    .split(prefix + "\\")
    .join("")
    .split(prefix + "/")
    .join("");

  await writeFile(playlist, text, "utf8");
}

/*
 * SINGLE MODE (remux): copy the streams, only repackage into HLS.
 */
async function remuxToHls(
  source: string,
  playlist: string,
  hls: HlsOptions,
): Promise<void> {
  await using input = await Demuxer.open(source);
  await using output = await Muxer.open(playlist, {
    format: "hls",
    input,
    options: hls,
  });

  const routed = new Map<number, number>();

  const video = input.video();
  if (video) {
    routed.set(video.index, output.addStream(video));
  }

  const audio = input.audio();
  if (audio) {
    routed.set(audio.index, output.addStream(audio));
  }

  for await (const packet of input.packets()) {
    if (packet === null) {
      break;
    }

    const index = routed.get(packet.streamIndex);

    if (index !== undefined) {
      await output.writePacket(packet, index);
    }

    packet.free();
  }

  await output.close();

  await relativizePlaylist(playlist, dirname(playlist));
}

/*
 * ADAPTIVE MODE (transcode): re-encode each rendition's video (scaled,
 * libx264) and audio (aac) into its HLS output.
 */
async function transcodeToHls(
  source: string,
  playlist: string,
  hls: HlsOptions,
  options: ResolvedHlsOptions,
  variant: EncodeVariantOptions,
): Promise<void> {
  if (options.mode !== "adaptive") {
    throw new Error(
      "[vite-plugin-hls] internal: transcode requires adaptive mode",
    );
  }

  await using input = await Demuxer.open(source);
  await using output = await Muxer.open(playlist, {
    format: "hls",
    input,
    options: hls,
  });

  const tasks: Promise<void>[] = [];

  const video = input.video();
  if (video) {
    const decoder = await Decoder.create(video);

    const scale = variant.height
      ? `scale=-2:${variant.height}:force_original_aspect_ratio=decrease,format=yuv420p`
      : "format=yuv420p";

    const filter = FilterAPI.create(scale);

    const encoderOptions: Record<string, string | number> = {
      preset: options.preset,
      crf: String(options.crf),
    };

    const encoderBase: Record<string, unknown> = {
      options: encoderOptions,
    };

    if (variant.bitrate !== undefined) {
      const bitrate = bitrateToNumber(variant.bitrate);

      encoderOptions.maxrate = bitrate;
      encoderOptions.bufsize = Math.round(bitrate * 1.5);
      encoderBase.bitrate = bitrate;
    }

    const encoder = await Encoder.create(
      FF_ENCODER_LIBX264,
      encoderBase as Parameters<typeof Encoder.create>[1],
    );

    const index = output.addStream(encoder, { inputStream: video });

    tasks.push(
      (async () => {
        try {
          const frames = decoder.frames(input.packets(video.index));
          const scaled = filter.frames(frames);

          for await (const packet of encoder.packets(scaled)) {
            if (packet === null) {
              break;
            }
            await output.writePacket(packet, index);
            packet.free();
          }
        } finally {
          filter.close();
          decoder.close();
          encoder.close();
        }
      })(),
    );
  }

  const audio = input.audio();
  if (audio) {
    const decoder = await Decoder.create(audio);

    const encoder = await Encoder.create(FF_ENCODER_AAC, {
      decoder,
      bitrate: 128_000,
    });

    const index = output.addStream(encoder, { inputStream: audio });

    tasks.push(
      (async () => {
        try {
          const frames = decoder.frames(input.packets(audio.index));

          for await (const packet of encoder.packets(frames)) {
            if (packet === null) {
              break;
            }
            await output.writePacket(packet, index);
            packet.free();
          }
        } finally {
          decoder.close();
          encoder.close();
        }
      })(),
    );
  }

  await Promise.all(tasks);
  await output.close();

  await relativizePlaylist(playlist, dirname(playlist));
}

export async function encodeVariant(
  source: string,
  outputDirectory: string,
  options: ResolvedHlsOptions,
  variant: EncodeVariantOptions = {},
): Promise<void> {
  const hls = hlsMuxerOptions(outputDirectory, options);
  const playlist = join(outputDirectory, PLAYLIST);

  /*
   * FFmpeg's HLS muxer does not create the output directory.
   * Ensure it exists so segments/playlist can be written.
   */
  await mkdir(outputDirectory, { recursive: true });

  if (options.mode === "single") {
    await remuxToHls(source, playlist, hls);
  } else {
    await transcodeToHls(source, playlist, hls, options, variant);
  }
}

export async function createEncodeDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), "vite-plugin-hls-"));
}

export async function removeEncodeDirectory(directory: string): Promise<void> {
  await rm(directory, {
    recursive: true,
    force: true,
  });
}
