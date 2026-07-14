import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  outExtension: () => ({ js: '.mjs' }),
  define: {
    __SONAR_CLI_VERSION__: JSON.stringify(pkg.version),
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
});
