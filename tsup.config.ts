import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node20",
  // vite is a peer dependency; ffmpeg-static ships platform binaries
  // and must be resolved at runtime from node_modules.
  external: ["vite", "ffmpeg-static"],
});
