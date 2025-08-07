# Idioma Configuration Examples

Idioma follows the **convention-over-configuration** principle, providing smart defaults while allowing full customization when needed.

## Ultra-Minimal Configuration (Simplest)

Just specify file patterns as a simple array:

```json
{
  "locale": {
    "source": "en",
    "targets": ["es", "fr"]
  },
  "files": [
    "content/docs/[locale]/**/*.{mdx,md}",
    "locales/[locale]/**/*.{json,yaml,yml}",
    "public/[locale]/**/*.{html,htm,xml}"
  ]
}
```

## Minimal with Excludes

When you need to exclude certain files:

```json
{
  "locale": {
    "source": "en",
    "targets": ["es", "fr"]
  },
  "files": {
    "include": [
      "content/docs/[locale]/**/*.mdx",
      "locales/[locale]/**/*.json",
      "public/[locale]/**/*.html"
    ],
    "exclude": [
      "**/internal/**",
      "**/*.config.json",
      "**/test-*.json"
    ]
  }
}
```

## With Format-Specific Overrides

Add format-specific settings to customize behavior:

```json
{
  "locale": {
    "source": "en",
    "targets": ["es", "fr"]
  },
  "files": {
    "include": [
      "content/docs/[locale]/**/*.mdx",
      "locales/[locale]/**/*.json",
      "public/[locale]/**/*.html"
    ],
    "mdx": {
      "translatableAttributes": ["customProp", "myAttribute"],
      "frontmatterFields": ["customMeta", "og_title"]
    },
    "json": {
      "skipKeys": ["internal_id", "debug_info"],
      "skipEmptyStrings": false
    },
    "html": {
      "translatableAttributes": ["data-custom", "x-tooltip"],
      "preserveWhitespace": true
    }
  }
}
```

## Smart Defaults Applied Automatically

### MDX Files
- **Translatable Attributes**: title, description, label, placeholder, alt, aria-label, heading, caption, tooltip, and more
- **Frontmatter Fields**: title, description, sidebarTitle, keywords, summary, excerpt, meta_description
- **Skip Tags**: code, CodeBlock, pre, Mermaid, Math, GraphQL
- **Skip Patterns**: Constants, snake_case, PascalCase, URLs, file paths, hex colors

### JSON/YAML Files
- **Skip Keys**: id, uuid, url, path, version, timestamp, email, token, api_key
- **Skip Patterns**: UUIDs, URLs, emails, phone numbers, hex colors
- **Skip Empty Strings**: true (by default)
- **Preserve Comments**: true (YAML only)

### HTML Files
- **Translatable Attributes**: alt, title, placeholder, aria-label, data-tooltip, data-title
- **Skip Tags**: script, style, code, svg, math, iframe, template
- **Preserve Entities**: true

### XML Files
- **Translatable Attributes**: label, title, description, tooltip, help, message, text
- **Skip Tags**: script, style, code, id, key, type
- **Preserve CDATA**: true

## What Gets Translated?

Idioma uses intelligent pattern detection to determine what should be translated:

### ✅ Will Translate
- Natural language text
- UI labels and messages
- Descriptions and help text
- Content with mixed case and spaces
- Sentences and phrases

### ❌ Won't Translate
- Code snippets and commands
- URLs and email addresses
- UUIDs and technical IDs
- Configuration keys
- File paths
- Version numbers
- Constants (ALL_CAPS)
- Variable names (camelCase, snake_case, PascalCase)
- Hex colors (#FF5733)
- Pure numbers
- Boolean values

## Progressive Enhancement

Start minimal and add configuration only when needed:

### Step 1: Start with minimal config
```json
{
  "locale": { "source": "en", "targets": ["es"] },
  "files": {
    "mdx": ["docs/[locale]/**/*.mdx"]
  }
}
```

### Step 2: Add exclusions if needed
```json
{
  "locale": { "source": "en", "targets": ["es"] },
  "files": {
    "mdx": {
      "include": ["docs/[locale]/**/*.mdx"],
      "exclude": ["**/internal/**"]
    }
  }
}
```

### Step 3: Customize attributes if needed
```json
{
  "locale": { "source": "en", "targets": ["es"] },
  "files": {
    "mdx": {
      "include": ["docs/[locale]/**/*.mdx"],
      "exclude": ["**/internal/**"],
      "translatableAttributes": ["customField"],
      "frontmatterFields": ["customMeta"]
    }
  }
}
```

## Philosophy

Following Rails' doctrine:
- **Convention over Configuration**: Smart defaults that work for 90% of use cases
- **Omakase**: A curated set of best practices, not a buffet of options
- **Progressive Disclosure**: Simple things are simple, complex things are possible

You shouldn't need to configure what's obvious. Idioma knows that `aria-label` should be translated but `api_key` shouldn't.