#!/bin/bash

# Idioma CLI Test Script
# This script tests all CLI commands to ensure everything is working

echo "🧪 Idioma CLI Test Suite"
echo "========================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    
    echo -e "${YELLOW}Testing:${NC} $test_name"
    echo "Command: $command"
    
    if eval "$command"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    echo "---"
    echo ""
}

# Clean up any existing test files
echo "🧹 Cleaning up existing test files..."
rm -f idioma.json idioma.lock
rm -rf test-docs
echo ""

# 1. Test CLI execution
run_test "CLI execution" "bun run src/cli.ts --help"

# 2. Test init command
run_test "Initialize configuration" "bun run src/cli.ts init"

# 3. Verify config file was created
run_test "Config file exists" "[ -f idioma.json ] && echo 'Config file created'"

# 4. Test adding locales
run_test "Add single locale" "bun run src/cli.ts add es"
run_test "Add multiple locales" "bun run src/cli.ts add fr,de,ja"

# 5. Test listing locales
run_test "List locales" "bun run src/cli.ts list"

# 6. Create test content
echo "📝 Creating test content..."
mkdir -p test-docs/en
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

## Code Example

```javascript
function greet(name) {
    return `Hello, ${name}!`;
}
```

## Conclusion

Thank you for testing Idioma!
EOF

echo "✓ Test content created"
echo ""

# 7. Update config to point to test files
echo "📝 Updating config for test files..."
cat > idioma.json << 'EOF'
{
  "projectId": "test-project",
  "locale": {
    "source": "en",
    "targets": ["es", "fr", "de", "ja"]
  },
  "files": {
    "md": {
      "include": ["test-docs/en/**/*.md"]
    }
  },
  "translation": {
    "provider": "anthropic",
    "frontmatterFields": ["title", "description"],
    "jsxAttributes": ["alt", "title", "placeholder"],
    "rules": {
      "patternsToSkip": []
    }
  }
}
EOF
echo "✓ Config updated"
echo ""

# 8. Test translation (requires API key)
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  Skipping translation test - ANTHROPIC_API_KEY not set${NC}"
    echo "To test translation, run:"
    echo "  export ANTHROPIC_API_KEY='your-api-key'"
    echo "  bun run src/cli.ts translate --costs"
else
    run_test "Translate files" "bun run src/cli.ts translate --costs"
    
    # Check if translated files were created
    run_test "Spanish translation exists" "[ -f test-docs/es/hello.md ] && echo 'Spanish file created'"
    run_test "French translation exists" "[ -f test-docs/fr/hello.md ] && echo 'French file created'"
    
    # Display a translated file
    if [ -f test-docs/es/hello.md ]; then
        echo "📄 Sample translated content (Spanish):"
        echo "---"
        head -n 15 test-docs/es/hello.md
        echo "---"
        echo ""
    fi
fi

# 9. Test removing a locale
run_test "Remove locale" "bun run src/cli.ts remove ja"

# 10. Test reset command
run_test "Reset translations" "bun run src/cli.ts reset"

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Some tests failed. Please check the output above.${NC}"
fi

echo ""
echo "🧹 Cleanup"
echo "========="
echo "To clean up test files, run:"
echo "  rm -rf test-docs idioma.json idioma.lock"