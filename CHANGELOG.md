# @karsten_zhou/vite-plugin-hls

## 1.1.2

### Patch Changes

- Ensure the fMP4 init segment is written next to the playlist on every
  platform, so no stray `init.mp4` leaks into the project root.

## 1.1.1

### Patch Changes

- fix output file displacement

## 1.1.0

### Minor Changes

- `node-av` integration + e2e test
- Replace the stale `ffmpeg-static` dependency with the actively maintained
  [`node-av`](https://github.com/seydx/node-av) native FFmpeg bindings.

  - Encoding now runs FFmpeg in-process via `node-av`'s high-level API
    (Demuxer → Decoder → Filter/Encoder → Muxer) driving the native `hls` muxer,
    instead of spawning an `ffmpeg-static` binary.
  - **Breaking:** the `ffmpegPath` option is removed — the platform FFmpeg build
    is downloaded and managed by `node-av` during install.

## 1.0.1

### Patch Changes

- Fix ffmpeg failing with "Failed to open segment" / "No such file or directory" by ensuring the HLS output directory exists before encoding.

## 1.0.0 (2026-09-06)

Initial stable release.

### Features

- **Single mode** — remuxes and segments a video into HLS without re-encoding.
- **Adaptive mode** — encodes multiple resolution/bitrate renditions and writes a
  master playlist.
- **Persistent cache** — encoding output is keyed by source content and options,
  and reused across client/SSR and repeated builds.
- Imports return the public HLS playlist URL via `import.meta.env.BASE_URL`, so
  it works under any Vite `base`.
- Published as ESM + CJS with type declarations; `vite` is a peer dependency.
