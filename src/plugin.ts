import type { Plugin, ResolvedConfig } from "vite";

import { resolveOptions } from "./options";
import {
  isVideoSource,
  resolveVideoSource,
  sourceFromVirtualId,
  virtualIdForSource,
} from "./resolve";
import { generateHls } from "./hls";
import { emitHls, publicManifestExpression } from "./assets";
import type { HlsPluginOptions } from "./types";

const VIRTUAL_PREFIX = "\0vite-plugin-hls:";

export function hlsVideos(input?: HlsPluginOptions): Plugin {
  const options = resolveOptions(input);

  let config: ResolvedConfig;

  const resolvedSources = new Map<string, string>();

  /*
   * This only caches inside the current Vite build.
   *
   * The persistent cache in cache.ts handles the
   * client/server build boundary.
   */
  const generated = new Map<string, Awaited<ReturnType<typeof generateHls>>>();

  return {
    name: "vite-plugin-hls",

    apply: "build",

    enforce: "pre",

    configResolved(resolved) {
      config = resolved;
    },

    async resolveId(source, importer) {
      if (!importer || !isVideoSource(source)) {
        return undefined;
      }

      const resolved = await resolveVideoSource(source, importer, this);

      if (!resolved) {
        return undefined;
      }

      const id = virtualIdForSource(resolved);

      resolvedSources.set(id, resolved);

      return id;
    },

    async load(id, loadOptions) {
      if (!id.startsWith(VIRTUAL_PREFIX)) {
        return undefined;
      }

      const source = resolvedSources.get(id) ?? sourceFromVirtualId(id);

      let result = generated.get(source);

      if (!result) {
        result = await generateHls(source, config.cacheDir, options);

        generated.set(source, result);
      }

      /*
       * Important:
       *
       * The SSR build must NOT use Vite's emitted-file
       * URL because that resolves to a file:// URL.
       *
       * We only emit the actual files during the client
       * build. SSR receives the public URL directly.
       */
      if (!loadOptions?.ssr) {
        emitHls(this, result, options);
      }

      const manifest = publicManifestExpression(result, options);

      return `
        export default ${manifest};
      `;
    },
  };
}
