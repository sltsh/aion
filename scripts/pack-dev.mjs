import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// VS Code keys its cached colour theme by extension id and version, and restores that
// cache at startup before the extension loads. Reinstalling the same version leaves the
// old colours on screen however many times you pass --force. Every test build therefore
// gets its own version. 0.1.0 stays free for the release.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'packages/vscode');
const manifest = join(dir, 'package.json');
const original = readFileSync(manifest, 'utf8');
const release = JSON.parse(original).version;

// The counter lives in a file rather than in the archive names. VS Code keeps the cached
// theme of a version that is still installed after its archive is deleted, so a counter
// read from the directory hands the editor a version it already holds.
const counter = join(dir, '.dev-version');
const archive = (name) => new RegExp(`^aion-${release}-dev\\.(\\d+)\\.vsix$`).exec(name);

const next = () => {
  const recorded = existsSync(counter) ? Number(readFileSync(counter, 'utf8').trim()) : 0;
  const used = readdirSync(dir).map(archive).filter((match) => match !== null)
    .map((match) => Number(match[1]));
  const number = Math.max(0, Number.isFinite(recorded) ? recorded : 0, ...used) + 1;
  writeFileSync(counter, `${number}\n`);
  return `${release}-dev.${number}`;
};

const version = next();
try {
  writeFileSync(manifest, original.replace(`"version": "${release}"`, `"version": "${version}"`));
  execFileSync('npx', ['vsce', 'package', '--no-dependencies', '--pre-release'], { cwd: dir, stdio: 'inherit' });
} finally {
  writeFileSync(manifest, original);
}
// Only this script's own earlier archives are removed. A release candidate or an
// unrelated archive in the same directory is not this script's to delete.
for (const name of readdirSync(dir)) {
  if (archive(name) !== null && name !== `aion-${version}.vsix`) rmSync(join(dir, name));
}
console.log(`\npacked ${version}; ${release} stays free for the release`);
