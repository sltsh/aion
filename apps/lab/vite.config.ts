import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true, port: 8421 },
  build: { target: 'es2022', outDir: 'dist' },
});
