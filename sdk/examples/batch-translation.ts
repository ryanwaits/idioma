#!/usr/bin/env bun
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { OpenLocale } from '../src';

async function main() {
  // Initialize SDK
  const openlocale = await OpenLocale.create({
    provider: 'anthropic',
    translation: {
      frontmatterFields: ['title', 'description', 'sidebarTitle'],
      jsxAttributes: ['alt', 'title', 'placeholder', 'label'],
    },
  });

  // Create sample files for demonstration
  console.log('Creating sample files...');
  await createSampleFiles();

  // Example 1: Translate a single file
  console.log('\nExample 1: Translating a single file...');
  const fileResult = await openlocale.translateFile({
    filePath: 'examples/content/en/guide.mdx',
    sourceLocale: 'en',
    targetLocale: 'es',
    outputPath: 'examples/content/es/guide.mdx',
    showCosts: true,
  });

  if (fileResult.success) {
    console.log(`✓ Translated to: ${fileResult.outputPath}`);
    if (fileResult.cost) {
      console.log(`  Cost: ${fileResult.cost.formattedCost}`);
    }
  } else {
    console.error(`✗ Error: ${fileResult.error}`);
  }

  // Example 2: Batch translate multiple files
  console.log('\nExample 2: Batch translating multiple files...');
  const batchResult = await openlocale.translateFiles({
    patterns: ['examples/content/en/**/*.mdx'],
    sourceLocale: 'en',
    targetLocales: ['es', 'fr'],
    showCosts: true,
  });

  console.log(`\nBatch Translation Summary:`);
  console.log(`- Total files: ${batchResult.totalFiles}`);
  console.log(`- Successful: ${batchResult.successCount}`);
  console.log(`- Failed: ${batchResult.errorCount}`);

  if (batchResult.totalCost) {
    console.log(`- Total cost: ${batchResult.totalCost.formattedCost}`);
    console.log(`- Total tokens: ${batchResult.totalUsage?.totalTokens}`);
  }

  if (batchResult.errors.length > 0) {
    console.log('\nErrors:');
    batchResult.errors.forEach(({ file, error }) => {
      console.log(`- ${file}: ${error}`);
    });
  }

  // Example 3: Cost estimation
  console.log('\nExample 3: Estimating translation costs...');
  const estimate = await openlocale.estimateCost({
    patterns: ['examples/content/en/**/*.mdx'],
    targetLocales: ['es', 'fr', 'de', 'ja', 'zh'],
  });

  console.log('\nCost Estimate for 5 languages:');
  console.log(`- Files to translate: ${estimate.estimatedFiles}`);
  console.log(`- Estimated tokens: ${estimate.estimatedTokens.toLocaleString()}`);
  console.log(`- Estimated cost: ${estimate.estimatedCost.formattedCost}`);
  console.log('\nBreakdown by locale:');
  estimate.breakdown.forEach(({ locale, files, estimatedCost }) => {
    console.log(`  - ${locale}: ${files} files, ~$${estimatedCost.toFixed(2)}`);
  });
}

async function createSampleFiles() {
  const files = [
    {
      path: 'examples/content/en/guide.mdx',
      content: `---
title: User Guide
description: Complete guide to using our product
sidebarTitle: Guide
---

import { Button } from '@/components/Button'
import { Alert } from '@/components/Alert'

# User Guide

Welcome to our comprehensive user guide. This guide will help you get started quickly.

<Alert type="info" title="New to our product?">
  Check out our [quick start tutorial](/docs/quickstart) to get up and running in minutes.
</Alert>

## Getting Started

First, you'll need to install our CLI tool:

\`\`\`bash
npm install -g @ourcompany/cli
\`\`\`

<Button label="Download Now" href="/download" />

## Key Features

- **Easy to use**: Intuitive interface designed for developers
- **Powerful**: Advanced features for power users
- **Flexible**: Customize everything to your needs

## Next Steps

Ready to dive deeper? Check out these resources:

1. [API Reference](/docs/api)
2. [Examples](/docs/examples)
3. [Best Practices](/docs/best-practices)
`,
    },
    {
      path: 'examples/content/en/api.mdx',
      content: `---
title: API Reference
description: Complete API documentation
---

# API Reference

Our API provides programmatic access to all features.

## Authentication

All API requests require authentication using an API key:

\`\`\`typescript
const client = new APIClient({
  apiKey: process.env.API_KEY
});
\`\`\`

## Endpoints

### POST /api/translate

Translate content between languages.

\`\`\`json
{
  "content": "Hello World",
  "sourceLocale": "en",
  "targetLocale": "es"
}
\`\`\`
`,
    },
  ];

  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content);
  }
}

main().catch(console.error);
