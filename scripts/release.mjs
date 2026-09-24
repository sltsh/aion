import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { releaseInPane } from './herdr-pane.mjs';

const USAGE = 'usage: npm run release -- <patch|minor|major|X.Y.Z> [--no-push] [--watch] [--here]';
const GATES = ['build', 'typecheck', 'verify', 'test', 'sync:design'];
// A change here means the native acceptance in PLAN.md no longer covers what ships.
const THEME_OUTPUTS = ['theme.css', 'packages/vscode/themes'];

const args = process.argv.slice(2);
const bump = args.find((arg) => !arg.startsWith('--'));
const push = !args.includes('--no-push');
const watch = args.includes('--watch');
const status = args.find((arg) => arg.startsWith('--status='))?.slice('--status='.length);
if (status) writeFileSync(status, '');

const git = (...params) => execFileSync('git', params, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const succeeds = (command, params) => spawnSync(command, params, { stdio: 'ignore' }).status === 0;
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

function report(line, stream = console.log) {
  stream(line);
  if (status) appendFileSync(status, `${line}\n`);
}

function stop(message) {
  report(`release stopped: ${message}`, console.error);
  process.exit(1);
}

function run(command, params) {
  console.log(`$ ${command} ${params.join(' ')}`);
  return spawnSync(command, params, { stdio: 'inherit' }).status === 0;
}

const current = readJson('packages/tokens/package.json').version;

function next() {
  if (/^\d+\.\d+\.\d+$/.test(bump ?? '')) return bump;
  const [major, minor, patch] = current.split('.').map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  return stop(USAGE);
}

const version = next();
const tag = `v${version}`;

if (process.env.HERDR_ENV === '1' && !args.includes('--here')) process.exit(await releaseInPane(args, tag, watch));

const branch = git('branch', '--show-current');
if (branch === '' || branch === 'main' || branch === 'master') {
  stop(`run from the feature branch, not ${branch || 'a detached HEAD'}`);
}
if (git('status', '--porcelain') !== '') stop('the working tree has uncommitted changes');

git('fetch', '--quiet', '--tags', 'origin', 'main');
if (!succeeds('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'])) {
  stop(`origin/main has moved past ${branch}; rebase onto it and run again`);
}
const remoteTags = new Set(git('ls-remote', '--tags', '--refs', 'origin').split('\n')
  .map((line) => line.split('\t')[1]));
for (const name of [tag, version]) {
  if (git('tag', '--list', name) !== '' || remoteTags.has(`refs/tags/${name}`)) stop(`the tag ${name} already exists`);
}

const changelog = readFileSync('CHANGELOG.md', 'utf8');
const unreleased = changelog.match(/^## Unreleased\n([\s\S]*?)(?=^## )/m);
if (!unreleased) stop('CHANGELOG.md has no "## Unreleased" heading above a released version');
if (unreleased[1].trim() === '') stop('the Unreleased section of CHANGELOG.md is empty; describe the change first');

const touched = ['CHANGELOG.md', 'manifest.json', 'package-lock.json'];
// The tree was clean when the release began, so every tracked change is the release's own.
const restore = () => execFileSync('git', ['checkout', '--', '.']);

writeFileSync('CHANGELOG.md', changelog.replace(/^## Unreleased\n/m, `## Unreleased\n\n## ${version}\n`));
for (const entry of readdirSync('packages', { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const path = `packages/${entry.name}/package.json`;
  const manifest = readJson(path);
  manifest.version = version;
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (name.startsWith('@sltsh/aion-') && manifest.dependencies[name] !== '*') manifest.dependencies[name] = version;
  }
  writeJson(path, manifest);
  touched.push(path);
}
writeJson('manifest.json', { ...readJson('manifest.json'), version });

const gatesPass = run('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'])
  && run('node', ['scripts/check-version.mjs', tag])
  && GATES.every((gate) => run('npm', ['run', gate]));
if (!gatesPass) {
  restore();
  stop('a gate failed; the version files are restored');
}

const unexpected = execFileSync('git', ['status', '--porcelain', '-z'], { encoding: 'utf8' }).split('\0')
  .filter(Boolean).map((line) => line.slice(3)).filter((path) => !touched.includes(path));
if (unexpected.length > 0) {
  console.error(git('--no-pager', 'diff', '--', ...unexpected));
  restore();
  stop(`the gates changed files the feature should have committed: ${unexpected.join(', ')}`);
}

git('add', '--', ...touched);
git('commit', '--quiet', '-m', `Release Aion ${version}`);
git('tag', '--annotate', tag, '-m', `Aion ${version}`);
const sha = git('rev-parse', 'HEAD');
console.log(`\ncommitted ${sha.slice(0, 7)} and tagged ${tag}`);

const previous = `v${current}`;
if (git('tag', '--list', previous) !== '' && !succeeds('git', ['diff', '--quiet', previous, 'HEAD', '--', ...THEME_OUTPUTS])) {
  console.log(`notice: ${THEME_OUTPUTS.join(' or ')} changed since ${previous}; the native acceptance in PLAN.md does not cover this release`);
}

if (!push) {
  report(`not pushed. Publish with: git push --atomic origin HEAD:refs/heads/main refs/tags/${tag}`);
  process.exit(0);
}

if (!run('git', ['push', '--atomic', 'origin', 'HEAD:refs/heads/main', `refs/tags/${tag}`])) {
  git('tag', '--delete', tag);
  git('reset', '--quiet', '--hard', 'HEAD~1');
  stop('the push was rejected and nothing was published; the release commit and tag are undone');
}
if (!succeeds('git', ['fetch', '--quiet', 'origin', 'main:main'])) {
  console.log('notice: local main could not be fast-forwarded; origin/main is correct');
}
report(`PUSHED main and ${tag} at ${sha.slice(0, 7)}. Publishing runs in .github/workflows/release.yml.`);

if (!watch) {
  console.log(`Follow it with: gh run list --workflow release.yml --commit ${sha} --limit 1`);
  process.exit(0);
}

let id = '';
for (let attempt = 0; attempt < 30 && id === ''; attempt += 1) {
  if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 2000));
  const listed = spawnSync('gh', ['run', 'list', '--workflow', 'release.yml', '--commit', sha, '--limit', '1',
    '--json', 'databaseId', '--jq', '.[0].databaseId // ""'], { encoding: 'utf8' });
  id = listed.status === 0 ? listed.stdout.trim() : '';
}
if (id === '') stop(`the tag is pushed, but no release run for ${sha.slice(0, 7)} appeared within a minute`);
if (!run('gh', ['run', 'watch', id, '--exit-status', '--interval', '10'])) {
  stop(`the tag is pushed, but the release run failed: gh run view ${id} --log-failed`);
}
report(`PUBLISHED ${tag}`);
