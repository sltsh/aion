import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
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

const next = () => {
  const used = readdirSync(dir)
    .map((name) => new RegExp(`^aion-${release}-dev\\.(\\d+)\\.vsix$`).exec(name))
    .filter((match) => match !== null)
    .map((match) => Number(match[1]));
  return `${release}-dev.${Math.max(0, ...used) + 1}`;
};

const version = next();
try {
  writeFileSync(manifest, original.replace(`"version": "${release}"`, `"version": "${version}"`));
  execFileSync('npx', ['vsce', 'package', '--no-dependencies', '--pre-release'], { cwd: dir, stdio: 'inherit' });
} finally {
  writeFileSync(manifest, original);
}
for (const name of readdirSync(dir)) {
  if (name.endsWith('.vsix') && !name.includes('-dev.')) rmSync(join(dir, name));
}
console.log(`\npacked ${version}; ${release} stays free for the release`);
