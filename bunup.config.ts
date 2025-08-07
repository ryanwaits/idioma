import { defineConfig } from 'bunup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts', 'sdk/src/index.ts'],
  outDir: 'dist',
  format: ['esm'], // Array format for ESM only
  target: 'node',
  clean: true, // Clean dist folder before build
  
  // External dependencies that shouldn't be bundled
  external: [
    '@ai-sdk/anthropic',
    '@ai-sdk/openai',
    '@unkey/api',
    'ai',
    'commander',
    'glob',
    'hono',
    'hono/*',
    'js-yaml',
    'ora',
    'remark',
    'remark-directive',
    'remark-frontmatter',
    'remark-mdx',
    'remark-parse',
    'remark-stringify',
    'unist-util-visit',
    'zod',
    'fs',
    'path',
    'url',
    'node:fs',
    'node:path',
    'node:crypto',
    'node:fs/promises'
  ],
});