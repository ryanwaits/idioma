# Idioma

AI-powered internationalization engine.

## What is Idioma?

Idioma automatically translates your content files using AI while preserving formatting and skipping technical content like code, URLs, and IDs. It supports MDX, JSON, YAML, HTML, XML, and CSV out of the box with zero configuration needed.

## Why Idioma?

- **Simple** - One command to translate everything
- **Open-source, BYOK** - Pay only for AI tokens, not SaaS markup
- **Smart defaults** - Works instantly with no extra configuration

## Installation

```bash
# npm
npm install -g idioma

# bun
bun add -g idioma

# yarn
yarn global add idioma
```

## Quick start

```bash
# 1. Initialize
idioma init

# 2. Add languages
idioma add es,fr,de

# 3. Set your API key
export ANTHROPIC_API_KEY="your-key"

# 4. Translate everything
idioma translate
```

## Configuration

Create an `idioma.json` file:

```json
{
  "locale": {
    "source": "en",
    "targets": ["es", "fr"]
  },
  "files": [
    "content/docs/[locale]/**/*.mdx",
    "locales/[locale]/**/*.json",
    "public/[locale]/**/*.html"
  ]
}
```

That's it! Idioma will:
- Detect file formats automatically
- Skip code blocks, URLs, IDs, and technical content
- Preserve formatting and structure
- Only translate actual content

## Advanced usage

### With exclusions

```json
{
  "locale": {
    "source": "en",
    "targets": ["es", "fr"]
  },
  "files": {
    "include": ["content/**/*"],
    "mdx": {
      "frontmatterFields": ["customFieldToPreserve"]
    }
  }
}
```

### Track costs per translation

```bash
idioma translate --costs
```

### SDK usage

```typescript
import { Idioma } from 'idioma';

const idioma = await Idioma.create({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const result = await idioma.translateFile({
  filePath: 'content/docs/intro.mdx',
  targetLocale: 'es'
});
```

## Supported Formats

- **MDX/Markdown** - Preserves JSX components and formatting
- **JSON** - Maintains structure, skips technical keys
- **YAML** - Preserves comments and anchors
- **HTML** - Keeps structure, translates content and alt texts
- **XML** - Handles nested structures and CDATA
- **CSV** - Auto-detects delimiters and translatable columns

## File Structure

```
content/
├── en/          # Source files
│   └── intro.mdx
├── es/          # Generated Spanish
│   └── intro.mdx
└── fr/          # Generated French
    └── intro.mdx
```

## Commands

- `idioma init` - Create config file
- `idioma translate` - Translate all files
- `idioma add <locale>` - Add target language
- `idioma remove <locale>` - Remove target language
- `idioma list` - Show configured languages
- `idioma reset` - Clear translations

## Providers

Supports both Anthropic Claude and OpenAI GPT:

```json
{
  "translation": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20240620"
  }
}
```

## License

MIT
