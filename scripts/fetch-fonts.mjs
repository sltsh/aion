import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { unzipSync } from 'node:zlib';

// Both families are SIL OFL 1.1, so the lab self-hosts them instead of calling a CDN.
const target = fileURLToPath(new URL('../apps/lab/public/fonts/', import.meta.url));
mkdirSync(target, { recursive: true });

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MONASPACE_RELEASE = 'https://github.com/githubnext/monaspace/releases/download/v1.400/monaspace-webfont-variable-v1.400.zip';
const MONASPACE_ENTRY = 'Variable Web Fonts/Monaspace Neon/Monaspace Neon Var.woff2';

const curl = (args) => execFileSync('curl', ['-sSL', '--fail', ...args], { encoding: 'buffer' });

const fetchArchivo = () => {
  const path = `${target}Archivo.woff2`;
  if (existsSync(path)) return console.log('Archivo.woff2 already present');
  const css = curl(['-A', CHROME, 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap']).toString();
  const url = css.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  if (!url) throw new Error('no woff2 url in the Google Fonts response');
  execFileSync('curl', ['-sSL', '--fail', '-o', path, url]);
  console.log('Archivo.woff2 downloaded');
};

const fetchMonaspace = async () => {
  const path = `${target}MonaspaceNeon.woff2`;
  if (existsSync(path)) return console.log('MonaspaceNeon.woff2 already present');
  const zipPath = '/tmp/aion-monaspace.zip';
  if (!existsSync(zipPath)) execFileSync('curl', ['-sSL', '--fail', '-o', zipPath, MONASPACE_RELEASE]);
  const { readFileSync } = await import('node:fs');
  const zip = readFileSync(zipPath);
  const { extractEntry } = await import('./unzip.mjs');
  writeFileSync(path, extractEntry(zip, MONASPACE_ENTRY));
  console.log('MonaspaceNeon.woff2 extracted');
};

fetchArchivo();
await fetchMonaspace();

writeFileSync(`${target}LICENSE.txt`, `Archivo — SIL Open Font License 1.1
https://github.com/google/fonts/tree/main/ofl/archivo

Monaspace Neon — SIL Open Font License 1.1
https://github.com/githubnext/monaspace
`);
console.log('fonts/LICENSE.txt written');
