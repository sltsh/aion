import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const CHANGELOG = `# Changelog

## 0.2.0

### Added

- A second version.

## 0.1.0

### Added

- A first version.
`;

let repository: string;

const run = (...args: string[]) =>
  spawnSync(process.execPath, [join(repository, 'scripts/release-notes.mjs'), ...args], {
    cwd: repository,
    encoding: 'utf8',
  });

beforeAll(() => {
  repository = mkdtempSync(join(tmpdir(), 'aion-release-notes-'));
  mkdirSync(join(repository, 'scripts'));
  cpSync('scripts/release-notes.mjs', join(repository, 'scripts/release-notes.mjs'));
  writeFileSync(join(repository, 'CHANGELOG.md'), CHANGELOG);
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: repository, stdio: 'ignore' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('commit', '--allow-empty', '-m', 'Add the first version');
  git('tag', 'v0.1.0');
  git('commit', '--allow-empty', '-m', 'Add the second version');
  git('tag', 'v0.2.0');
  git('commit', '--allow-empty', '-m', 'Add an undescribed version');
  git('tag', 'v0.3.0');
});

afterAll(() => rmSync(repository, { recursive: true, force: true }));

describe('the release notes script', () => {
  it('writes the changelog section and the commits since the previous tag', () => {
    const result = run('v0.2.0');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('A second version.');
    expect(result.stdout).toContain('Add the second version');
  });

  it('fails on a tag that has no changelog section', () => {
    const result = run('v0.3.0');
    expect(result.status).not.toBe(0);
    expect(result.stdout.trim()).toBe('');
    expect(result.stderr).toContain('has no "## 0.3.0" section');
  });

  it('fails on a tag that the repository does not have', () => {
    const result = run('v9.9.9');
    expect(result.status).not.toBe(0);
    expect(result.stdout.trim()).toBe('');
  });

  it('fails on a missing argument', () => {
    const result = run();
    expect(result.status).not.toBe(0);
  });
});
