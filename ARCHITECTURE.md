# OpenLocale Architecture

## Overview

OpenLocale follows a modular architecture with clear separation of concerns. The codebase is organized into distinct modules that handle specific responsibilities.

## Directory Structure

```
src/
├── cli/           # Command-line interface
│   ├── index.ts   # CLI entry point and command definitions
│   └── commands.ts # Command implementations
├── core/          # Core business logic
│   ├── translate-file.ts  # Single file translation orchestration
│   └── process-files.ts   # Batch file processing
├── parsers/       # File format parsers (Strategy Pattern)
│   ├── types.ts   # TranslationStrategy interface
│   ├── mdx.ts     # MDX/Markdown strategy implementation
│   └── frontmatter.ts # Frontmatter translation logic
├── ai/            # AI provider integration (Factory Pattern)
│   └── translate.ts # Translation service with provider factory
└── utils/         # Shared utilities
    ├── config.ts  # Configuration management
    ├── lockfile.ts # Lock file operations
    ├── paths.ts   # Path manipulation utilities
    └── crypto.ts  # Hashing utilities
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
- Default pattern: `^type:\\s*\\w+$` (for backward compatibility)

### Extensibility Points
1. **New File Formats**: Implement `TranslationStrategy` and register in `parsers/index.ts`
2. **New AI Providers**: Add case in `createAiClient()` factory
3. **Custom Rules**: Extend `translation.rules` in config schema

## Configuration Schema

```json
{
  "translation": {
    "provider": "anthropic",  // AI provider selection
    "rules": {
      "patternsToSkip": ["^type:\\s*\\w+$"]  // Regex patterns to skip
    },
    "frontmatterFields": ["title", "description"],
    "jsxAttributes": ["alt", "title", "placeholder"]
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