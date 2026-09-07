import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const release = readFileSync('.github/workflows/release.yml', 'utf8');
const ci = readFileSync('.github/workflows/ci.yml', 'utf8');

const indentOf = (line: string): number => line.length - line.trimStart().length;

function step(workflow: string, name: string): string {
  const lines = workflow.split('\n');
  const start = lines.findIndex((line) => line.trim() === `- name: ${name}`);
  if (start === -1) throw new Error(`no step named ${name}`);
  const end = lines.findIndex(
    (line, index) => index > start && line.trim().startsWith('- name:')
      && indentOf(line) <= indentOf(lines[start]!),
  );
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

function body(stepText: string): string {
  const lines = stepText.split('\n');
  const start = lines.findIndex((line) => line.trim() === 'run: |');
  if (start === -1) throw new Error('the step does not use a block scalar');
  const margin = indentOf(lines[start]!) + 2;
  const kept: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() !== '' && indentOf(line) < margin) break;
    kept.push(line.slice(margin));
  }
  return kept.join('\n');
}

const order = (workflow: string, first: string, second: string): boolean =>
  workflow.indexOf(`- name: ${first}`) < workflow.indexOf(`- name: ${second}`);

describe('the release notes step', () => {
  it('stops the workflow when the notes script fails', () => {
    const repository = mkdtempSync(join(tmpdir(), 'aion-notes-step-'));
    try {
      mkdirSync(join(repository, 'scripts'));
      cpSync('scripts/release-notes.mjs', join(repository, 'scripts/release-notes.mjs'));
      writeFileSync(join(repository, 'CHANGELOG.md'), '# Changelog\n');
      execFileSync('git', ['init', '-q'], { cwd: repository, stdio: 'ignore' });
      const result = spawnSync('bash', ['-e', '-c', body(step(release, 'Write the release notes'))], {
        cwd: repository,
        encoding: 'utf8',
        env: { ...process.env, TAG: 'v9.9.9' },
      });
      expect(result.status).not.toBe(0);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('runs under bash, so a pipeline cannot hide the exit code', () => {
    expect(step(release, 'Write the release notes')).toContain('shell: bash');
  });
});

describe('both workflows', () => {
  it('build the generated token package before anything reads its types', () => {
    for (const workflow of [ci, release]) {
      expect(order(workflow, 'Build', 'Typecheck')).toBe(true);
      expect(order(workflow, 'Build', 'Test')).toBe(true);
    }
  });
});

describe('npm publication', () => {
  it('checks packages in dry runs and publishes only after the gates', () => {
    expect(step(release, 'Check npm packages')).toContain('--dry-run');
    expect(step(release, 'Publish npm packages')).toContain('if: ${{ !inputs.dry_run }}');
    for (const gate of ['Build', 'Typecheck', 'Contrast gate', 'Test', 'Generated files match the tag', 'Check npm packages']) {
      expect(order(release, gate, 'Publish npm packages')).toBe(true);
    }
    expect(release).toContain('id-token: write');
  });

  it.each([
    { mode: 'missing', expected: ['publish -w ./packages/tokens --tag latest', 'publish -w ./packages/css --tag latest'], success: true },
    { mode: 'tokens-exist', expected: ['publish -w ./packages/css --tag latest'], success: true },
    { mode: 'registry-error', expected: [], success: false },
    { mode: 'publish-error', expected: ['publish -w ./packages/tokens --tag latest'], success: false },
  ])('handles $mode without publishing unintended packages', ({ mode, expected, success }) => {
    const directory = mkdtempSync(join(tmpdir(), 'aion-npm-step-'));
    try {
      const executable = join(directory, 'npm');
      const log = join(directory, 'calls');
      writeFileSync(log, '');
      writeFileSync(executable, `#!/bin/bash
if [ "$1" = view ]; then
  if [ "$MODE" = registry-error ]; then
    echo '{"error":{"code":"E503"}}'
    exit 1
  fi
  if [ "$MODE" = tokens-exist ] && [[ "$2" == *aion-tokens* ]]; then
    echo '"0.3.0"'
    exit 0
  fi
  echo '{"error":{"code":"E404"}}'
  exit 1
fi
printf '%s\\n' "$*" >> "$CALLS"
[ "$MODE" != publish-error ]
`);
      chmodSync(executable, 0o755);
      const result = spawnSync('bash', ['-e', '-c', body(step(release, 'Publish npm packages'))], {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, MODE: mode, CALLS: log },
      });
      expect(result.status === 0, result.stderr).toBe(success);
      expect(readFileSync(log, 'utf8').trim().split('\n').filter(Boolean)).toEqual(expected);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
