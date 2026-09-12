import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lightTheme, theme } from './theme.js';

const writeTheme = (name: string, value: ReturnType<typeof theme>): void => {
  const target = fileURLToPath(new URL(`../themes/${name}.json`, import.meta.url));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`themes/${name}.json: ${Object.keys(value.colors).length} colour keys, ${value.tokenColors.length} token rules`);
};

writeTheme('aion', theme());
writeTheme('aion-light', lightTheme());
