import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { FLAGS } from './src/flags.js';
import { landing, palette } from './src/render/index.js';

const MARKERS: Record<string, () => string> = {
  '<!--@aion:landing-->': () => landing(FLAGS),
  '<!--@aion:palette-->': () => palette(FLAGS),
};

export default defineConfig({
  base: '/',
  server: { host: true, port: 8422 },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        palette: resolve(import.meta.dirname, 'palette.html'),
      },
    },
  },
  plugins: [
    {
      name: 'aion-prerender',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'downloads/aion.json',
          source: readFileSync(resolve(import.meta.dirname, '../../packages/terminal/fragments/aion.json')) });
      },
      configureServer(server) {
        server.middlewares.use('/downloads/aion.json', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename="aion.json"');
          res.end(readFileSync(resolve(import.meta.dirname, '../../packages/terminal/fragments/aion.json')));
        });
      },
      transformIndexHtml(html: string): string {
        let out = html;
        for (const [marker, render] of Object.entries(MARKERS)) out = out.replace(marker, render());
        return out;
      },
    },
  ],
});
