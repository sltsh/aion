import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

const CONSUMERS = ['packages/css', 'packages/terminal', 'packages/vscode', 'apps/lab'];

// `npm run <script> --workspaces` walks the workspaces in declaration order, which starts
// with the CSS package. A clean checkout has no `packages/tokens/dist`, so every consumer
// fails to resolve `@sltio/aion-tokens` unless the token build runs first and by name.
describe('a clean checkout', () => {
  it('builds the token package before it builds or checks a consumer', () => {
    for (const script of ['build', 'typecheck'] as const) {
      expect(root.scripts[script]).toMatch(/^npm run build:tokens &&/);
    }
    expect(root.scripts['build:tokens']).toBe('npm run build -w @sltio/aion-tokens');
  });

  it('builds the token package after an install, so a bare typecheck resolves', () => {
    expect(root.scripts['prepare']).toBe('npm run build:tokens');
  });

  it('declares the token package as a dependency of every consumer', () => {
    for (const directory of CONSUMERS) {
      const manifest = JSON.parse(readFileSync(`${directory}/package.json`, 'utf8')) as {
        dependencies?: Record<string, string>;
      };
      expect(manifest.dependencies?.['@sltio/aion-tokens']).toBeDefined();
    }
  });
});
