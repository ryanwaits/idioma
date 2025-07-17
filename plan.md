# OpenLocale Refactor PRD and Implementation Plan

Below is a comprehensive **Product Requirements Document (PRD) and Implementation Plan** for refactoring the OpenLocale library based on your feedback. This builds directly on the context from `openlocale.md` (the merged codebase), focusing on splitting the monolithic `src/cli.ts` into the proposed modular structure, while incorporating the **Strategy Pattern** for file translators/parsers (to handle extensibility for formats like MDX) and a **light Factory Pattern** for AI clients (to enable provider switching, e.g., Anthropic to OpenAI).

The goal is to make the library more production-ready: modular, testable, extensible (e.g., users can add custom strategies via config or extensions), and maintainable as an open-source tool. We'll prioritize backward compatibility (e.g., existing commands and config still work) and incremental migration to minimize breakage.

This PRD is structured for clarity:
- **Overview and Assumptions**
- **High-Level Requirements**
- **Design Patterns in Detail**
- **Implementation Plan** (with phased task lists, including specific code changes)
- **Testing Recommendations**
- **Timeline and MVP Scope**
- **Risks and Mitigations**

By following the task lists sequentially, you'll end up with a refactored codebase. Each task includes approximate effort (e.g., "30-60 min") and pseudocode/diffs where helpful. Assume you're working in the existing project (with Bun/TypeScript setup).

---

## Overview and Assumptions

**Overview**: This refactor addresses the monolithic nature of `src/cli.ts` by modularizing logic into separate files/directories. We'll implement the Strategy Pattern for translation strategies (e.g., MDX-specific parsing with configurable directive filtering) and a Factory for AI clients. This enables features like user-configurable rules (e.g., skipping directive-specific content without hardcoding "type:") and easy provider switching (e.g., via config). The end result: A cleaner CLI that orchestrates modules, ready for expansion (e.g., SDK/API as in README.md).

**Assumptions**:
- MVP Focus: Refactor existing MDX support; add hooks for future formats (e.g., JSON).
- Config Extensions: We'll extend `ConfigSchema` slightly (e.g., add `translation.provider` and `translation.rules` for flexibility).
- Dependencies: No new installs needed (reuse existing like `remark`, `ai`, `zod`).
- Backward Compatibility: Existing `openlocale.json`, commands, and lockfile remain functional.
- Scope Exclusions: No new features (e.g., no OpenAI support yet—just factory hooks); no full unit tests (but recommendations included).

**Success Criteria**: After refactor, running `bun src/cli.ts translate` works identically, but code is split, testable, and extensible (e.g., add a rule to skip directives via config).

---

## High-Level Requirements (MVP)

- **Modularity**: Split `src/cli.ts` into the proposed structure (ai/, parsers/, utils/, core/, cli/).
- **Extensibility**:
  - Users can configure rules for skipping content (e.g., patterns in directives) via `openlocale.json`.
  - Support strategy-based translation (e.g., MDX strategy handles Remark parsing, JSX, directives).
  - AI provider switching via factory (e.g., config `"translation.provider": "anthropic"` defaults; hooks for others).
- **Configurability**: Extend config with `translation.rules` (e.g., `{ patternsToSkip: ["^type:\\s*"] }`) to generalize directive filtering.
- **Performance/Maintainability**: Keep async operations (e.g., batch translations); add basic error handling.
- **Open-Source Readiness**: No hardcodes (e.g., replace "type:" check with rule-based); document in README.md updates.

---

## Design Patterns in Detail

### Strategy Pattern (for File Translators/Parsers)
- **Purpose**: Allows different translation "strategies" per file type (e.g., MDXStrategy for Markdown/MDX files).
- **Interface**: `interface TranslationStrategy { canHandle(filePath: string): boolean; translate(content: string, source: string, target: string, config: Config): Promise<string>; }`
- **Implementation**: Registry in `core/translateFile.ts` (e.g., array of strategies; pick first that `canHandle` matches).
- **Pros (as discussed)**: Extensible (add JSONStrategy later); testable; aligns with open-source (users can register custom strategies).
- **Cons**: Slight overhead (interface + registry); mitigated by keeping it lightweight.
- **Usage Example**: For MDX, the strategy will handle Remark parsing, collect translatable texts/attributes, apply rules (e.g., skip nodes matching config patterns), batch AI calls, and reassemble.

### Light Factory Pattern (for AI Clients)
- **Purpose**: Creates AI clients based on config (e.g., return Anthropic instance; hooks for others).
- **Implementation**: Simple function `createAiClient(provider: string, apiKey: string)` in `ai/translate.ts` that switches on provider.
- **Pros**: Decouples AI logic (easy swap/mocking); configurable via `config.translation.provider`.
- **Cons**: Minimal (just a switch statement for MVP); expand to full class factory if needed.
- **Usage Example**: `const client = createAiClient(config.translation.provider || 'anthropic', process.env.ANTHROPIC_API_KEY);` then use in `translateText`.

---

## Implementation Plan

The plan is phased by directory/module for incremental development. Each phase has a **task list** with specific steps. Total estimated effort: 4-6 hours (spread over sessions). Start with utils/ (least dependent), end with cli/.

### Phase 1: Utils (Config, Lockfile, Paths, Crypto) – Foundation Layer
**Goal**: Move I/O and helper utils; extend config schema.
**Task List**:
1. **Create src/utils/config.ts (30 min)**:
   - Export `ConfigSchema` (extend with `translation.provider: z.string().default('anthropic')` and `translation.rules: z.object({ patternsToSkip: z.array(z.string()).default([]) }).optional()`).
   - Move `loadConfig` and `saveConfig` functions.
   - Add default rules in schema (e.g., `patternsToSkip.default(['^type:\\s*\\w+$'])` for backward compat).
   - Pseudocode Diff:
     ```typescript
     // From cli.ts -> utils/config.ts
     export const ConfigSchema = z.object({
       // ... existing
       translation: z.object({
         // ... existing
         provider: z.string().default('anthropic'),
         rules: z.object({
           patternsToSkip: z.array(z.string()).default(['^type:\\s*\\w+$']),
         }).optional(),
       }).optional(),
     });
     // Move loadConfig, saveConfig as-is
     ```

2. **Create src/utils/lockfile.ts (20 min)**:
   - Move `LockFile` interface, `loadLock`, `saveLock`.
   - No changes needed.

3. **Create src/utils/paths.ts (15 min)**:
   - Move `replaceLocaleInPattern` and `generateOutputPath`.
   - No changes.

4. **Create src/utils/crypto.ts (10 min)**:
   - Export `generateHash(content: string): string` (move MD5 hash logic from `translateFile`).

### Phase 2: AI (Translation Logic) – Integrate Factory
**Goal**: Isolate AI calls with factory for provider switching.
**Task List**:
1. **Create src/ai/translate.ts (45 min)**:
   - Move `translateText` function.
   - Add factory: `export function createAiClient(provider: string, apiKey: string) { if (provider === 'anthropic') return createAnthropic({ apiKey }); /* else throw or fallback */ }`
   - Update `translateText` to accept `client` param (dependency injection): `async function translateText(text: string, source: string, target: string, client: any): Promise<string> { /* use client in generateText */ }`
   - Preserve whitespace logic.
   - Pseudocode Diff:
     ```typescript
     // New factory
     export function createAiClient(provider: string, apiKey: string) {
       switch (provider) {
         case 'anthropic': return createAnthropic({ apiKey });
         // Future: case 'openai': return createOpenAI({ apiKey });
         default: throw new Error(`Unsupported provider: ${provider}`);
       }
     }
     // Updated translateText
     export async function translateText(text: string, source: string, target: string, client: any) {
       // ... existing logic with client in generateText({ model: client('claude-3-5-sonnet-20240620'), ... })
     }
     ```

### Phase 3: Parsers (MDX, Frontmatter) – Integrate Strategy Pattern
**Goal**: Implement Strategy for MDX; make directive filtering rule-based.
**Task List**:
1. **Create src/parsers/frontmatter.ts (30 min)**:
   - Move `translateFrontmatter`.
   - No major changes; use `config.translation.frontmatterFields`.

2. **Create src/parsers/mdx.ts (60 min)**:
   - Define `interface TranslationStrategy { ... }` (move to src/core/types.ts if you add a types file; else here).
   - Implement `export class MDXStrategy implements TranslationStrategy { canHandle(filePath: string) { return filePath.endsWith('.mdx') || filePath.endsWith('.md'); } async translate(content: string, source: string, target: string, config: Config) { /* move translateMDXContent logic */ } }`
   - In `translate`: Move parsing logic; add `shouldTranslateNode(node: Node, parent: Parent | undefined, config: Config): boolean { /* traverse parents for directives; check if text matches config.rules.patternsToSkip.map(p => new RegExp(p)) */ }`
   - Collect texts/attributes only if `shouldTranslateNode` returns true.
   - Batch translations with `Promise.all` (pass AI client if needed).
   - Move `addParentReferences`, visitors for text/JSX/images.
   - Pseudocode Diff:
     ```typescript
     // New shouldTranslateNode
     function shouldTranslateNode(node: any, parent: any, config: Config): boolean {
       if (node.type !== 'text' || !node.value.trim()) return false;
       const patterns = config.translation?.rules?.patternsToSkip.map(p => new RegExp(p)) || [];
       if (patterns.some(p => p.test(node.value.trim()))) return false;
       // Traverse parent for directive check (as existing)
       let curr = parent;
       while (curr) {
         if (['containerDirective', 'leafDirective', 'textDirective'].includes(curr.type)) {
           // Additional logic: e.g., only translate if not a 'key-value' line
           return !patterns.some(p => p.test(node.value)); // Flexible
         }
         curr = curr.parent;
       }
       return true;
     }
     // In visitor: if (shouldTranslateNode(node, parent, config)) textsToTranslate.push(...);
     ```

### Phase 4: Core (Orchestration)
**Goal**: Tie together strategies, AI, parsers.
**Task List**:
1. **Create src/core/translateFile.ts (45 min)**:
   - Move `translateFile` logic.
   - Add strategy registry: `const strategies: TranslationStrategy[] = [new MDXStrategy()];`
   - In function: Find strategy with `strategies.find(s => s.canHandle(filePath))?.translate(...)` or throw error.
   - Handle frontmatter separately (call `translateFrontmatter`), then main content via strategy.
   - Inject AI client: Create via factory, pass to strategy/translateText.
   - Update lock with hash.

### Phase 5: CLI (Commands and Entrypoint)
**Goal**: Slim down CLI to orchestration.
**Task List**:
1. **Create src/cli/commands.ts (30 min)**:
   - Move command actions (e.g., `export async function initCommand() { /* move init logic, use utils/config */ }`)
   - Similar for `translateCommand`, `localeAddCommand` (use core/translateFile in translate).

2. **Rename/Move src/cli.ts to src/cli/index.ts (20 min)**:
   - Import from all modules (e.g., `import { translateFile } from '../core/translateFile';`)
   - Wire Commander: `program.command('init').action(initCommand);` etc.
   - Remove all moved functions; keep only Commander setup.

### Phase 6: Polish and Integration
**Task List**:
1. **Update Imports Across Files (15 min)**: Fix all imports (e.g., in cli/index.ts: `import { loadConfig } from '../utils/config';`).
2. **Extend openlocale.json Schema in Code (10 min)**: Ensure new fields are optional/defaulted.
3. **Update README.md (15 min)**: Add section on new config options (e.g., rules, provider) and modular structure.

---

## Testing Recommendations

- **Incremental**: After each phase, run `bun src/cli.ts init` and `bun src/cli.ts translate` on a sample file (e.g., existing `content/docs/en/test.mdx`).
- **Unit Tests**: Add a `tests/` dir with Bun's test runner (e.g., `bun test`). Test examples:
  - `shouldTranslateNode` with mock nodes/config.
  - Factory: `expect(createAiClient('anthropic', 'key')).toBeDefined();`
  - Strategy: Mock AI, test MDXStrategy.translate on sample MDX.
- **Edge Cases**: Test with directives (ensure skips patterns), unchanged files (lockfile), new locales.
- **Tools**: Use code_execution tool if needed to verify snippets, but manual runs suffice for MVP.

---

## Timeline and MVP Scope

- **Timeline**: 1-2 days (phases 1-3 Day 1; 4-6 Day 2). Each task is bite-sized.
- **MVP Scope**: Fully refactored CLI with Strategy (MDX only) and Factory (Anthropic only). Future: Add more strategies/providers.
- **Metrics**: Code lines per file <150; all commands work; config rules skip "type:" by default.

---

## Risks and Mitigations

- **Breakage During Migration**: Mitigate with incremental testing; git commit after each phase.
- **Over-Abstraction**: Keep Strategy/Factory light (no over-engineering).
- **Config Compatibility**: Defaults ensure old configs work.
- **Performance**: Batch AI calls remain; monitor for 400+ files (add progress bar if needed).

This plan gets you to a refactored MVP. If you encounter issues (e.g., need to verify a library update), let me know—I can use tools like web_search for confirmation!
