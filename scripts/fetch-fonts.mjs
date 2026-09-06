import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Both families are SIL OFL 1.1, so the apps self-host them instead of calling a CDN.
// The two `.woff2` files go where each `styles.css` loads them from. `public/fonts/` holds
// the licence text, which is served beside the site rather than bundled; a refresh that
// wrote the fonts there would leave the built app on the old ones.
//
// Both apps carry their own copy. A shared directory would move working files out of
// apps/lab and change its Vite resolution for no gain, and one download still fills both.
const APPS = ['lab', 'site'];
const dir = (app, kind) => fileURLToPath(new URL(`../apps/${app}/${kind}/fonts/`, import.meta.url));
const targets = APPS.map((app) => dir(app, 'src'));
const licenceTargets = APPS.map((app) => dir(app, 'public'));
for (const path of [...targets, ...licenceTargets]) mkdirSync(path, { recursive: true });

const [primary] = targets;

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MONASPACE_RELEASE = 'https://github.com/githubnext/monaspace/releases/download/v1.400/monaspace-webfont-variable-v1.400.zip';
const MONASPACE_ENTRY = 'Variable Web Fonts/Monaspace Neon/Monaspace Neon Var.woff2';

const curl = (args) => execFileSync('curl', ['-sSL', '--fail', ...args], { encoding: 'buffer' });

const spread = (name) => {
  for (const target of targets.slice(1)) copyFileSync(`${primary}${name}`, `${target}${name}`);
};

const present = (name) => targets.every((target) => existsSync(`${target}${name}`));

const fetchArchivo = () => {
  if (present('Archivo.woff2')) return console.log('Archivo.woff2 already present');
  const path = `${primary}Archivo.woff2`;
  if (!existsSync(path)) {
    const css = curl(['-A', CHROME, 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap']).toString();
    const url = css.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    if (!url) throw new Error('no woff2 url in the Google Fonts response');
    execFileSync('curl', ['-sSL', '--fail', '-o', path, url]);
  }
  spread('Archivo.woff2');
  console.log('Archivo.woff2 written to every app');
};

const fetchMonaspace = async () => {
  if (present('MonaspaceNeon.woff2')) return console.log('MonaspaceNeon.woff2 already present');
  const path = `${primary}MonaspaceNeon.woff2`;
  if (!existsSync(path)) {
    const zipPath = '/tmp/aion-monaspace.zip';
    if (!existsSync(zipPath)) execFileSync('curl', ['-sSL', '--fail', '-o', zipPath, MONASPACE_RELEASE]);
    const { readFileSync } = await import('node:fs');
    const zip = readFileSync(zipPath);
    const { extractEntry } = await import('./unzip.mjs');
    writeFileSync(path, extractEntry(zip, MONASPACE_ENTRY));
  }
  spread('MonaspaceNeon.woff2');
  console.log('MonaspaceNeon.woff2 written to every app');
};

fetchArchivo();
await fetchMonaspace();

const licence = `Archivo — SIL Open Font License 1.1
https://github.com/google/fonts/tree/main/ofl/archivo

Monaspace Neon — SIL Open Font License 1.1
https://github.com/githubnext/monaspace
`;

for (const target of licenceTargets) writeFileSync(`${target}LICENSE.txt`, licence);
console.log('public/fonts/LICENSE.txt written to every app');
