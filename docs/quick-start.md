# Quick Start

`vite-plugin-hls` transcodes video files to **HLS** (HTTP Live Streaming) at
Vite build time. Import a video like any other module and receive a string with
the URL of the generated HLS playlist.

## Installation

```sh
npm install -D @karsten_zhou/vite-plugin-hls
```

`vite` is a peer dependency. Encoding is powered by `node-av`, which downloads
a platform FFmpeg build on install.

## Usage

Add the plugin to your Vite config:

```ts
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

Then import any supported video in your app:

```ts
import videoUrl from "./assets/video.mp4";
// videoUrl -> "/assets/hls/my-video-<hash>/master.m3u8"
```

The URL works under any Vite `base` and in SSR builds.

## Options

| Option            | Type                     | Default        | Description                                    |
| ----------------- | ------------------------ | -------------- | ---------------------------------------------- |
| `mode`            | `"single" \| "adaptive"` | `"single"`     | `"single"` remuxes; `"adaptive"` re-encodes.   |
| `variants`        | `HlsVariant[]`           | —              | Required in `adaptive` mode.                   |
| `segmentDuration` | `number`                 | `4`            | HLS segment duration in seconds.               |
| `segmentType`     | `"fmp4" \| "mpegts"`     | `"fmp4"`       | HLS segment container format.                  |
| `outputDir`       | `string`                 | `"assets/hls"` | Directory (inside Vite output) for HLS assets. |
| `preset`          | `string`                 | `"medium"`     | FFmpeg preset used in adaptive mode.           |
| `crf`             | `number`                 | `23`           | H.264 CRF used in adaptive mode.               |

## Supported video extensions

`.mp4`, `.mov`, `.m4v`, `.webm`, `.mkv`, `.avi`

## How it works

1. `resolveId` intercepts video imports and maps them to a virtual module.
2. `load` transcodes the source into an HLS folder (once per build).
3. The playlist and segments are emitted into `outputDir`, and the module's
   default export is the resolved public playlist URL.
