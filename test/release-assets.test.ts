import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let root: string;

const list = () => spawnSync(process.execPath, ['scripts/release-assets.mjs', root], { encoding: 'utf8' });

function port(name: string, releaseAssets: string[] | undefined, files: string[] = []) {
  mkdirSync(join(root, 'packages', name), { recursive: true });
  writeFileSync(join(root, 'packages', name, 'package.json'), JSON.stringify(releaseAssets ? { aion: { releaseAssets } } : {}));
  for (const file of files) {
    mkdirSync(join(root, file, '..'), { recursive: true });
    writeFileSync(join(root, file), '');
  }
}

beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'aion-assets-')); });
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('the release asset list', () => {
  it('collects what each port declares, relative to the repository', () => {
    port('vscode', ['aion-*.vsix'], ['packages/vscode/aion-theme-1.2.3.vsix', 'packages/vscode/other.vsix']);
    port('obsidian', ['dist/release/*.zip', '../../manifest.json'], ['packages/obsidian/dist/release/aion-obsidian-1.2.3.zip', 'manifest.json']);
    port('tokens', undefined);
    const result = list();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim().split('\n')).toEqual([
      'packages/obsidian/dist/release/aion-obsidian-1.2.3.zip',
      'manifest.json',
      'packages/vscode/aion-theme-1.2.3.vsix',
    ]);
  });

  it('fails on a declared asset that was not built', () => {
    port('vscode', ['aion-*.vsix']);
    const result = list();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('packages/vscode: aion-*.vsix');
  });
});

describe('the ports', () => {
  const declared = (name: string) =>
    JSON.parse(readFileSync(`packages/${name}/package.json`, 'utf8')).aion?.releaseAssets;

  it('ship the VSIX and the Obsidian files Obsidian downloads bare', () => {
    expect(declared('vscode')).toEqual(['aion-*.vsix']);
    expect(declared('obsidian')).toEqual(['dist/release/aion-obsidian-*.zip', '../../manifest.json', '../../theme.css']);
  });

  it('bundles the Obsidian theme in the folder Obsidian installs it under', () => {
    execFileSync('npm', ['run', 'assets', '-w', 'packages/obsidian'], { stdio: 'ignore' });
    const version = JSON.parse(readFileSync('packages/obsidian/package.json', 'utf8')).version;
    const listing = execFileSync('unzip', ['-Z1', `packages/obsidian/dist/release/aion-obsidian-${version}.zip`], { encoding: 'utf8' });
    expect(listing.trim().split('\n').sort()).toEqual(['Aion/', 'Aion/manifest.json', 'Aion/theme.css']);
    expect(JSON.parse(readFileSync('manifest.json', 'utf8')).name).toBe('Aion');
  });
});
