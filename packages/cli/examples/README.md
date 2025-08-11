# Idioma Examples

This directory contains example files for testing Idioma's translation capabilities across different file formats.

## Directory Structure

```
examples/
├── locales/
│   └── en/
│       ├── common.json      # Common UI strings (navigation, buttons, messages)
│       ├── app.json          # Application-specific content (dashboard, forms)
│       ├── features.json     # Feature descriptions and pricing
│       ├── nested.json       # Deep nesting and edge cases
│       └── config.yaml       # YAML configuration example
└── content/
    └── en/
        ├── api.mdx           # API documentation (MDX)
        └── guide.mdx         # User guide (MDX)
```

## Testing Translation

To test the translation of these files, run:

```bash
# Translate all configured files
bun run translate

# Or with cost tracking
bun run translate --costs
```

## Expected Behavior

### JSON Files
- **Translatable**: User-facing strings, messages, labels, descriptions
- **Skipped**: UUIDs, API keys, URLs, emails, hex colors, constants, camelCase identifiers
- **Preserved**: Structure, formatting style (minified vs pretty-printed)

### YAML Files
- **Translatable**: Content strings, descriptions, messages
- **Skipped**: Environment variables ($VAR), file paths, shell commands
- **Preserved**: Comments, anchors (&), aliases (*), indentation

### Special Cases in Examples

1. **common.json**: Contains both translatable UI strings and technical metadata that should be skipped
2. **nested.json**: Tests deep nesting (5 levels) and arrays with mixed content
3. **features.json**: Includes pricing information and technical constants
4. **config.yaml**: Mixes translatable app content with technical configuration

## Verification

After translation, check:
1. Generated files in `examples/locales/es/`, `examples/locales/fr/`, etc.
2. Technical values (API keys, UUIDs) remain unchanged
3. File structure and formatting are preserved
4. All user-facing content is translated