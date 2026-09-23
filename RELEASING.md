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

1. Move the `## Unreleased` heading in `CHANGELOG.md` to the new version number and add a
   fresh `## Unreleased` above it. The release fails without a section for the version.
2. Set the same version in all five `packages/*/package.json` files, the root Obsidian
   `manifest.json`, CSS's exact `@sltsh/aion-tokens` dependency, and Obsidian's exact
   CSS and token dependencies. Run `npm install --package-lock-only --ignore-scripts`
   to refresh the lockfile.
3. Reuse the VS Code native acceptance in `PLAN.md` while the packaged theme contents
   remain unchanged. If they change, package and install the VSIX, confirm that **Aion
   Light** appears as a theme, and record the native results in `PLAN.md`.
4. Reuse the Obsidian native acceptance in `PLAN.md` while the stylesheet and theme
   behavior remain unchanged; a version-field change alone does not invalidate it. If the
   theme changes, install the generated files in Obsidian, check both base color schemes
   in reading, live preview, source mode, menus, dialogs and mobile, and record the results
   in `PLAN.md`. Capture a new community screenshot when a visual change affects the
   listing image.
5. Commit the release preparation, tag that commit as `vX.Y.Z`, then push the tag. The
   workflow creates the matching `X.Y.Z` release for Obsidian from that same commit.

`scripts/check-version.mjs` compares the tag against every package and the Obsidian manifest.
`scripts/release-notes.mjs`
takes the changelog section and appends the commits since the previous tag, grouped by the
verb that opens each subject line.

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
