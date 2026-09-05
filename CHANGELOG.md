# @karsten_zhou/vite-plugin-hls

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
