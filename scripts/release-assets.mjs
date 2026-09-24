import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

// Each port lists the files it attaches to the GitHub release in `aion.releaseAssets`,
// relative to its own directory. A `*` may stand in the file name, not in a directory.
const root = process.argv[2] ?? '.';

function expand(directory, pattern) {
  const path = join(directory, pattern);
  if (!pattern.includes('*')) return existsSync(path) ? [path] : [];
  const folder = dirname(path);
  const escaped = path.slice(folder.length + 1).replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const name = new RegExp(`^${escaped.replaceAll('*', '[^/]*')}$`);
  return existsSync(folder) ? readdirSync(folder).filter((entry) => name.test(entry)).sort().map((entry) => join(folder, entry)) : [];
}

const assets = [];
const missing = [];
for (const entry of readdirSync(join(root, 'packages'), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) continue;
  const directory = join(root, 'packages', entry.name);
  const manifest = join(directory, 'package.json');
  if (!existsSync(manifest)) continue;
  for (const pattern of JSON.parse(readFileSync(manifest, 'utf8')).aion?.releaseAssets ?? []) {
    const matched = expand(directory, pattern);
    if (matched.length === 0) missing.push(`packages/${entry.name}: ${pattern}`);
    assets.push(...matched.map((path) => relative(root, path)));
  }
}

if (missing.length > 0) {
  console.error(`no file matches these release assets; build and package first:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
console.log([...new Set(assets)].join('\n'));
