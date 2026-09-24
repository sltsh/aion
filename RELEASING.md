# Releasing Aion

The tag is the trigger. `.github/workflows/release.yml` runs every gate again, packages the
extension, publishes tokens and CSS to npm, publishes the extension to both marketplaces,
and creates two GitHub releases: `vX.Y.Z` for the coupled release and `X.Y.Z` for Obsidian.
Obsidian requires a release tag that exactly matches `manifest.json`'s version.

## What deploys where

| Artefact | Destination | Light support |
| --- | --- | --- |
| `@sltsh/aion-tokens` | npm | Dark and Light exports |
| `@sltsh/aion-css` | npm | Dark and Light custom properties |
| VS Code extension | Visual Studio Marketplace, Open VSX and the GitHub release | Aion and Aion Light in one VSIX |
| Obsidian theme | GitHub release tagged `X.Y.Z`; community directory after separate submission | Dark and Light in one stylesheet |
| Windows Terminal fragment | Repository and public-site download | Dark standalone scheme only |
| Public site | GitHub Pages on pushes to `main` | Persistent Dark and Light switch using both emitted palettes |
| Lab | None | Local development tool only |

The release workflow publishes package artefacts only from a version tag. A push to
`main` deploys the public site separately through `pages.yml`; it does not publish npm or
marketplace packages. The private site workspace is independently versioned at `1.0.0`.

## Prerequisites

Publishing credentials and npm trusted publishing are configured outside this repository.
The workflow expects the `marketplace` GitHub environment to provide `VSCE_PAT` and
`OVSX_PAT`; npm publishing uses GitHub Actions OIDC rather than a repository token. Never
put credentials or account-specific setup details in this document.

Do not approve the `keytar` or `@vscode/vsce-sign` install scripts to work around a local
failure. CI publishing needs neither.

The workflow publishes only these two npm packages, in dependency order. Terminal
remains a file download and VS Code remains a marketplace extension. Existing npm
versions are skipped on retries; registry errors other than a missing version stop
publication. Published versions are immutable: corrections need a new version.

## Every release

Release from the feature branch once its work is committed and its `## Unreleased` entry in
`CHANGELOG.md` describes it:

```sh
npm run release -- patch        # or minor, major, or an exact X.Y.Z
```

`scripts/release.mjs` is the whole procedure. It stops, changing nothing, if the branch is
`main` or detached, the tree is dirty, `origin/main` is not an ancestor of the branch,
`vX.Y.Z` or `X.Y.Z` already exists, or `## Unreleased` is empty. It then moves the
changelog heading, sets the version in every `packages/*/package.json`, the exact
`@sltsh/aion-*` dependencies and `manifest.json`, refreshes the lockfile, and runs
`check-version`, build, typecheck, verify, test and `sync:design`. A failing gate, or a gate
that changes a file the release does not own, restores the tree and stops. Otherwise it
commits `Release Aion X.Y.Z`, tags it, and pushes `main` and the tag in one atomic push,
which fast-forwards `main` or is rejected and undone.

`PUSHED` means the tag is on GitHub; it does not mean anything is published. Add `--watch`
to follow the release workflow, which reports `PUBLISHED` or the failing run separately.
`--no-push` stops after the local commit and tag.

Native acceptance in `PLAN.md` carries forward while `theme.css` and
`packages/vscode/themes` are unchanged; a version change alone does not invalidate it. The
script prints a notice when they changed since the previous tag. Rechecking them in the
applications, and a new community screenshot for a visual change, belongs to the feature
branch, before the release.

`scripts/check-version.mjs` compares the tag against every package and the Obsidian
manifest. `scripts/release-notes.mjs` takes the changelog section and appends the commits
since the previous tag, grouped by the verb that opens each subject line.

## The channel

A `0.x` version publishes with `--pre-release` and the GitHub release is marked pre-release.
Versions `1.0.0` and later publish to the stable marketplace channel. npm packages use
`latest`, including `0.x`, so ordinary `npm install @sltsh/aion-css` works. The npm channel
is independent of the marketplace pre-release flag.

The flag is baked into the `.vsix` at package time, so the publish steps take the package as
it was built. Do not add `--pre-release` to a publish command.

## A rehearsal

Run the workflow by hand from the Actions tab with `dry_run` left on. It runs every gate,
packages the extension, checks both npm packages with `npm publish --dry-run`, and writes
the notes. It skips all publishing and GitHub release creation, then uploads the VSIX,
Obsidian files and notes as an artifact. Use a new tag whose checkout includes this workflow; rerunning
an old tag uses the old workflow and source.

Obsidian's community directory needs an owner-submitted listing after the GitHub release;
tag publication alone does not make the theme installable from within Obsidian. If a new
release is not reflected yet, use **Check for new releases** on its management page.
