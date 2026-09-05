export interface HlsVariant {
  height: number;
  bitrate: string;
}

export interface HlsCommonOptions {
  /**
   * Explicit ffmpeg executable.
   *
   * Defaults to ffmpeg-static, then falls back to "ffmpeg".
   */
  ffmpegPath?: string;

  /**
   * HLS segment duration in seconds.
   *
   * @default 4
   */
  segmentDuration?: number;

  /**
   * HLS segment format.
   *
   * @default "fmp4"
   */
  segmentType?: "fmp4" | "mpegts";

  /**
   * Directory inside Vite's output directory.
   *
   * @default "assets/hls"
   */
  outputDir?: string;

  /**
   * FFmpeg encoding preset.
   *
   * @default "medium"
   */
  preset?: string;

  /**
   * H.264 CRF.
   *
   * @default 23
   */
  crf?: number;
}

export type HlsPluginOptions =
  | (HlsCommonOptions & {
      mode?: "single";
      variants?: never;
    })
  | (HlsCommonOptions & {
      mode: "adaptive";
      variants: HlsVariant[];
    });

export type ResolvedHlsOptions =
  | {
      mode: "single";
      ffmpegPath: string;
      segmentDuration: number;
      segmentType: "fmp4" | "mpegts";
      outputDir: string;
      preset: string;
      crf: number;
    }
  | {
      mode: "adaptive";
      variants: HlsVariant[];
      ffmpegPath: string;
      segmentDuration: number;
      segmentType: "fmp4" | "mpegts";
      outputDir: string;
      preset: string;
      crf: number;
    };

export interface CachedHls {
  directoryName: string;
  manifest: string;
  files: Map<string, Buffer>;
}
