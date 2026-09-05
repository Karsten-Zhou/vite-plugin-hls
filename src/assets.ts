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
  base: string,
): string {
  const path = `${options.outputDir}/${result.directoryName}/${result.manifest}`;

  /*
   * Bake Vite's resolved base straight into the module. Vite does not always
   * statically replace import.meta.env.BASE_URL (e.g. in SSR bundles), where
   * import.meta.env is undefined at runtime and crashes. Emitting the base as
   * a plain string is equivalent and works for client and SSR alike.
   *
   * Examples (base -> export):
   *
   *   "/"     -> "/assets/hls/..."
   *   "/notes/" -> "/notes/assets/hls/..."
   */
  return JSON.stringify(`${base}${path}`);
}
