import type { HlsPluginOptions, ResolvedHlsOptions } from "./types";

export function resolveOptions(
  input: HlsPluginOptions = {},
): ResolvedHlsOptions {
  const common = {
    segmentDuration: input.segmentDuration ?? 4,

    segmentType: input.segmentType ?? "fmp4",

    outputDir: input.outputDir ?? "assets/hls",

    preset: input.preset ?? "medium",

    crf: input.crf ?? 23,
  };

  if (input.mode === "adaptive") {
    if (!input.variants || input.variants.length === 0) {
      throw new Error(
        "[vite-plugin-hls] Adaptive mode requires at least one variant.",
      );
    }

    return {
      ...common,
      mode: "adaptive",
      variants: input.variants,
    };
  }

  return {
    ...common,
    mode: "single",
  };
}
