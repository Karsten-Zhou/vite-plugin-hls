import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

import { bitrateToNumber } from "./bitrate";
import type { ResolvedHlsOptions } from "./types";

interface EncodeVariantOptions {
  height?: number;
  bitrate?: string;
}

function runFfmpeg(executable: string, args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      if ("code" in error && error.code === "ENOENT") {
        reject(
          new Error(
            [
              "[vite-plugin-hls] ffmpeg was not found.",
              `Executable: ${executable}`,
              "Set ffmpegPath or install ffmpeg.",
            ].join("\n"),
          ),
        );
        return;
      }

      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(
        new Error(
          [
            `[vite-plugin-hls] ffmpeg failed with exit code ${code ?? "unknown"}.`,
            stderr.trim(),
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      );
    });
  });
}

export async function encodeVariant(
  source: string,
  outputDirectory: string,
  options: ResolvedHlsOptions,
  variant: EncodeVariantOptions = {},
): Promise<void> {
  const extension = options.segmentType === "fmp4" ? "m4s" : "ts";

  const playlist = join(outputDirectory, "index.m3u8");

  const args: string[] = [
    "-y",
    "-i",
    source,

    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
  ];

  /*
   * SINGLE MODE:
   *
   * Do not encode the streams again.
   * FFmpeg only remuxes/segments them into HLS.
   */
  if (options.mode === "single") {
    args.push(
      "-c:v",
      "copy",

      "-c:a",
      "copy",
    );
  } else {
    /*
     * ADAPTIVE MODE:
     *
     * Each rendition needs to be encoded because
     * resolution and bitrate are changed.
     */
    args.push(
      "-c:v",
      "libx264",

      "-preset",
      options.preset,

      "-crf",
      String(options.crf),

      "-pix_fmt",
      "yuv420p",

      "-c:a",
      "aac",

      "-b:a",
      "128k",
    );

    if (variant.height !== undefined) {
      args.push(
        "-vf",
        `scale=-2:${variant.height}:force_original_aspect_ratio=decrease`,
      );
    }

    if (variant.bitrate !== undefined) {
      const bitrate = bitrateToNumber(variant.bitrate);

      args.push(
        "-b:v",
        variant.bitrate,

        "-maxrate",
        variant.bitrate,

        "-bufsize",
        String(Math.round(bitrate * 1.5)),
      );
    }
  }

  args.push(
    "-f",
    "hls",

    "-hls_time",
    String(options.segmentDuration),

    "-hls_playlist_type",
    "vod",

    "-hls_segment_filename",
    join(outputDirectory, `segment-%05d.${extension}`),
  );

  if (options.segmentType === "fmp4") {
    args.push(
      "-hls_segment_type",
      "fmp4",

      "-hls_fmp4_init_filename",
      "init.mp4",
    );
  }

  args.push(playlist);

  await runFfmpeg(options.ffmpegPath, args);
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
