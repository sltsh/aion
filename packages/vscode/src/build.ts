import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { theme } from './theme.js';

const target = fileURLToPath(new URL('../themes/aion.json', import.meta.url));
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(theme(), null, 2)}\n`);
console.log(`themes/aion.json: ${Object.keys(theme().colors).length} colour keys, ${theme().tokenColors.length} token rules`);
