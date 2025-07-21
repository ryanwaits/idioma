#!/usr/bin/env bun
import { OpenLocale, PRICING } from '../src';

async function main() {
  console.log('OpenLocale Provider Examples\n');

  // Example 1: Using Anthropic (default)
  console.log('Example 1: Anthropic Provider');
  console.log('-----------------------------');

  const anthropicSDK = await OpenLocale.create({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20240620',
  });

  const anthropicResult = await anthropicSDK.translateContent({
    content: 'Artificial intelligence is transforming the world',
    format: 'string',
    sourceLocale: 'en',
    targetLocale: 'es',
    trackCosts: true,
  });

  console.log('Original:', 'Artificial intelligence is transforming the world');
  console.log('Spanish:', anthropicResult.translatedContent);
  console.log('Provider:', anthropicSDK.getConfig().translation.provider);
  console.log('Model:', anthropicSDK.getConfig().translation.model || 'default');
  if (anthropicResult.cost) {
    console.log('Cost:', anthropicResult.cost.formattedCost);
    console.log('Tokens:', anthropicResult.usage?.totalTokens);
  }

  // Example 2: Using OpenAI
  console.log('\n\nExample 2: OpenAI Provider');
  console.log('--------------------------');

  // Note: Requires OPENAI_API_KEY in environment
  if (process.env.OPENAI_API_KEY) {
    const openaiSDK = await OpenLocale.create({
      provider: 'openai',
      model: 'gpt-4o-2024-08-06',
      apiKey: process.env.OPENAI_API_KEY,
    });

    const openaiResult = await openaiSDK.translateContent({
      content: 'Machine learning models are becoming more sophisticated',
      format: 'string',
      sourceLocale: 'en',
      targetLocale: 'fr',
      trackCosts: true,
    });

    console.log('Original:', 'Machine learning models are becoming more sophisticated');
    console.log('French:', openaiResult.translatedContent);
    console.log('Provider:', openaiSDK.getConfig().translation.provider);
    console.log('Model:', openaiSDK.getConfig().translation.model);
    if (openaiResult.cost) {
      console.log('Cost:', openaiResult.cost.formattedCost);
      console.log('Tokens:', openaiResult.usage?.totalTokens);
    }
  } else {
    console.log('Skip: OPENAI_API_KEY not found in environment');
  }

  // Example 3: Switching providers dynamically
  console.log('\n\nExample 3: Dynamic Provider Switching');
  console.log('------------------------------------');

  const sdk = await OpenLocale.create({
    provider: 'anthropic',
  });

  console.log('Initial provider:', sdk.getConfig().translation.provider);

  // Update to use OpenAI GPT-4o-mini for cost savings
  sdk.updateConfig({
    provider: 'openai',
    model: 'gpt-4o-mini',
  });

  console.log('Updated provider:', sdk.getConfig().translation.provider);
  console.log('Updated model:', sdk.getConfig().translation.model);

  // Example 4: Display pricing information
  console.log('\n\nExample 4: Pricing Information');
  console.log('------------------------------');
  console.log('\nAnthropic Models:');
  Object.entries(PRICING.anthropic).forEach(([model, pricing]) => {
    console.log(`- ${model}:`);
    console.log(`  Input: $${pricing.input}/1M tokens`);
    console.log(`  Output: $${pricing.output}/1M tokens`);
  });

  console.log('\nOpenAI Models:');
  Object.entries(PRICING.openai).forEach(([model, pricing]) => {
    console.log(`- ${model}:`);
    console.log(`  Input: $${pricing.input}/1M tokens`);
    console.log(`  Output: $${pricing.output}/1M tokens`);
  });

  // Example 5: Cost comparison
  console.log('\n\nExample 5: Cost Comparison');
  console.log('--------------------------');

  const _testContent = `
# Product Documentation

This is a comprehensive guide to our product features:

1. **Installation**: Easy setup process
2. **Configuration**: Flexible options
3. **API Reference**: Complete documentation
4. **Examples**: Real-world use cases
5. **Troubleshooting**: Common issues and solutions

Our product is designed to be user-friendly while providing powerful features for advanced users.
  `.trim();

  // Estimate costs for different models
  const models = [
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20240620' },
    { provider: 'openai', model: 'gpt-4o-2024-08-06' },
    { provider: 'openai', model: 'gpt-4o-mini' },
  ];

  console.log('Estimating costs for translating sample documentation...\n');

  for (const { provider, model } of models) {
    const _testSDK = await OpenLocale.create({ provider: provider as any, model: model as any });

    // Mock estimate (in real usage, this would call the API)
    const avgTokens = 500; // Rough estimate for the sample
    const pricing = PRICING[provider][model];
    const inputCost = (avgTokens * 0.7 * pricing.input) / 1_000_000;
    const outputCost = (avgTokens * 0.3 * pricing.output) / 1_000_000;
    const totalCost = inputCost + outputCost;

    console.log(`${provider}/${model}:`);
    console.log(`  Estimated cost: $${totalCost.toFixed(4)}`);
    console.log(`  Cost per 1000 docs: $${(totalCost * 1000).toFixed(2)}`);
  }
}

main().catch(console.error);
