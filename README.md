# vite-plugin-hls

Transcode video files to **HLS** (HTTP Live Streaming) at Vite build time using
[FFmpeg](https://ffmpeg.org/).

Import a video like any other module and receive a string with the URL of the
generated HLS playlist. The plugin segments the file (and, in adaptive mode,
encodes multiple renditions) during `vite build`, emits the `.m3u8` playlists
and `.m4s`/`.ts` segments into your output directory, and returns the URL you
can feed to an HLS player such as `hls.js`.

- **Single mode** — remuxes/segments the source into HLS without re-encoding.
- **Adaptive mode** — encodes multiple resolution/bitrate renditions and writes
  a master playlist.
- **Persistent cache** — the (expensive) encoding is keyed by source content
  and options, so repeated and client/SSR builds reuse the same output.

## Installation

```sh
npm install -D @karsten_zhou/vite-plugin-hls
```

[`vite`](https://vitejs.dev) is a **peer dependency**; install it if it is not
already present in your project. Encoding is powered by
[`node-av`](https://github.com/seydx/node-av), which downloads and manages a
platform-specific native FFmpeg build on install.

## Usage

Add the plugin to your Vite config:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { hlsVideos } from "@karsten_zhou/vite-plugin-hls";

export default defineConfig({
  plugins: [
    hlsVideos({
      mode: "adaptive",
      variants: [
        { height: 1080, bitrate: "3M" },
        { height: 720, bitrate: "1.5M" },
      ],
    }),
  ],
});
```

Then import any supported video file in your app:

```ts
// src/App.ts
import videoUrl from "./assets/video.mp4";
import Hls from "hls.js";

// videoUrl -> "/assets/hls/my-video-<hash>/master.m3u8"
const video = document.createElement("video");
if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(videoUrl);
  hls.attachMedia(video);
}
```

The plugin also exports `hlsVideos` as the default export, so
`import hlsVideos from "@karsten_zhou/vite-plugin-hls"` works as well.

## Options

| Option            | Type                     | Default        | Description                                                       |
| ----------------- | ------------------------ | -------------- | ----------------------------------------------------------------- |
| `mode`            | `"single" \| "adaptive"` | `"single"`     | `"single"` remuxes the source; `"adaptive"` encodes renditions.   |
| `variants`        | `HlsVariant[]`           | —              | Required in `adaptive` mode: `{ height, bitrate }` per rendition. |
| `segmentDuration` | `number`                 | `4`            | HLS segment duration in seconds.                                  |
| `segmentType`     | `"fmp4" \| "mpegts"`     | `"fmp4"`       | HLS segment container format.                                     |
| `outputDir`       | `string`                 | `"assets/hls"` | Directory (inside the Vite output) where HLS assets are written.  |
| `preset`          | `string`                 | `"medium"`     | FFmpeg `-preset` used in adaptive mode.                           |
| `crf`             | `number`                 | `23`           | H.264 CRF used in adaptive mode.                                  |

### Types

```ts
import type {
  HlsPluginOptions,
  HlsVariant,
} from "@karsten_zhou/vite-plugin-hls";
```

### Supported video extensions

`.mp4`, `.mov`, `.m4v`, `.webm`, `.mkv`, `.avi`

## How it works

1. `resolveId` intercepts imports of video files and maps them to a virtual module.
2. `load` transcodes the source with FFmpeg into an HLS output folder inside
   Vite's cache directory (only once per build — results are memoized).
3. The output is emitted as static assets into `outputDir`, and the module's
   default export is set to the resolved public URL of the playlist
   (`import.meta.env.BASE_URL` + path), so it works under any `base`.

### SSR note

During an SSR build the files are **not** emitted (Vite would otherwise resolve
the asset to a `file://` URL). Instead the public URL is returned directly, and
the actual files are emitted by the client build.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, commands, and the release
process.

## License

[MIT](./LICENSE)
