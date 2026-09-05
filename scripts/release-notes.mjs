import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

const HEADINGS = [
  ['Added', /^add/i],
  ['Changed', /^(change|update|move|rename|refactor|replace|switch|port|raise|lower|solve)/i],
  ['Fixed', /^(fix|correct|repair)/i],
  ['Removed', /^(remove|delete|drop)/i],
  ['Documentation', /^(document|record)/i],
  ['Other', /./],
];

const tag = process.argv[2];
const version = tag?.replace(/^v/, '');

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`expected a tag of the form v1.2.3, got ${tag ?? '(nothing)'}`);
  process.exit(1);
}

try {
  git('rev-parse', '--verify', `refs/tags/${tag}`);
} catch {
  console.error(`${tag} is not a tag in this repository. Fetch the tags, or create it first.`);
  process.exit(1);
}

const lines = readFileSync('CHANGELOG.md', 'utf8').split('\n');
const start = lines.findIndex((line) => line.trimEnd() === `## ${version}`);

if (start === -1) {
  console.error(`CHANGELOG.md has no "## ${version}" section. Describe the release before you tag it.`);
  process.exit(1);
}

const rest = lines.slice(start + 1);
const end = rest.findIndex((line) => line.startsWith('## '));
const section = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();

let previous = null;
try {
  previous = git('describe', '--tags', '--abbrev=0', `${tag}^`);
} catch {
  previous = null;
}

const range = previous ? `${previous}..${tag}` : tag;
const commits = git('log', '--no-merges', '--format=%s%x00%h', range)
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [subject, sha] = line.split('\0');
    return { subject, sha };
  });

const headingOf = (subject) => HEADINGS.find(([, pattern]) => pattern.test(subject))[0];
const notes = [section];

if (commits.length > 0) {
  notes.push('', '### Commits', '');
  for (const [heading] of HEADINGS) {
    const matched = commits.filter((commit) => headingOf(commit.subject) === heading);
    if (matched.length === 0) continue;
    notes.push(`**${heading}**`, '');
    for (const { subject, sha } of matched) notes.push(`- ${subject} (\`${sha}\`)`);
    notes.push('');
  }
}

const slug = () => {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    return git('remote', 'get-url', 'origin').replace(/^.*github\.com[:/]/, '').replace(/\.git$/, '');
  } catch {
    return null;
  }
};

const repository = previous ? slug() : null;

if (repository) {
  notes.push('', `[Full changelog](https://github.com/${repository}/compare/${previous}...${tag})`);
}

console.log(notes.join('\n').replace(/\n{3,}/g, '\n\n').trim());
