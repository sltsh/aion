import { readFileSync, readdirSync } from 'node:fs';

const tag = process.argv[2];
const version = tag?.replace(/^v/, '');

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`expected a tag of the form v1.2.3, got ${tag ?? '(nothing)'}`);
  process.exit(1);
}

const manifests = readdirSync('packages', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `packages/${entry.name}/package.json`);

const wrong = manifests
  .map((path) => ({ path, ...JSON.parse(readFileSync(path, 'utf8')) }))
  .filter((manifest) => manifest.version !== version);

for (const manifest of wrong) {
  console.error(`${manifest.path} is ${manifest.version}, the tag says ${version}`);
}

const css = JSON.parse(readFileSync('packages/css/package.json', 'utf8'));
const dependencyMatches = css.dependencies['@sltsh/aion-tokens'] === version;
if (!dependencyMatches) {
  console.error(`CSS must depend on @sltsh/aion-tokens ${version}`);
}

if (wrong.length > 0 || !dependencyMatches) process.exit(1);
console.log(`${manifests.length} packages are at ${version}`);
