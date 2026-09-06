import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
