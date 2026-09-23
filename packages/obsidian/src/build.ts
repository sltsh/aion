import { writeFileSync } from 'node:fs';
import { themeCss } from './theme.js';

writeFileSync(new URL('../../../theme.css', import.meta.url), themeCss());
console.log('theme.css: Aion Dark and Light');
