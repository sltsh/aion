import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function herdr(...params) {
  const output = execFileSync('herdr', params, { encoding: 'utf8' }).trim();
  return output === '' ? null : JSON.parse(output).result;
}
const quote = (word) => `'${word.replaceAll("'", `'\\''`)}'`;
const pause = () => new Promise((resolve) => setTimeout(resolve, 2000));

function finished(pane) {
  try {
    const info = herdr('pane', 'process-info', '--pane', pane).process_info;
    return info.foreground_process_group_id === info.shell_pid;
  } catch {
    return true;
  }
}

// The pane is for the person watching; the agent reads outcomes from a status file, because
// scraping a terminal that `gh run watch` redraws can miss the line it is waiting for.
export async function releaseInPane(args, tag, watch) {
  const caller = process.env.HERDR_PANE_ID;
  const { rect } = herdr('pane', 'layout', '--pane', caller).layout.panes.find((pane) => pane.pane_id === caller);
  const direction = rect.width > rect.height * 2 ? 'right' : 'down';
  const pane = herdr('pane', 'split', '--pane', caller, '--direction', direction, '--cwd', process.cwd(), '--no-focus').pane.pane_id;
  herdr('pane', 'rename', pane, `release ${tag}`);

  const status = join(mkdtempSync(join(tmpdir(), 'aion-release-')), 'status');
  herdr('pane', 'run', pane, ['node', 'scripts/release.mjs', ...args, '--here', `--status=${status}`].map(quote).join(' '));
  console.log(`release running in Herdr pane ${pane}; Ctrl-C there stops it`);

  let printed = 0;
  let started = false;
  for (let waited = 0; ; waited += 2) {
    await pause();
    const lines = existsSync(status) ? readFileSync(status, 'utf8').split('\n').filter(Boolean) : [];
    started ||= existsSync(status);
    for (const line of lines.slice(printed)) console.log(line);
    printed = lines.length;

    const last = lines.at(-1) ?? '';
    const stopped = last.startsWith('release stopped');
    if (stopped || last.startsWith('PUBLISHED') || last.startsWith('not pushed') || (last.startsWith('PUSHED') && !watch)) {
      const title = stopped ? `Aion ${tag} release stopped` : `Aion ${tag} ${last.split(' ')[0].toLowerCase()}`;
      herdr('notification', 'show', title, '--body', `${last} (pane ${pane})`, '--sound', stopped ? 'request' : 'done');
      if (!stopped) herdr('pane', 'close', pane);
      return stopped ? 1 : 0;
    }
    if ((started || waited > 20) && finished(pane)) {
      console.error(`release stopped: the release in pane ${pane} ended without an outcome; read it there`);
      return 1;
    }
  }
}
