#!/usr/bin/env bun

/**
 * Example of using the OpenLocale SDK from within the main project
 * This demonstrates how the SDK wraps the core functionality
 */

import { OpenLocale } from "../sdk/src/OpenLocale";
import type { OpenLocaleConfig } from "../sdk/src/types";

async function main() {
  console.log("OpenLocale SDK Integration Example\n");

  // Initialize the SDK using the existing config
  const config: OpenLocaleConfig = {
    provider: "anthropic",
    locale: {
      source: "en",
      targets: ["es", "fr"],
    },
    translation: {
      frontmatterFields: ["title", "description", "sidebarTitle"],
      jsxAttributes: ["alt", "title", "placeholder", "label"],
    },
  };

  const openlocale = await OpenLocale.create(config);

  // Example 1: Translate MDX content
  console.log("Example 1: Translating MDX content with the SDK");
  console.log("-----------------------------------------------\n");

  const mdxContent = `---
title: SDK Integration Guide
description: Learn how to use the OpenLocale SDK
sidebarTitle: SDK Guide
---

import { Callout } from '@/components/Callout'

# SDK Integration Guide

The OpenLocale SDK provides a programmatic interface for translations.

<Callout type="info" title="Installation">
Install the SDK: \`npm install @openlocale/sdk\`
</Callout>

## Key Features

- **Simple API**: Easy to integrate
- **Cost tracking**: Monitor translation costs
- **Batch processing**: Handle multiple files efficiently
`;

  const result = await openlocale.translateContent({
    content: mdxContent,
    format: "mdx",
    sourceLocale: "en",
    targetLocale: "es",
    trackCosts: true,
  });

  console.log("Translation completed!");
  console.log("- Format: MDX");
  console.log("- Target: Spanish");
  
  if (result.cost) {
    console.log("- Cost:", result.cost.formattedCost);
    console.log("- Tokens:", result.usage?.totalTokens);
  }

  // Show a snippet of the translated content
  const lines = result.translatedContent.split("\n");
  console.log("\nTranslated content (first 10 lines):");
  console.log(lines.slice(0, 10).join("\n"));
  console.log("...\n");

  // Example 2: Batch file translation
  console.log("Example 2: Batch translating documentation files");
  console.log("-----------------------------------------------\n");

  const batchResult = await openlocale.translateFiles({
    patterns: ["content/docs/[locale]/**/*.mdx"],
    sourceLocale: "en",
    targetLocales: ["es", "fr"],
    showCosts: true,
  });

  console.log("Batch translation summary:");
  console.log("- Total files:", batchResult.totalFiles);
  console.log("- Successful:", batchResult.successCount);
  console.log("- Failed:", batchResult.errorCount);
  
  if (batchResult.totalCost) {
    console.log("- Total cost:", batchResult.totalCost.formattedCost);
    console.log("- Average per file:", 
      `$${(batchResult.totalCost.totalCost / batchResult.successCount).toFixed(3)}`
    );
  }

  // Example 3: Cost estimation
  console.log("\nExample 3: Estimating costs for multiple languages");
  console.log("-------------------------------------------------\n");

  const estimate = await openlocale.estimateCost({
    patterns: ["content/docs/**/*.mdx"],
    targetLocales: ["es", "fr", "de", "ja", "zh", "ko", "pt", "ru"],
  });

  console.log("Translation cost estimate:");
  console.log("- Files to process:", estimate.estimatedFiles);
  console.log("- Target languages:", estimate.breakdown.length);
  console.log("- Total estimated cost:", estimate.estimatedCost.formattedCost);
  console.log("\nPer-language breakdown:");
  
  estimate.breakdown.forEach(({ locale, files, estimatedCost }) => {
    console.log(`  ${locale}: ${files} files, ~$${estimatedCost.toFixed(2)}`);
  });

  // Example 4: Provider comparison
  console.log("\nExample 4: Comparing providers");
  console.log("------------------------------\n");

  const providers = [
    { name: "Anthropic Claude 3.5", provider: "anthropic", model: "claude-3-5-sonnet-20240620" },
    { name: "OpenAI GPT-4o", provider: "openai", model: "gpt-4o-2024-08-06" },
    { name: "OpenAI GPT-4o-mini", provider: "openai", model: "gpt-4o-mini" },
  ];

  for (const { name, provider, model } of providers) {
    openlocale.updateConfig({ provider: provider as any, model });
    
    const testResult = await openlocale.translateContent({
      content: "This is a test sentence for cost comparison.",
      format: "string",
      sourceLocale: "en",
      targetLocale: "es",
      trackCosts: true,
    });

    console.log(`${name}:`);
    if (testResult.cost) {
      console.log(`  Cost: ${testResult.cost.formattedCost}`);
      console.log(`  Tokens: ${testResult.usage?.totalTokens}`);
    }
  }

  console.log("\n✓ SDK integration example completed!");
}

main().catch(console.error);