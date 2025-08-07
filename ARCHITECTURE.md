# OpenLocale Architecture

## Overview

OpenLocale follows a modular architecture with clear separation of concerns. The codebase is organized into distinct modules that handle specific responsibilities.

## Directory Structure

```
src/
├── cli.ts         # Main CLI entry point
├── cli/           # Command-line interface
│   ├── index.ts   # CLI command definitions
│   └── commands.ts # Command implementations
├── core/          # Core business logic
│   ├── index.ts   # Core module exports
│   ├── translate-file.ts  # Single file translation orchestration
│   └── process-files.ts   # Batch file processing
├── parsers/       # File format parsers (Strategy Pattern)
│   ├── index.ts   # Parser registry and exports
│   ├── types.ts   # TranslationStrategy interface
│   ├── mdx.ts     # MDX/Markdown strategy implementation
│   └── frontmatter.ts # Frontmatter translation logic
├── ai/            # AI provider integration (Factory Pattern)
│   ├── index.ts   # AI module exports
│   └── translate.ts # Translation service with provider factory
├── api/           # REST API server
│   ├── index.ts   # Hono server setup
│   ├── middleware/ # API middleware
│   │   ├── auth.ts # Authentication with Unkey
│   │   └── rate-limit.ts # Rate limiting
│   └── examples/  # API usage examples
└── utils/         # Shared utilities
    ├── index.ts   # Utility exports
    ├── config.ts  # Configuration management
    ├── lockfile.ts # Lock file operations
    ├── paths.ts   # Path manipulation utilities
    ├── crypto.ts  # Hashing utilities
    └── cost.ts    # Token usage and cost calculation

sdk/               # SDK package (separate from CLI)
├── src/
│   ├── OpenLocale.ts # Main SDK class
│   ├── types.ts   # SDK type definitions
│   └── errors.ts  # Custom error classes
```

## Design Patterns

### Strategy Pattern (Parsers)
- **Purpose**: Handle different file formats with specific translation logic
- **Implementation**: `TranslationStrategy` interface with `canHandle()` and `translate()` methods
- **Benefits**: Easy to add new file formats without modifying existing code

### Factory Pattern (AI Providers)
- **Purpose**: Create AI clients based on configuration
- **Implementation**: `createAiClient()` function that returns provider-specific clients
- **Benefits**: Switch between AI providers (Anthropic, OpenAI, etc.) via configuration

## Key Features

### Configurable Translation Rules
- Skip patterns can be defined in `openlocale.json`
- Rules are applied during parsing to exclude specific content
- Intelligent detection of directive pseudo-attributes (e.g., `type: help`)
- Customizable patterns via `translation.rules.patternsToSkip`

### Cost Tracking
- Real-time token usage tracking
- Per-file and total cost calculation
- Support for multiple AI provider pricing models
- Optional cost display with `--costs` flag

### API Server
- RESTful API with Hono framework
- Authentication via Unkey
- Rate limiting (standard and strict tiers)
- Batch translation support

### SDK
- Programmatic access to translation features
- TypeScript-first with full type safety
- File and content translation methods
- Caching and lockfile management

### Extensibility Points
1. **New File Formats**: Implement `TranslationStrategy` and register in `parsers/index.ts`
2. **New AI Providers**: Add case in `createAiClient()` factory
3. **Custom Rules**: Extend `translation.rules` in config schema

## Configuration Schema

```json
{
  "projectId": "prj_xxxxxxxxxxxxxxxxxxxx",
  "locale": {
    "source": "en",
    "targets": ["es", "fr", "de"]
  },
  "files": {
    "mdx": {
      "include": ["content/docs/**/*.mdx"]
    }
  },
  "translation": {
    "provider": "anthropic",  // or "openai"
    "model": "claude-3-5-sonnet-20240620",  // optional, uses defaults
    "rules": {
      "patternsToSkip": ["^type:\\s*\\w+$"]  // Regex patterns to skip
    },
    "frontmatterFields": ["title", "description", "sidebarTitle"],
    "jsxAttributes": ["title", "description", "tag", "alt", "placeholder", "label"]
  }
}
```

## Data Flow

1. **CLI** receives command → calls appropriate command function
2. **Command** loads config/lockfile → calls core functions
3. **Core** orchestrates translation → finds appropriate strategy
4. **Strategy** parses content → applies rules → collects translatable text
5. **AI Service** translates text → preserves formatting
6. **Core** writes output → updates lockfile

## Adding New Features

### Adding a New File Format
1. Create new strategy in `src/parsers/[format].ts`
2. Implement `TranslationStrategy` interface
3. Register in `src/parsers/index.ts` strategies array

### Adding a New AI Provider
1. Install provider SDK
2. Add case in `createAiClient()` in `src/ai/translate.ts`
3. Add provider config option documentation

### Adding New Translation Rules
1. Extend `ConfigSchema` in `src/utils/config.ts`
2. Implement rule logic in appropriate strategy
3. Document new rule in README