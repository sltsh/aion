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
const obsidianPackage = JSON.parse(readFileSync('packages/obsidian/package.json', 'utf8'));
const obsidian = JSON.parse(readFileSync('manifest.json', 'utf8'));
if (obsidian.version !== version) {
  console.error(`Obsidian manifest is ${obsidian.version}, the tag says ${version}`);
}
const dependencyMatches = css.dependencies['@sltsh/aion-tokens'] === version;
if (!dependencyMatches) {
  console.error(`CSS must depend on @sltsh/aion-tokens ${version}`);
}

const obsidianDependenciesMatch = ['@sltsh/aion-css', '@sltsh/aion-tokens']
  .every((name) => obsidianPackage.dependencies[name] === version);
if (!obsidianDependenciesMatch) {
  console.error(`Obsidian must depend on Aion CSS and tokens ${version}`);
}

if (wrong.length > 0 || !dependencyMatches || !obsidianDependenciesMatch || obsidian.version !== version) process.exit(1);
console.log(`${manifests.length} packages are at ${version}`);
