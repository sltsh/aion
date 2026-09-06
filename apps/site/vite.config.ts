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
      transformIndexHtml(html: string): string {
        let out = html;
        for (const [marker, render] of Object.entries(MARKERS)) out = out.replace(marker, render());
        return out;
      },
    },
  ],
});
