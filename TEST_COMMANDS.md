# Idioma CLI Test Commands

Copy and paste these commands one by one to test the Idioma CLI:

## 1. Basic Setup & Help

```bash
# Check CLI works
bun run src/cli.ts --help

# Initialize configuration
bun run src/cli.ts init

# Check config was created
cat idioma.json
```

## 2. Locale Management

```bash
# Add a single locale
bun run src/cli.ts add es

# Add multiple locales at once
bun run src/cli.ts add fr,de,ja

# List all configured locales
bun run src/cli.ts list

# Remove a locale
bun run src/cli.ts remove ja

# List again to confirm
bun run src/cli.ts list
```

## 3. Create Test Content

```bash
# Create test directory structure
mkdir -p test-docs/en

# Create a test Markdown file
cat > test-docs/en/hello.md << 'EOF'
---
title: Hello World
description: A test document for Idioma
---

# Welcome to Idioma

This is a **test document** to verify our translation system works.

## Features

- Automatic translation
- Format preservation  
- Cost tracking

> Translation is the art of preserving meaning across languages.

Thank you for testing Idioma!
EOF

# Verify file was created
cat test-docs/en/hello.md
```

## 4. Update Configuration

```bash
# Update config to use test files
cat > idioma.json << 'EOF'
{
  "projectId": "test-project",
  "locale": {
    "source": "en",
    "targets": ["es", "fr"]
  },
  "files": {
    "md": {
      "include": ["test-docs/en/**/*.md"]
    }
  },
  "translation": {
    "provider": "anthropic",
    "frontmatterFields": ["title", "description"],
    "rules": {
      "patternsToSkip": []
    }
  }
}
EOF

# Verify configuration
cat idioma.json
```

## 5. Run Translation (Requires API Key)

```bash
# Set your API key (replace with your actual key)
export ANTHROPIC_API_KEY="your-anthropic-api-key-here"

# Run translation with cost tracking
bun run src/cli.ts translate --costs

# Check if translations were created
ls -la test-docs/es/
ls -la test-docs/fr/

# View translated content
cat test-docs/es/hello.md
cat test-docs/fr/hello.md

# Check the lock file
cat idioma.lock
```

## 6. Reset and Clean Up

```bash
# Reset translation status
bun run src/cli.ts reset

# Clean up all test files
rm -rf test-docs idioma.json idioma.lock
```

## Quick One-Liner Test (No Translation)

If you just want to quickly test the CLI without translations:

```bash
# Run all non-translation tests
bun run src/cli.ts init && \
bun run src/cli.ts add es,fr,de && \
bun run src/cli.ts list && \
bun run src/cli.ts remove de && \
bun run src/cli.ts list && \
rm idioma.json idioma.lock
```

## Automated Test Script

Run the complete test suite:

```bash
# Make the test script executable
chmod +x test-cli.sh

# Run all tests
./test-cli.sh

# Or run with Bash
bash test-cli.sh
```

## Build and Test Globally

Test the built version:

```bash
# Build the project
bun run build

# Link globally (for testing)
bun link

# Now test global command
idioma --help
idioma init
idioma add es,fr
idioma list

# Unlink when done
bun unlink idioma
```

## Expected Output Examples

### Successful initialization:
```
✓ Created idioma.json

Next steps:
1. Add target locales: idioma add <locale>
2. Configure your file patterns in idioma.json
3. Run translation: idioma translate
```

### Successful locale addition:
```
✓ Added locales: es, fr
```

### Successful translation:
```
✔ hello.md -> es [$0.02]
✔ hello.md -> fr [$0.02]

Total cost: $0.04 (1,234 tokens)
Translation complete. Lockfile updated.
```

## Troubleshooting

If you encounter issues:

1. **Command not found**: Make sure you're running from the project root
2. **API key error**: Ensure ANTHROPIC_API_KEY is set correctly
3. **No files found**: Check your file patterns in idioma.json
4. **Build errors**: Run `bun install` to ensure dependencies are installed

## Notes

- The CLI will skip unchanged files (uses lock file for tracking)
- Use `--costs` flag to see translation costs
- The reset command clears the lock file but doesn't delete translated files
- All commands support `--help` for more information