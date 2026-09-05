import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";

import { hlsVideos } from "../../src/index";

const { generateHls } = vi.hoisted(() => ({ generateHls: vi.fn() }));

vi.mock("../../src/hls", () => ({ generateHls }));

const directoryName = "clip-abcdef123456";

const canned = {
  directoryName,
  manifest: "index.m3u8",
  files: new Map<string, Buffer>([
    ["index.m3u8", Buffer.from("#EXTM3U\n#EXTINF:4,\nsegment\n")],
    ["init.mp4", Buffer.from("init")],
    ["segment-00001.m4s", Buffer.from("seg")],
  ]),
};

let root = "";
let outDir = "";

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "vite-plugin-hls-proj-"));
  outDir = join(root, "dist");

  await writeFile(
    join(root, "index.html"),
    [
      "<!doctype html><html><body>",
      '<script type="module" src="/main.ts"></script>',
      "</body></html>",
    ].join(""),
  );
  await writeFile(
    join(root, "main.ts"),
    ['import video from "/video.mp4";', "console.log(video);"].join("\n"),
  );
  await writeFile(join(root, "video.mp4"), Buffer.from("fake video bytes"));

  generateHls.mockResolvedValue(canned);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

async function findFiles(
  directory: string,
  predicate: (relativePath: string) => boolean,
): Promise<string[]> {
  const matches: string[] = [];

  async function visit(current: string): Promise<void> {
    for (const entry of await (
      await import("node:fs/promises")
    ).readdir(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      const relative = absolute.slice(outDir.length + 1).replaceAll("\\", "/");

      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (predicate(relative)) {
        matches.push(absolute);
      }
    }
  }

  await visit(directory);
  return matches;
}

describe("vite build integration", () => {
  it("emits HLS assets and references the manifest from the bundle", async () => {
    await build({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [hlsVideos({ mode: "single", outputDir: "assets/hls" })],
      build: { outDir, emptyOutDir: true },
    });

    const prefix = "assets/hls/" + directoryName;

    const manifestPath = await findFiles(
      outDir,
      (p) => p === `${prefix}/index.m3u8`,
    );
    expect(manifestPath).toHaveLength(1);
    expect(await readFile(manifestPath[0]!, "utf8")).toContain("#EXTM3U");

    const emitted = await findFiles(outDir, (p) => p.startsWith(prefix));
    expect(
      emitted.map((p) => p.slice(outDir.length + 1).replaceAll("\\", "/")),
    ).toEqual(
      expect.arrayContaining([
        `${prefix}/index.m3u8`,
        `${prefix}/init.mp4`,
        `${prefix}/segment-00001.m4s`,
      ]),
    );

    // The generated JS bundle references the manifest URL.
    const jsFiles = await findFiles(outDir, (p) => p.endsWith(".js"));
    const bundle = await readFile(jsFiles[0]!, "utf8");
    expect(bundle).toContain(`${prefix}/index.m3u8`);
  }, 30_000);
});
