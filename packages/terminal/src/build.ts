import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { herdrConfig } from './herdr.js';
import { fragment, settingsSnippet } from './scheme.js';

const write = (relative: string, content: string): void => {
  const target = fileURLToPath(new URL(relative, import.meta.url));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  console.log(relative.replace('../', ''));
};

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

write('../fragments/aion.json', json(fragment()));
write('../snippets/settings.json', json(settingsSnippet()));
write('../herdr/aion.toml', herdrConfig());
