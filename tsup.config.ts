import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: [
    // Mark shiki as external so dynamic language imports work at runtime
    'shiki',
    'shiki-highlight-api',
  ],
});
