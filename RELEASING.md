# Releasing Aion

The tag is the trigger. `.github/workflows/release.yml` runs every gate again, packages the
extension, publishes tokens and CSS to npm, publishes the extension to both marketplaces
and creates the GitHub release.

## What deploys where

| Artefact | Destination | Light support |
| --- | --- | --- |
| `@sltsh/aion-tokens` | npm | Dark and Light exports |
| `@sltsh/aion-css` | npm | Dark and Light custom properties |
| VS Code extension | Visual Studio Marketplace, Open VSX and the GitHub release | Aion and Aion Light in one VSIX |
| Windows Terminal fragment | Repository and public-site download | Dark standalone scheme only |
| Public site | GitHub Pages on pushes to `main` | Light remains hidden while `lightVisible` is disabled |
| Lab | None | Local development tool only |

The release workflow publishes package artefacts only from a version tag. A push to
`main` deploys the public site separately through `pages.yml`; it does not publish npm or
marketplace packages.

## One-time setup

1. Create a Visual Studio Marketplace publisher named `sltsh` and an Azure DevOps personal
   access token with the **Marketplace: Manage** scope.
2. Create the Open VSX namespace once, from your own machine:
   `npx ovsx create-namespace sltsh -p <token>`.
3. Add both tokens as secrets on the `marketplace` environment: `VSCE_PAT` and `OVSX_PAT`.
   Use an environment rather than repository secrets, so a publish can require a review.

Do not approve the `keytar` or `@vscode/vsce-sign` install scripts to work around a local
failure. Publishing uses `VSCE_PAT` and needs neither.

## npm setup (once per package)

The npm packages use [trusted publishing](https://docs.npmjs.com/trusted-publishers/)
from GitHub Actions. No npm access token or GitHub npm secret is needed. The workflow
uses npm 11.17.0 and grants `id-token: write` for OIDC authentication.

1. Confirm your npm account owns the `@sltsh` user or organization scope and can publish
   public packages there. Enable two-factor authentication on the account.
2. After this setup is merged, bootstrap the two packages from that checkout. npm's
   trusted-publisher settings are on an existing package, so the first publication uses
   your local browser login. Run the build and all gates before publishing:

   ```sh
   npm ci
   npm run build
   npm run verify
   npm test
   npm run typecheck
   npm login --auth-type=web --registry=https://registry.npmjs.org/
   npm whoami --registry=https://registry.npmjs.org/
   npm publish -w @sltsh/aion-tokens --tag latest
   npm publish -w @sltsh/aion-css --tag latest
   ```

   These last two commands publish real packages. Follow npm's browser/2FA prompts;
   do not put credentials in the repository. If a version already exists, skip that
   package. The `prepack` hooks rebuild each package before it is packed or published;
   the root build creates tokens before CSS reads them.
3. On npmjs.com, open each package's **Settings → Trusted publishing** and add GitHub
   Actions with these values:

   | Field | Value |
   | --- | --- |
   | Organization or user | `sltsh` |
   | Repository | `aion` |
   | Workflow filename | `release.yml` |
   | Environment | `marketplace` |
   | Allowed actions | Enable direct `npm publish` |

   Configure both `@sltsh/aion-tokens` and `@sltsh/aion-css`. The environment is the
   existing GitHub release environment, not an npm scope.
4. Run the next version through the release workflow to verify OIDC authentication.
   A dry run checks packaging but cannot prove that npm trusts the workflow.

The workflow publishes only these two npm packages, in dependency order. Terminal
remains a file download and VS Code remains a marketplace extension. Existing npm
versions are skipped on retries; registry errors other than a missing version stop
publication. Published versions are immutable: corrections need a new version.

## Every release

1. Move the `## Unreleased` heading in `CHANGELOG.md` to the new version number and add a
   fresh `## Unreleased` above it. The release fails without a section for the version.
2. Set the same version in all four `packages/*/package.json` files and in CSS's exact
   `@sltsh/aion-tokens` dependency. Run `npm install --package-lock-only --ignore-scripts`
   to refresh the lockfile.
3. For a release containing Aion Light, package and install the VSIX once before tagging.
   Confirm that **Aion Light** appears as a theme and record the native checks in
   `PLAN.md`; the calculation and lab preview do not replace this step.
4. Commit, then tag and push the chosen version. A Light feature release would normally
   use the next pre-`1.0` minor version, for example `v0.4.0`.

`scripts/check-version.mjs` compares the tag against every package. `scripts/release-notes.mjs`
takes the changelog section and appends the commits since the previous tag, grouped by the
verb that opens each subject line.

## The channel

A `0.x` version publishes with `--pre-release` and the GitHub release is marked pre-release.
The first `1.0.0` tag publishes to the stable marketplace channel. npm packages use
`latest`, including `0.x`, so ordinary `npm install @sltsh/aion-css` works. The npm
channel is independent of the marketplace pre-release flag.

The flag is baked into the `.vsix` at package time, so the publish steps take the package as
it was built. Do not add `--pre-release` to a publish command.

## A rehearsal

Run the workflow by hand from the Actions tab with `dry_run` left on. It runs every gate,
packages the extension, checks both npm packages with `npm publish --dry-run`, and writes
the notes. It skips all publishing and GitHub release creation, then uploads the VSIX
and notes as an artifact. Use a new tag whose checkout includes this workflow; rerunning
an old tag uses the old workflow and source.
