Below is a comprehensive **Product Requirements Document (PRD) and Implementation Plan** for building "OpenLocale" — an open-source, Languine-like localization tool. OpenLocale will provide automated, AI-powered translations for files (focusing on documentation like Markdown/HTML for your use case of 400+ pages), with support for multiple languages, format preservation, caching, and overrides. It will be 90% cheaper by leveraging self-hosted AI calls (e.g., via Anthropic) instead of a SaaS subscription, with costs primarily from AI API usage (~$0.01-0.05 per page translation, scaling to ~$20-50 one-time for 400 pages × 2-3 languages).

To keep this structured and actionable, I've broken it into **3 distinct parts** (CLI, SDK, API), as you suggested. Each part functions as a mini-PRD with:
- **High-Level Requirements**: What it needs to do (MVP scope).
- **Step-by-Step Implementation Instructions**: Detailed, code-inclusive guide to build a working prototype. These are designed to be followed sequentially in a Bun/TypeScript project.
- **Assumptions and MVP Focus**: For simplicity, MVP targets Markdown docs (using Remark for parsing to extract/translat text while preserving structure). Expandable later to other formats (e.g., JSON, HTML via additional parsers like Rehype). We'll use a `openlocale.json` config file (mirroring Languine's `languine.json`), with fields like `{ "sourceLocale": "en", "targetLocales": ["es", "fr"], "files": ["docs/**/*.md"], "apiKey": "your_anthropic_key" }`.
- **Tech Stack Integration**:
  - **Bun**: For fast runtime, CLI scripting, and potential server (for API).
  - **Remark**: For parsing Markdown AST (Abstract Syntax Tree) to translate text nodes without breaking formatting.
  - **AI/SDK (Vercel)**: For AI integration with Anthropic (Claude) as the default model for context-aware translations. We'll use `generateText` for simple translations, `tool` if needed for advanced (e.g., structured output), and Zod for schema validation (e.g., ensuring translation outputs match expected formats).
  - **Other Libs**: Glob for file matching, Node's fs for I/O, a simple cache (JSON file-based).

**Project Setup (Common to All Parts)**:
- Create a new directory: `mkdir openlocale && cd openlocale`.
- Initialize Bun project: `bun init -y`.
- Install dependencies: `bun add remark remark-parse remark-stringify glob zod ai @ai-sdk/anthropic`.
- Add types: `bun add -D @types/node @types/glob`.
- For AI: Set `ANTHROPIC_API_KEY` in `.env` (load via `process.env`).

By the end of Part 1 (CLI), you'll have a working MVP prototype: Run CLI commands to init config, translate files, and generate localized versions (e.g., duplicate `docs/en/page.md` to `docs/es/page.md` with translated content).

---

### Part 1: CLI Implementation Plan

#### High-Level Requirements (MVP)
- A command-line interface (CLI) binary named `openlocale` (runnable via `bun run cli.ts` or globally via symlinks).
- Commands mirroring Languine: `init` (create config), `translate` (scan files, translate to targets, save outputs), `locale add/remove` (update config), `overrides pull` (stub for future dashboard integration; MVP uses local JSON overrides).
- Config: `openlocale.json` with source/target locales, file globs, API key.
- Translation Logic: Parse files (e.g., MD via Remark), extract translatable text, call AI to translate (with context like "preserve Markdown format and brand tone"), reassemble, cache results (file-hash based).
- MVP Scope: Translate Markdown docs to 2-3 languages; handle 400+ files via batching; no auth (local only); basic caching.

#### Step-by-Step Implementation Instructions
1. **Create CLI Entry File**:
   - Create `src/cli.ts`.
   - Parse args using Bun's built-in (or add `commander` if needed: `bun add commander`).
   - Code:
     ```typescript
     import { Command } from 'commander';
     import fs from 'fs/promises';
     import path from 'path';
     import glob from 'glob';
     import { remark } from 'remark';
     import { visit } from 'unist-util-visit'; // Add: bun add unist-util-visit
     import { generateText } from 'ai';
     import { createAnthropic } from '@ai-sdk/anthropic';
     import { z } from 'zod';

     const program = new Command();
     const configPath = path.resolve('openlocale.json');
     const cachePath = path.resolve('.openlocale-cache.json');
     const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

     // Config Schema (Zod for validation)
     const ConfigSchema = z.object({
       sourceLocale: z.string().default('en'),
       targetLocales: z.array(z.string()).default([]),
       files: z.array(z.string()).default([]),
       apiKey: z.string().optional(), // For overrides or future
     });
     type Config = z.infer<typeof ConfigSchema>;

     async function loadConfig(): Promise<Config> {
       try {
         const data = await fs.readFile(configPath, 'utf-8');
         return ConfigSchema.parse(JSON.parse(data));
       } catch {
         throw new Error('Config not found. Run "openlocale init" first.');
       }
     }

     async function saveConfig(config: Config) {
       await fs.writeFile(configPath, JSON.stringify(config, null, 2));
     }

     // Cache Functions
     async function loadCache(): Promise<Record<string, Record<string, string>>> {
       try {
         const data = await fs.readFile(cachePath, 'utf-8');
         return JSON.parse(data);
       } catch {
         return {};
       }
     }

     async function saveCache(cache: Record<string, Record<string, string>>) {
       await fs.writeFile(cachePath, JSON.stringify(cache));
     }

     // Translation Function (using AI/SDK and Zod for output validation)
     async function translateText(text: string, source: string, target: string): Promise<string> {
       const { text: translated } = await generateText({
         model: anthropic('claude-3-5-sonnet-20240620'),
         prompt: `Translate this text from ${source} to ${target}. Preserve exact formatting, tone, and structure (e.g., Markdown headers, links). Text: ${text}`,
       });
       // Validate with Zod (simple string for MVP)
       return z.string().parse(translated);
     }

     // File Translation with Remark
     async function translateFile(filePath: string, source: string, target: string, cache: Record<string, Record<string, string>>) {
       const content = await fs.readFile(filePath, 'utf-8');
       const fileHash = content; // Simple hash for MVP (use crypto later)
       const cacheKey = `${filePath}-${target}`;
       if (cache[cacheKey] && cache[cacheKey] === fileHash) {
         console.log(`Cached: ${filePath} -> ${target}`);
         return; // Assume output already exists; MVP skips re-write
       }

       const tree = remark().parse(content);
       visit(tree, 'text', (node) => {
         // Translate text nodes asynchronously? For MVP, collect and batch
         // But simple: Replace in-place (note: async visit not default, so collect first)
       });

       // Collect translatable texts
       const texts: string[] = [];
       visit(tree, 'text', (node) => texts.push(node.value));

       // Batch translate (for efficiency)
       const translatedTexts = await Promise.all(texts.map(t => translateText(t, source, target)));
       let index = 0;
       visit(tree, 'text', (node) => { node.value = translatedTexts[index++]; });

       const translatedContent = remark().stringify(tree);
       const outputPath = filePath.replace(`/${source}/`, `/${target}/`); // Assume structure like docs/en/page.md
       await fs.mkdir(path.dirname(outputPath), { recursive: true });
       await fs.writeFile(outputPath, translatedContent);

       cache[cacheKey] = fileHash;
     }

     // Commands
     program.command('init').action(async () => {
       const defaultConfig: Config = { sourceLocale: 'en', targetLocales: [], files: [] };
       await saveConfig(defaultConfig);
       console.log('Config initialized at openlocale.json');
     });

     program.command('translate').action(async () => {
       const config = await loadConfig();
       const cache = await loadCache();
       const files = (await Promise.all(config.files.map(pattern => glob(pattern)))).flat();
       for (const file of files) {
         for (const target of config.targetLocales) {
           await translateFile(file, config.sourceLocale, target, cache);
         }
       }
       await saveCache(cache);
       console.log('Translation complete');
     });

     program.command('locale').command('add').argument('<locales>', 'Comma-separated locales').action(async (localesStr) => {
       const config = await loadConfig();
       const newLocales = localesStr.split(',');
       config.targetLocales = [...new Set([...config.targetLocales, ...newLocales])];
       await saveConfig(config);
     });

     // Similar for remove, overrides (stub: console.log for MVP)

     program.parse();
     ```

2. **Run and Test MVP**:
   - Run `bun src/cli.ts init` to create `openlocale.json`.
   - Edit `openlocale.json`: Add `"targetLocales": ["es"]`, `"files": ["docs/**/*.md"]`.
   - Create sample file: `mkdir -p docs/en && echo "# Hello\nWorld" > docs/en/test.md`.
   - Run `bun src/cli.ts translate` — it should create `docs/es/test.md` with translated content (e.g., "# Hola\nMundo").
   - For 400+ files: It batches automatically; add parallelism with `Promise.all` if slow.

3. **Polish for Prototype**:
   - Add error handling (e.g., Zod validation errors).
   - Make global: `bun link` or package as bin in package.json.
   - Test with caching: Change file, re-run (should re-translate only changed).

This gives a working CLI MVP. Expand to more commands/formats later.

---

### Part 2: SDK Implementation Plan

#### High-Level Requirements (MVP)
- An NPM-publishable package `@openlocale/sdk` with TypeScript support.
- Core class: `OpenLocale` initialized with API key (for AI).
- Methods: `translate({ sourceText, sourceLocale, targetLocale, format })` — mirrors Languine, with caching.
- Supports 'md' format via Remark; returns translated text.
- Zod for input/output validation.
- MVP Scope: Programmatic translation for single strings/files; integrate into apps/scripts for batching 400+ pages.

#### Step-by-Step Implementation Instructions
1. **Setup Package**:
   - Create `sdk` subdir: `mkdir sdk && cd sdk && bun init -y`.
   - Update package.json: `"name": "@openlocale/sdk", "main": "dist/index.js", "types": "dist/index.d.ts"`.
   - Install deps: Same as CLI (remark, ai, etc.).
   - Build: Add `tsc` or Bun build script.

2. **Implement Core SDK**:
   - Create `src/index.ts`.
   - Code:
     ```typescript
     import { generateText } from 'ai';
     import { createAnthropic } from '@ai-sdk/anthropic';
     import { z } from 'zod';
     import { remark } from 'remark';
     import { visit } from 'unist-util-visit';

     const TranslateSchema = z.object({
       sourceText: z.string(),
       sourceLocale: z.string(),
       targetLocale: z.string(),
       format: z.enum(['md', 'string']).default('string'),
       cache: z.boolean().default(true),
     });

     export class OpenLocale {
       private anthropic;
       private cache: Map<string, string> = new Map(); // In-memory for MVP

       constructor({ apiKey }: { apiKey: string }) {
         this.anthropic = createAnthropic({ apiKey });
       }

       async translate(params: z.infer<typeof TranslateSchema>) {
         const validated = TranslateSchema.parse(params);
         const cacheKey = `${validated.sourceText}-${validated.targetLocale}`;
         if (validated.cache && this.cache.has(cacheKey)) {
           return { translatedText: this.cache.get(cacheKey)!, cached: true };
         }

         let translated: string;
         if (validated.format === 'md') {
           const tree = remark().parse(validated.sourceText);
           const texts: string[] = [];
           visit(tree, 'text', (node) => texts.push(node.value));
           const translatedTexts = await Promise.all(texts.map(t => this.translateText(t, validated.sourceLocale, validated.targetLocale)));
           let index = 0;
           visit(tree, 'text', (node) => { node.value = translatedTexts[index++]; });
           translated = remark().stringify(tree);
         } else {
           translated = await this.translateText(validated.sourceText, validated.sourceLocale, validated.targetLocale);
         }

         this.cache.set(cacheKey, translated);
         return { translatedText: translated, cached: false };
       }

       private async translateText(text: string, source: string, target: string) {
         const { text: result } = await generateText({
           model: this.anthropic('claude-3-5-sonnet-20240620'),
           prompt: `Translate from ${source} to ${target}, preserve tone: ${text}`,
         });
         return z.string().parse(result);
       }
     }
     ```

3. **Test MVP**:
   - Build: `bun build src/index.ts --outdir dist`.
   - In a test script: `import { OpenLocale } from './dist/index'; const ol = new OpenLocale({ apiKey: process.env.ANTHROPIC_API_KEY }); const res = await ol.translate({ sourceText: '# Hello', format: 'md', sourceLocale: 'en', targetLocale: 'es' }); console.log(res);`.
   - For batch: Loop over files, call `translate` for each.

This SDK can be used in scripts for custom workflows.

---

### Part 3: API Implementation Plan

#### High-Level Requirements (MVP)
- A REST API server (using Bun's built-in HTTP) at e.g., `http://localhost:3000/api/translate`.
- Endpoint: POST /api/translate with body mirroring SDK (sourceText, locales, format).
- Auth: Simple API key header (validate with Zod).
- Returns JSON { success, translatedText, cached }.
- MVP Scope: Server-side translation for remote calls; no database, in-memory cache; integrate Remark/AI as above.

#### Step-by-Step Implementation Instructions
1. **Setup Server**:
   - Create `src/api.ts`.
   - Use Bun.serve for HTTP.

2. **Implement API**:
   - Code (reuse SDK logic where possible; for MVP, embed):
     ```typescript
     import { serve } from 'bun'; // Bun built-in
     import { z } from 'zod';
     import { OpenLocale } from '../sdk/dist/index'; // Reuse SDK if built, or inline

     const ApiKeySchema = z.string().startsWith('org_'); // Mirror Languine

     const server = serve({
       port: 3000,
       async fetch(req) {
         if (req.method !== 'POST' || new URL(req.url).pathname !== '/api/translate') {
           return new Response('Not Found', { status: 404 });
         }

         const apiKey = req.headers.get('x-api-key');
         try {
           ApiKeySchema.parse(apiKey);
         } catch {
           return new Response(JSON.stringify({ success: false, error: 'Invalid API key' }), { status: 401 });
         }

         const body = await req.json();
         // Validate body with TranslateSchema from SDK
         // Assume OpenLocale instance
         const ol = new OpenLocale({ apiKey: process.env.ANTHROPIC_API_KEY }); // Or pass client key
         const result = await ol.translate(body);

         return new Response(JSON.stringify({ success: true, ...result }), { status: 200 });
       },
     });

     console.log('API running on http://localhost:3000');
     ```

3. **Run and Test MVP**:
   - Run `bun src/api.ts`.
   - Test with curl: `curl -X POST http://localhost:3000/api/translate -H "x-api-key: org_test" -H "Content-Type: application/json" -d '{"sourceText": "Hello", "sourceLocale": "en", "targetLocale": "es", "format": "string"}'`.
   - For docs: Send full MD as sourceText.

This completes the API prototype. For production, add rate limiting, persistent cache (e.g., Redis).

---

**Next Steps for Full Product**:
- Integrate all parts (e.g., CLI uses SDK internally).
- Add more formats (e.g., HTML via Rehype).
- GitHub repo for open-sourcing.
- Cost Validation: Use code_execution tool if needed to estimate AI tokens.
- If issues, refine with tools (e.g., web_search for AI/SDK updates). 

This plan gets you to a working MVP quickly—let me know if you need code tweaks!