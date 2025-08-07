# Idioma

AI-powered internationalization for MDX documentation - 90% cheaper than SaaS alternatives.

## Overview

Idioma is an open-source localization tool that provides automated, AI-powered translations for documentation files. It offers a complete solution with CLI, SDK, and API components, making it suitable for various integration scenarios.

### Key Features

- 🚀 **90% cheaper** than SaaS alternatives - pay only for AI API usage
- 🤖 **AI-powered translations** using Claude (Anthropic) or GPT-4 (OpenAI)
- 📝 **MDX/Markdown support** with format preservation
- 💰 **Cost tracking** - monitor translation costs in real-time
- 🔄 **Smart caching** - only retranslate changed content
- 🛠️ **Multiple integration options** - CLI, SDK, or REST API
- 🎯 **Intelligent content detection** - automatically skips non-translatable content

## Installation

```bash
# Using Bun (recommended)
bun add idioma

# Using npm
npm install idioma

# Using yarn
yarn add idioma
```

## Quick Start

### 1. Initialize Configuration

```bash
idioma init
```

This creates an `idioma.json` configuration file with default settings.

### 2. Add Target Languages

```bash
# Add single language
idioma add es

# Add multiple languages
idioma add es,fr,de
```

### 3. Configure Your Files

Edit `idioma.json` to specify which files to translate:

```json
{
  "locale": {
    "source": "en",
    "targets": ["es", "fr", "de"]
  },
  "files": {
    "mdx": {
      "include": ["content/docs/**/*.mdx"]
    }
  }
}
```

### 4. Set Your API Key

```bash
export ANTHROPIC_API_KEY="your-api-key"
# or
export OPENAI_API_KEY="your-api-key"
```

### 5. Run Translation

```bash
# Basic translation
idioma translate

# With cost tracking
idioma translate --costs
```

## CLI Commands

### `idioma init`
Initialize a new Idioma configuration file.

### `idioma translate [--costs]`
Translate all configured files to target languages.
- `--costs`: Display translation costs based on token usage

### `idioma add <locales>`
Add target locale(s). Supports comma-separated values.
```bash
idioma add pt,fr,ja
```

### `idioma remove <locales>`
Remove target locale(s). Supports comma-separated values.

### `idioma list`
List all configured locales.

### `idioma reset`
Reset translation status and remove generated translation files.

## Configuration

### Complete Configuration Example

```json
{
  "projectId": "prj_xxxxxxxxxxxxxxxxxxxx",
  "locale": {
    "source": "en",
    "targets": ["es", "fr", "de", "ja", "pt"]
  },
  "files": {
    "mdx": {
      "include": ["content/docs/**/*.mdx", "pages/**/*.md"]
    }
  },
  "translation": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20240620",
    "frontmatterFields": ["title", "description", "sidebarTitle"],
    "jsxAttributes": ["title", "description", "tag", "alt", "placeholder", "label"],
    "rules": {
      "patternsToSkip": ["^type:\\s*\\w+$", "^TODO:.*"]
    }
  }
}
```

### Configuration Options

- **`locale.source`**: Source language code (default: "en")
- **`locale.targets`**: Array of target language codes
- **`files`**: File patterns to translate (supports glob patterns)
- **`translation.provider`**: AI provider ("anthropic" or "openai")
- **`translation.model`**: Specific model to use (optional)
- **`translation.frontmatterFields`**: Frontmatter fields to translate
- **`translation.jsxAttributes`**: JSX attributes to translate
- **`translation.rules.patternsToSkip`**: Regex patterns for content to skip

## SDK Usage

### Basic Translation

```typescript
import { Idioma } from 'idioma/sdk';

const idioma = await Idioma.create({
  apiKey: 'your-api-key',
  provider: 'anthropic'
});

// Translate content
const result = await idioma.translateContent({
  content: '# Hello World',
  sourceLocale: 'en',
  targetLocale: 'es',
  format: 'md'
});

console.log(result.content); // # Hola Mundo
console.log(result.usage);   // Token usage statistics
```

### File Translation

```typescript
// Translate a single file
const fileResult = await idioma.translateFile({
  filePath: 'docs/intro.mdx',
  sourceLocale: 'en',
  targetLocale: 'fr'
});

// Translate multiple files
const batchResult = await idioma.translateFiles({
  files: ['docs/**/*.mdx'],
  sourceLocale: 'en',
  targetLocales: ['es', 'fr', 'de']
});

console.log(batchResult.totalCost); // Total cost estimate
```

## API Server

### Starting the Server

```bash
# Start the API server
bun run src/api/index.ts

# With custom port
PORT=8080 bun run src/api/index.ts
```

### API Endpoints

#### POST /api/translate
Translate content to a single target language.

```bash
curl -X POST http://localhost:3000/api/translate \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Hello World",
    "sourceLocale": "en",
    "targetLocale": "es",
    "format": "md"
  }'
```

#### POST /api/translate/batch
Translate content to multiple target languages.

```bash
curl -X POST http://localhost:3000/api/translate/batch \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Hello World",
    "sourceLocale": "en",
    "targetLocales": ["es", "fr", "de"],
    "format": "md"
  }'
```

## Cost Estimation

Idioma provides transparent cost tracking:

- **Anthropic Claude 3.5 Sonnet**: ~$3 per million input tokens, ~$15 per million output tokens
- **OpenAI GPT-4**: ~$10 per million input tokens, ~$30 per million output tokens

### Example Costs

For a typical documentation site with 400 pages:
- Initial translation to 3 languages: ~$20-50 (one-time)
- Incremental updates: Only changed content is retranslated
- Compared to SaaS: Save 90%+ on monthly subscriptions

## File Structure Convention

Idioma expects a locale-based file structure:

```
content/
├── docs/
│   ├── en/          # Source files
│   │   ├── intro.mdx
│   │   └── guide.mdx
│   ├── es/          # Spanish translations (generated)
│   │   ├── intro.mdx
│   │   └── guide.mdx
│   └── fr/          # French translations (generated)
│       ├── intro.mdx
│       └── guide.mdx
```

## Advanced Features

### Custom Skip Patterns

Skip specific content patterns during translation:

```json
{
  "translation": {
    "rules": {
      "patternsToSkip": [
        "^type:\\s*\\w+$",     // Skip directive attributes
        "^TODO:.*",            // Skip TODO comments
        "^FIXME:.*"            // Skip FIXME comments
      ]
    }
  }
}
```

### Lockfile Management

Idioma maintains a `idioma.lock` file to track:
- File content hashes
- Translation status per locale
- Prevents unnecessary retranslation

### Provider Switching

Easily switch between AI providers:

```json
{
  "translation": {
    "provider": "openai",
    "model": "gpt-4o-2024-08-06"
  }
}
```

## Architecture

Idioma follows a modular architecture with clear separation of concerns:

- **CLI**: Command-line interface for interactive use
- **Core**: Business logic for file processing and translation
- **Parsers**: Strategy pattern for handling different file formats
- **AI**: Factory pattern for multiple AI provider support
- **SDK**: Programmatic access to all features
- **API**: RESTful server for remote integration

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Comparison with Alternatives

| Feature | Idioma | Languine | Traditional i18n |
|---------|------------|----------|------------------|
| Cost | ~$0.01-0.05/page | $100+/month | Manual labor |
| AI-Powered | ✅ | ✅ | ❌ |
| Open Source | ✅ | ❌ | Varies |
| Self-Hosted | ✅ | ❌ | ✅ |
| Format Preservation | ✅ | ✅ | ❌ |
| MDX Support | ✅ | Limited | ❌ |
| Cost Tracking | ✅ | ❌ | N/A |

## Support

For issues, questions, or suggestions, please open an issue on GitHub.