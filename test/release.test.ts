import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const GATE = 'node -e "process.exit(process.env.FAIL_GATE ? 1 : 0)"';
const PACKAGES: Record<string, Record<string, string>> = {
  tokens: {},
  css: { '@sltsh/aion-tokens': '1.0.0' },
  obsidian: { '@sltsh/aion-css': '1.0.0', '@sltsh/aion-tokens': '1.0.0' },
  terminal: { '@sltsh/aion-tokens': '*' },
};

let root: string;
let work: string;
let origin: string;

const json = (path: string, value: unknown) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const read = (path: string) => JSON.parse(readFileSync(join(work, path), 'utf8'));
const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const release = (env: Record<string, string> = {}, ...args: string[]) =>
  spawnSync(process.execPath, ['scripts/release.mjs', ...args], {
    cwd: work,
    encoding: 'utf8',
    env: { ...process.env, HERDR_ENV: '', ...env },
  });

function changelog(unreleased: string) {
  writeFileSync(join(work, 'CHANGELOG.md'), `# Changelog\n\n## Unreleased\n${unreleased}\n## 1.0.0\n\n- First.\n`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aion-release-'));
  work = join(root, 'work');
  origin = join(root, 'origin.git');
  mkdirSync(join(work, 'scripts'), { recursive: true });
  for (const name of ['release.mjs', 'herdr-pane.mjs', 'check-version.mjs']) cpSync(`scripts/${name}`, join(work, 'scripts', name));
  json(join(work, 'package.json'), {
    name: 'fixture',
    private: true,
    workspaces: ['packages/*'],
    scripts: {
      ...Object.fromEntries(['build', 'typecheck', 'verify', 'test'].map((gate) => [gate, GATE])),
      'sync:design': 'node -e "process.env.DRIFT && require(\'fs\').appendFileSync(\'README.md\', \'drift\')"',
    },
  });
  writeFileSync(join(work, 'README.md'), '# Fixture\n');
  for (const [name, dependencies] of Object.entries(PACKAGES)) {
    mkdirSync(join(work, 'packages', name), { recursive: true });
    json(join(work, 'packages', name, 'package.json'), { name: `@sltsh/aion-${name}`, version: '1.0.0', dependencies });
  }
  json(join(work, 'manifest.json'), { name: 'Aion', version: '1.0.0' });
  changelog('\n### Fixed\n\n- A fix.\n');
  execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'],
    { cwd: work, stdio: 'ignore' });

  git(root, 'init', '-q', '--bare', '-b', 'main', origin);
  git(work, 'init', '-q', '-b', 'main');
  git(work, 'config', 'user.email', 'test@example.com');
  git(work, 'config', 'user.name', 'Test');
  git(work, 'remote', 'add', 'origin', origin);
  git(work, 'add', '.');
  git(work, 'commit', '-q', '-m', 'Add the fixture');
  git(work, 'tag', 'v1.0.0');
  git(work, 'push', '-q', 'origin', 'main', 'v1.0.0');
  git(work, 'switch', '-q', '-c', 'feature');
  git(work, 'commit', '-q', '--allow-empty', '-m', 'Fix something');
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('the release script', () => {
  it('bumps every version site, commits, tags and pushes main with the tag', () => {
    const result = release({}, 'patch');
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('PUSHED main and v1.0.1');
    for (const name of Object.keys(PACKAGES)) expect(read(`packages/${name}/package.json`).version).toBe('1.0.1');
    expect(read('packages/css/package.json').dependencies['@sltsh/aion-tokens']).toBe('1.0.1');
    expect(read('packages/obsidian/package.json').dependencies['@sltsh/aion-css']).toBe('1.0.1');
    expect(read('packages/terminal/package.json').dependencies['@sltsh/aion-tokens']).toBe('*');
    expect(read('manifest.json').version).toBe('1.0.1');
    expect(read('package-lock.json').packages['packages/tokens'].version).toBe('1.0.1');
    expect(readFileSync(join(work, 'CHANGELOG.md'), 'utf8')).toContain('## Unreleased\n\n## 1.0.1\n\n### Fixed');
    const head = git(work, 'rev-parse', 'HEAD');
    expect(git(origin, 'rev-parse', 'main')).toBe(head);
    expect(git(origin, 'rev-parse', 'v1.0.1^{commit}')).toBe(head);
    expect(git(work, 'rev-parse', 'main')).toBe(head);
    expect(git(work, 'status', '--porcelain')).toBe('');
  });

  it('writes each outcome to the status file a Herdr pane is read through', () => {
    const status = join(root, 'status');
    expect(release({}, 'patch', `--status=${status}`).status).toBe(0);
    expect(readFileSync(status, 'utf8')).toMatch(/^PUSHED main and v1\.0\.1 at \w{7}\./);
    expect(release({}, 'patch', `--status=${status}`).status).toBe(1);
    expect(readFileSync(status, 'utf8')).toMatch(/^release stopped: /);
  });

  it('takes an explicit version and can stop before pushing', () => {
    const result = release({}, '2.0.0', '--no-push');
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(git(work, 'tag', '--list', 'v2.0.0')).toBe('v2.0.0');
    expect(git(origin, 'tag', '--list', 'v2.0.0')).toBe('');
  });

  it('stops when origin/main has moved', () => {
    const other = join(root, 'other');
    git(root, 'clone', '-q', origin, other);
    git(other, '-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-q', '--allow-empty', '-m', 'Move main');
    git(other, 'push', '-q', 'origin', 'main');
    const result = release({}, 'patch');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('origin/main has moved');
  });

  it('stops when the tag already exists on the remote', () => {
    git(work, 'tag', 'v1.0.1', 'main');
    git(work, 'push', '-q', 'origin', 'v1.0.1');
    git(work, 'tag', '--delete', 'v1.0.1');
    const result = release({}, 'patch');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('the tag v1.0.1 already exists');
  });

  it('stops when the Unreleased section is empty', () => {
    changelog('\n');
    git(work, 'commit', '-q', '-am', 'Empty the changelog');
    const result = release({}, 'patch');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unreleased section of CHANGELOG.md is empty');
  });

  it('stops on main', () => {
    git(work, 'switch', '-q', 'main');
    expect(release({}, 'patch').stderr).toContain('not main');
  });

  it('restores the version files when a gate fails', () => {
    const result = release({ FAIL_GATE: '1' }, 'patch');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('a gate failed');
    expect(git(work, 'status', '--porcelain')).toBe('');
    expect(git(origin, 'tag', '--list', 'v1.0.1')).toBe('');
  });

  it('stops when a gate changes a file the release does not own', () => {
    const result = release({ DRIFT: '1' }, 'patch');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('files the feature should have committed: README.md');
    expect(git(work, 'status', '--porcelain')).toBe('');
  });
});
