import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const packageRoot = new URL('../', import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL('package.json', packageRoot), 'utf8')) as {
  exports: Record<string, string | { types: string; default: string }>;
};

test('publishes the editor, its styles and the variable map', async () => {
  const modules = await Promise.all([
    import('@sltsh/aion-lab/variables'),
    import('@sltsh/aion-lab/render/editor'),
    import('@sltsh/aion-lab/render/icons'),
    import('@sltsh/aion-lab/render/code'),
  ]);

  expect(typeof modules[0]!.variables).toBe('function');
  expect(typeof modules[1]!.editorSurface()).toBe('string');
  expect(Object.keys(modules[2]!.icons).length).toBeGreaterThan(0);
  expect(typeof modules[3]!.renderCode).toBe('function');

  for (const path of [
    './variables',
    './render/editor',
    './render/icons',
    './render/code',
    './render/editor.css',
  ]) {
    const entry = packageJson.exports[path];
    expect(entry, `${path} has a package export`).toBeDefined();
    const targets = typeof entry === 'string' ? [entry] : Object.values(entry!);
    for (const target of targets) {
      expect(existsSync(new URL(target, packageRoot)), `${path} -> ${target}`).toBe(true);
    }
  }

  expect(existsSync(fileURLToPath(import.meta.resolve('@sltsh/aion-lab/render/editor.css')))).toBe(true);
  expect(readFileSync(new URL('src/styles.css', packageRoot), 'utf8')).toContain(
    "@import './render/editor.css';",
  );
});
