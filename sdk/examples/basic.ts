#!/usr/bin/env bun
import { OpenLocale } from '../src';

async function main() {
  // Initialize SDK with Anthropic
  const openlocale = await OpenLocale.create({
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Example 1: Translate simple string
  console.log('Example 1: Translating simple string...');
  const stringResult = await openlocale.translateContent({
    content: 'Hello, how are you today?',
    format: 'string',
    sourceLocale: 'en',
    targetLocale: 'es',
  });
  console.log(`English: Hello, how are you today?`);
  console.log(`Spanish: ${stringResult.translatedContent}`);
  console.log('---\n');

  // Example 2: Translate Markdown with cost tracking
  console.log('Example 2: Translating Markdown with cost tracking...');
  const markdownContent = `
# Welcome to OpenLocale

This is a **powerful** translation tool that:
- Preserves formatting
- Handles multiple languages
- Tracks costs

> Built with AI for developers
  `.trim();

  const mdResult = await openlocale.translateContent({
    content: markdownContent,
    format: 'md',
    sourceLocale: 'en',
    targetLocale: 'fr',
    trackCosts: true,
  });

  console.log('Original Markdown:');
  console.log(markdownContent);
  console.log('\nTranslated to French:');
  console.log(mdResult.translatedContent);
  
  if (mdResult.cost) {
    console.log(`\nCost: ${mdResult.cost.formattedCost}`);
    console.log(`Tokens: ${mdResult.usage?.totalTokens}`);
  }
  console.log('---\n');

  // Example 3: Translate MDX content
  console.log('Example 3: Translating MDX content...');
  const mdxContent = `
---
title: Getting Started
description: Learn how to use OpenLocale
---

import { Callout } from '@/components/Callout'

# Getting Started

<Callout type="info" title="Prerequisites">
  You need Node.js 18+ installed
</Callout>

## Installation

Install the SDK using your preferred package manager:

\`\`\`bash
npm install @openlocale/sdk
\`\`\`

## Quick Example

Here's how to translate content:

\`\`\`typescript
const result = await openlocale.translateContent({
  content: 'Hello World',
  format: 'string',
  sourceLocale: 'en',
  targetLocale: 'es',
});
\`\`\`
  `.trim();

  const mdxResult = await openlocale.translateContent({
    content: mdxContent,
    format: 'mdx',
    sourceLocale: 'en',
    targetLocale: 'zh',
    trackCosts: true,
  });

  console.log('Translated MDX to Chinese:');
  console.log(mdxResult.translatedContent.split('\n').slice(0, 10).join('\n') + '...');
  
  if (mdxResult.cost) {
    console.log(`\nCost: ${mdxResult.cost.formattedCost}`);
  }
}

main().catch(console.error);