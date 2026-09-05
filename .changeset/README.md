# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage
versions, changelogs, and npm releases.

## How it works

- A **changeset** is a markdown file in `.changeset/` describing an intended
  version bump (`patch`, `minor`, or `major`) plus a human-readable summary.
- When a pull request changes behavior, add a changeset with:

  ```sh
  npm run changeset
  ```

- When changesets are merged to `main`, the `Release` GitHub Actions workflow
  opens (or updates) a **Version Packages** pull request. Merging that PR bumps
  versions, updates the changelog, and (on the merged commit) publishes to npm.

Only edit the files in this directory that are _not_ ignored (see `.gitignore`).
