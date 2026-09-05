import { execFile } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

import { ffmpegPath } from "node-av/ffmpeg";

const execFileAsync = promisify(execFile);

export const artifactsDir = join(import.meta.dirname, ".artifacts");

export const downloadedVideo = join(artifactsDir, "sample-downloaded.mp4");
export const generatedVideo = join(artifactsDir, "sample-generated.mp4");

const SOURCE_URLS = [
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
  "https://download.samplelib.com/mp4/sample-5s.mp4",
];

const DOWNLOAD_TIMEOUT_MS = 8_000;

async function download(url: string, dest: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error(`empty download for ${url}`);
    }
    writeFileSync(dest, bytes);
  } finally {
    clearTimeout(timer);
  }
}

async function generateSample(dest: string): Promise<void> {
  const binary = ffmpegPath();
  if (!binary) {
    throw new Error("node-av ffmpeg binary not available");
  }
  await execFileAsync(binary, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc=duration=2:size=320x180:rate=15",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=1000:duration=2",
    "-shortest",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    dest,
  ]);
}

/**
 * Returns a real, decodable source video under the git-ignored artifacts dir.
 *
 * Prefers a downloaded, real-world sample; falls back to generating a clip
 * with node-av's bundled ffmpeg when the network is unavailable. The result is
 * cached so repeated runs reuse it.
 */
export async function ensureSampleVideo(): Promise<string> {
  mkdirSync(artifactsDir, { recursive: true });

  if (existsSync(downloadedVideo)) {
    return downloadedVideo;
  }

  for (const url of SOURCE_URLS) {
    try {
      await download(url, downloadedVideo);
      return downloadedVideo;
    } catch {
      // Try the next source, then fall back to generating.
    }
  }

  await generateSample(generatedVideo);
  return generatedVideo;
}

export function cleanArtifacts(): void {
  rmSync(artifactsDir, { recursive: true, force: true });
}
