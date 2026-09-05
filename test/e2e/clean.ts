// Removes git-ignored e2e artifacts: `npm run test:e2e:clean`.
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const artifacts = join(dirname(fileURLToPath(import.meta.url)), ".artifacts");
rmSync(artifacts, { recursive: true, force: true });
