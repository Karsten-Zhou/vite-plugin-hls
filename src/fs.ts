import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

/**
 * Recursively collects every file under `directory` into a map of
 * directory-relative POSIX paths to their buffer contents.
 */
export async function collectFiles(
  directory: string,
): Promise<Map<string, Buffer>> {
  const result = new Map<string, Buffer>();

  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const filename = join(current, entry.name);

      if (entry.isDirectory()) {
        await visit(filename);
        continue;
      }

      result.set(
        relative(directory, filename).replaceAll("\\", "/"),
        await readFile(filename),
      );
    }
  }

  await visit(directory);

  return result;
}
