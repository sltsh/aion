import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fragment, settingsSnippet } from './scheme.js';

const write = (relative: string, value: unknown): void => {
  const target = fileURLToPath(new URL(relative, import.meta.url));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
  console.log(relative.replace('../', ''));
};

write('../fragments/aion.json', fragment());
write('../snippets/settings.json', settingsSnippet());
