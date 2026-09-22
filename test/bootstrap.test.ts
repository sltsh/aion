import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};
const site = JSON.parse(readFileSync('apps/site/package.json', 'utf8')) as {
  scripts: Record<string, string>;
};
const lab = JSON.parse(readFileSync('apps/lab/package.json', 'utf8')) as {
  exports: Record<string, { types: string; default: string }>;
  scripts: Record<string, string>;
};

const CONSUMERS = ['packages/css', 'packages/obsidian', 'packages/terminal', 'packages/vscode', 'apps/lab', 'apps/site'];

// `npm run <script> --workspaces` walks the workspaces in declaration order, which starts
// with the CSS package. A clean checkout has no `packages/tokens/dist`, so every consumer
// fails to resolve `@sltsh/aion-tokens` unless the token build runs first and by name.
describe('a clean checkout', () => {
  it('builds the token package before it builds or checks a consumer', () => {
    for (const script of ['build', 'typecheck'] as const) {
      expect(root.scripts[script]).toMatch(/^npm run build:tokens &&/);
    }
    expect(root.scripts['build:tokens']).toBe('npm run build -w @sltsh/aion-tokens');
  });

  it('builds the token package after an install, so a bare typecheck resolves', () => {
    expect(root.scripts['prepare']).toBe('npm run build:tokens');
  });

  it('prepares generated entries before an isolated site build or typecheck', () => {
    const prepare = 'npm run build -w @sltsh/aion-tokens && npm run build -w @sltsh/aion-css && npm run build:render -w @sltsh/aion-lab';
    expect(site.scripts['prebuild']).toBe(prepare);
    expect(site.scripts['pretypecheck']).toBe(prepare);
  });

  it('loads the shared renderer from generated JavaScript rather than TypeScript source', () => {
    expect(lab.scripts['build:render']).toBe('tsc -p tsconfig.render.json');
    expect(lab.exports['./render/code']).toEqual({
      types: './dist/render/code.d.ts',
      default: './dist/render/code.js',
    });
  });

  it('declares the token package as a dependency of every consumer', () => {
    for (const directory of CONSUMERS) {
      const manifest = JSON.parse(readFileSync(`${directory}/package.json`, 'utf8')) as {
        dependencies?: Record<string, string>;
      };
      expect(manifest.dependencies?.['@sltsh/aion-tokens']).toBeDefined();
    }
  });
});
