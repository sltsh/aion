# Releasing Aion

The tag is the trigger. `.github/workflows/release.yml` runs every gate again, packages the
extension, publishes it to both marketplaces and creates the GitHub release.

## One-time setup

1. Create a Visual Studio Marketplace publisher named `sltsh` and an Azure DevOps personal
   access token with the **Marketplace: Manage** scope.
2. Create the Open VSX namespace once, from your own machine:
   `npx ovsx create-namespace sltsh -p <token>`.
3. Add both tokens as secrets on the `marketplace` environment: `VSCE_PAT` and `OVSX_PAT`.
   Use an environment rather than repository secrets, so a publish can require a review.

Do not approve the `keytar` or `@vscode/vsce-sign` install scripts to work around a local
failure. Publishing uses `VSCE_PAT` and needs neither.

## Every release

1. Move the `## Unreleased` heading in `CHANGELOG.md` to the new version number and add a
   fresh `## Unreleased` above it. The release fails without a section for the version.
2. Set the same version in all four `packages/*/package.json` files.
3. Commit, then tag: `git tag v0.2.0 && git push origin v0.2.0`.

`scripts/check-version.mjs` compares the tag against every package. `scripts/release-notes.mjs`
takes the changelog section and appends the commits since the previous tag, grouped by the
verb that opens each subject line.

## The channel

A `0.x` version publishes with `--pre-release` and the GitHub release is marked pre-release.
The first `1.0.0` tag publishes to the stable channel. Nothing else changes.

The flag is baked into the `.vsix` at package time, so the publish steps take the package as
it was built. Do not add `--pre-release` to a publish command.

## A rehearsal

Run the workflow by hand from the Actions tab with `dry_run` left on. It runs every gate,
packages the extension and writes the notes, then stops before both publish steps and
uploads the result as an artifact.
