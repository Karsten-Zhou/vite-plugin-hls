# Contributing to vite-plugin-hls

Thanks for helping! This document covers local setup, common commands, and the
release process.

## Local setup

Prerequisites: [Node.js](https://nodejs.org) `>=24.3` and npm.

```sh
npm install
```

The package manager is **npm**; always commit the resulting `package-lock.json`.

## Commands

| Command                 | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `npm run dev`           | Run tests in watch mode                                      |
| `npm test`              | Run the test suite once                                      |
| `npm run test:coverage` | Run tests with coverage report                               |
| `npm run typecheck`     | Type-check the project                                       |
| `npm run lint`          | Lint with ESLint                                             |
| `npm run lint:fix`      | Lint and auto-fix                                            |
| `npm run format`        | Format with Prettier                                         |
| `npm run format:check`  | Verify formatting                                            |
| `npm run build`         | Build the library with tsup (ESM + CJS + types)              |
| `npm run check`         | Run all quality gates (typecheck, lint, format, test, build) |

To verify the project locally:

```sh
npm install
npm run check
```

## Project structure

```
src/            Library source
  index.ts      Public entry point
  plugin.ts     The Vite plugin
  types.ts      Public option/variant types
  options.ts    Option resolution + validation
  resolve.ts    Video module resolution helpers
  playlist.ts   Slug + master playlist helpers
  bitrate.ts    Bitrate parsing
  encoder.ts    node-av encode/remux into HLS
  cache.ts      Persistent cache on disk
  hls.ts        Transcode orchestration
  assets.ts     Emitting assets + manifest URL
  fs.ts         Directory helpers
test/
  unit/         Unit tests
  integration/  Real Vite-build integration tests
```

Only `dist/` is published. The public API is `hlsVideos` (also the default
export) and the types `HlsPluginOptions` / `HlsVariant`.

## Tests

- Unit tests live in `test/unit/` and cover pure logic (options, resolution,
  playlists, cache, error handling) plus plugin hooks with the `node-av`
  layer mocked.
- `test/integration/vite-build.test.ts` runs a real Vite build with a canned
  encode result to verify assets are emitted end to end.
- Unit and integration tests never require a real `node-av`/ffmpeg binary and
  must be deterministic. They run via `npm test` / `npm run check`.

### E2E tests

`test/e2e/` runs the **real** `node-av` encode against a real source video and
asserts a playable HLS output. They are excluded from the default gate because
they need the native `node-av` binary (downloads on install) and network:

- Media inputs and outputs live under the git-ignored `test/e2e/.artifacts/`.
  A known sample video is downloaded when possible; otherwise a clip is
  generated with node-av's bundled ffmpeg. Nothing media-related is tracked.
- Run with `npm run test:e2e`. Remove downloaded/encoded artifacts with
  `npm run test:e2e:clean`.

## Lint / format / typecheck

- ESLint (flat config, `eslint.config.mjs`) with `typescript-eslint`.
- Prettier (`prettier.config.mjs`). Run `npm run format` before committing.
- TypeScript (`tsconfig.json`) is strict; run `npm run typecheck`.

## Conventional Commits

Commit messages are validated by **Commitlint** with the Conventional Commits
config. Use one of the supported types (`feat`, `fix`, `docs`, `refactor`,
`test`, `chore`, ...) followed by a short summary:

```sh
feat: add adaptive mode option
fix: avoid emitting stray cache manifest
docs: clarify SSR behavior
test: cover option validation
chore: update dependencies
```

Keep the subject lowercase and under ~72 characters. See
[`commitlint`](https://commitlint.js.org/) for details.

## Branch & PR expectations

- Work on a feature branch, e.g. `feat/...`, `fix/...`.
- Open a pull request against `main`.
- CI runs typecheck, lint, formatting, tests, and the build on Node 24 (current LTS).
  All must pass before merging.
- If a change alters behavior, add a changeset (see below).

## Release process

Releases are automated with [Changesets](https://github.com/changesets/changesets)
and GitHub Actions (`.github/workflows/release.yml`).

1. After a code change, add a changeset:

   ```sh
   npm run changeset
   ```

   Choose `patch`/`minor`/`major` and describe the change.

2. Merge your PR. The `Release` workflow opens a **Version Packages** pull
   request with the version bump and changelog updates.
3. Merge that PR; the workflow then builds and publishes to npm and creates a
   GitHub release.

### Required GitHub / npm configuration

- The repository must live on GitHub with `main` as the default branch.
- npm CLI `>=11.5.1` is required (the workflow upgrades npm before publishing);
  provenance attestations are generated automatically.
- The `repository` field in `package.json` must case-sensitively match the
  GitHub repository so provenance can be generated.
