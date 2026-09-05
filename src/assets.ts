import type { PluginContext } from "rolldown";

import type { CachedHls, ResolvedHlsOptions } from "./types";

export function emitHls(
  context: PluginContext,
  result: CachedHls,
  options: ResolvedHlsOptions,
): void {
  const prefix = `${options.outputDir}/${result.directoryName}`;

  const manifestSource = result.files.get(result.manifest);

  if (!manifestSource) {
    throw new Error(`[vite-plugin-hls] Missing manifest ${result.manifest}`);
  }

  context.emitFile({
    type: "asset",
    fileName: `${prefix}/${result.manifest}`,
    source: manifestSource,
  });

  for (const [filename, data] of result.files) {
    if (filename === result.manifest) {
      continue;
    }

    context.emitFile({
      type: "asset",
      fileName: `${prefix}/${filename}`,
      source: data,
    });
  }
}

export function publicManifestExpression(
  result: CachedHls,
  options: ResolvedHlsOptions,
): string {
  const path = `${options.outputDir}/${result.directoryName}/${result.manifest}`;

  /*
   * BASE_URL is replaced by Vite in both the client
   * and SSR builds.
   *
   * Examples:
   *
   *   "/"       -> /assets/hls/...
   *   "/notes/" -> /notes/assets/hls/...
   *   "./"      -> ./assets/hls/...
   */
  return `import.meta.env.BASE_URL + ${JSON.stringify(path)}`;
}
