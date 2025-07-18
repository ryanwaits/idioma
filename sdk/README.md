# OpenLocale SDK

The OpenLocale SDK provides a programmatic interface for AI-powered translations with support for multiple file formats, providers, and cost tracking.

## Installation

```bash
npm install @openlocale/sdk
# or
bun add @openlocale/sdk
```

## Quick Start

```typescript
import { OpenLocale } from '@openlocale/sdk';

// Initialize the SDK
const openlocale = new OpenLocale({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Translate content
const result = await openlocale.translateContent({
  content: 'Hello World',
  format: 'string',
  sourceLocale: 'en',
  targetLocale: 'es',
});

console.log(result.translatedContent); // "Hola Mundo"
```

## API Reference

### Constructor Options

```typescript
interface OpenLocaleConfig {
  apiKey?: string;              // API key for the provider
  provider?: 'anthropic' | 'openai';  // AI provider (default: 'anthropic')
  model?: string;               // Model to use
  cachePath?: string;           // Path to lock file cache
  locale?: {
    source: string;             // Source locale (default: 'en')
    targets: string[];          // Target locales
  };
  translation?: {
    frontmatterFields?: string[];     // Fields to translate in frontmatter
    jsxAttributes?: string[];         // JSX attributes to translate
    skipPatterns?: string[];          // Regex patterns to skip
  };
}
```

### Methods

#### `translateContent(params)`

Translate content directly without file I/O.

```typescript
const result = await openlocale.translateContent({
  content: '# Hello\nWorld',
  format: 'md',              // 'mdx' | 'md' | 'string'
  sourceLocale: 'en',
  targetLocale: 'es',
  trackCosts: true,          // Optional: track token usage and costs
});

// Result includes:
// - translatedContent: string
// - usage?: TokenUsage
// - cost?: CostCalculation
```

#### `translateFile(params)`

Translate a single file with caching support.

```typescript
const result = await openlocale.translateFile({
  filePath: 'content/docs/en/guide.mdx',
  sourceLocale: 'en',
  targetLocale: 'es',
  outputPath: 'content/docs/es/guide.mdx',  // Optional
  showCosts: true,                          // Optional
});

// Result includes:
// - success: boolean
// - outputPath?: string
// - usage?: TokenUsage
// - cost?: CostCalculation
// - error?: string
```

#### `translateFiles(params)`

Batch translate multiple files.

```typescript
const result = await openlocale.translateFiles({
  patterns: ['content/**/*.mdx', 'docs/**/*.md'],
  sourceLocale: 'en',
  targetLocales: ['es', 'fr', 'de'],
  showCosts: true,
});

// Result includes:
// - totalFiles: number
// - successCount: number
// - errorCount: number
// - totalUsage?: TokenUsage
// - totalCost?: CostCalculation
// - errors: Array<{file: string, error: string}>
```

#### `estimateCost(params)`

Estimate translation costs before processing.

```typescript
const estimate = await openlocale.estimateCost({
  patterns: ['content/**/*.mdx'],
  targetLocales: ['es', 'fr'],
});

// Estimate includes:
// - estimatedFiles: number
// - estimatedTokens: number
// - estimatedCost: CostCalculation
// - breakdown: per-locale estimates
```

#### `getAvailableFormats()`

Get supported file formats.

```typescript
const formats = openlocale.getAvailableFormats();
// Returns: ['mdx', 'md', 'string']
```

#### `updateConfig(config)`

Update configuration at runtime.

```typescript
openlocale.updateConfig({
  provider: 'openai',
  model: 'gpt-4o-mini',
});
```

## Examples

### Translate MDX Documentation

```typescript
import { OpenLocale } from '@openlocale/sdk';

const openlocale = new OpenLocale({
  provider: 'anthropic',
  translation: {
    frontmatterFields: ['title', 'description'],
    jsxAttributes: ['alt', 'title', 'placeholder'],
  },
});

// Translate all MDX files
const result = await openlocale.translateFiles({
  patterns: ['content/docs/**/*.mdx'],
  sourceLocale: 'en',
  targetLocales: ['es', 'fr', 'zh'],
  showCosts: true,
});

console.log(`Translated ${result.successCount} files`);
console.log(`Total cost: ${result.totalCost?.formattedCost}`);
```

### With Cost Tracking

```typescript
const result = await openlocale.translateContent({
  content: 'Your content here...',
  format: 'mdx',
  sourceLocale: 'en',
  targetLocale: 'es',
  trackCosts: true,
});

if (result.cost) {
  console.log(`Translation cost: ${result.cost.formattedCost}`);
  console.log(`Tokens used: ${result.usage?.totalTokens}`);
}
```

### Error Handling

```typescript
import { TranslationError, FileError } from '@openlocale/sdk';

try {
  const result = await openlocale.translateFile({
    filePath: 'path/to/file.mdx',
    sourceLocale: 'en',
    targetLocale: 'es',
  });
} catch (error) {
  if (error instanceof FileError) {
    console.error('File error:', error.message);
  } else if (error instanceof TranslationError) {
    console.error('Translation error:', error.message);
  }
}
```

## Provider Support

### Anthropic (Default)

```typescript
const openlocale = new OpenLocale({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20240620',  // Optional, uses default
});
```

### OpenAI

```typescript
const openlocale = new OpenLocale({
  provider: 'openai',
  model: 'gpt-4o-2024-08-06',  // Optional, uses default
  apiKey: process.env.OPENAI_API_KEY,
});
```

## Cost Information

The SDK includes built-in pricing for accurate cost calculation:

- **Anthropic Claude 3.5 Sonnet**: $3/1M input, $15/1M output tokens
- **OpenAI GPT-4o**: $5/1M input, $15/1M output tokens
- **OpenAI GPT-4o-mini**: $0.15/1M input, $0.60/1M output tokens

Access pricing information:

```typescript
import { PRICING } from '@openlocale/sdk';
console.log(PRICING);
```

## License

MIT