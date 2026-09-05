import { defineConfig } from "vitepress";
import { hlsVideos } from "../../src/index";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "vite-plugin-hls",
  description: "Transcode video imports to HLS at Vite build time.",
  // GitHub Pages project site lives under /vite-plugin-hls/; keep local /.
  base: process.env.VITEPRESS_BASE || "/",
  vite: {
    // vite-plugin-hls types against the standalone `vite` peer (v8), while
    // VitePress bundles its own `vite` (v5); the two `Plugin` types don't
    // match, so silence the cross-version mismatch here.
    // @ts-expect-error - cross-version vite `Plugin` mismatch
    plugins: [hlsVideos()],
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Quick Start", link: "/quick-start" },
      { text: "Demo", link: "/demo" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Quick Start", link: "/quick-start" },
          { text: "Demo", link: "/demo" },
        ],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/Karsten-Zhou/vite-plugin-hls",
      },
    ],
  },
});
