import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

const packageRoot = resolve(new URL('..', import.meta.url).pathname);
const repositoryRoot = resolve(packageRoot, '../..');

const snapshot = (): string => {
  const entries: string[] = [];
  const visit = (directory: string, relative: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ['.git', 'dist', 'node_modules'].includes(entry.name)) continue;
      const path = resolve(directory, entry.name);
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(path, name);
      else if (entry.isFile()) {
        const stat = statSync(path, { bigint: true });
        const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
        entries.push(`${name}:${stat.mtimeNs}:${hash}`);
      }
    }
  };
  visit(repositoryRoot, '');
  return entries.sort().join('\n');
};

test('imports the colour map from the built package without running the build', () => {
  const before = snapshot();
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { obsidianColors } from '@sltsh/aion-obsidian/colors';
    const dark = obsidianColors('dark');
    const light = obsidianColors('light');
    if (!dark['--background-primary'] || !light['--background-primary']) process.exit(1);
    process.stdout.write(JSON.stringify({ dark, light }));
  `], { cwd: packageRoot, encoding: 'utf8' });

  expect(child.error).toBeUndefined();
  expect(child.status, child.stderr).toBe(0);
  expect(JSON.parse(child.stdout)).toMatchObject({
    dark: { '--background-primary': expect.any(String) },
    light: { '--background-primary': expect.any(String) },
  });
  expect(snapshot()).toBe(before);
});
