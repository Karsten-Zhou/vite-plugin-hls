import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node20",
  // vite is a peer dependency; node-av is a native addon that ships
  // platform binaries and must be resolved at runtime from node_modules.
  external: ["vite", "node-av"],
});
