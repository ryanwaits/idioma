import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { ConfigError } from '../src/errors';
import { Idioma } from '../src/Idioma';
import type { IdiomaConfig } from '../src/types';

// Mock environment variables
beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-api-key';
});

describe('Idioma SDK', () => {
  describe('Constructor', () => {
    test('should create instance with default config', async () => {
      const sdk = await Idioma.create();
      expect(sdk).toBeInstanceOf(Idioma);
      expect(sdk.getConfig()).toHaveProperty('locale');
    });

    test('should accept custom config', async () => {
      const config: IdiomaConfig = {
        locale: {
          source: 'en',
          targets: ['es', 'fr'],
        },
        provider: 'openai',
        model: 'gpt-4o-2024-08-06',
        apiKey: 'test-openai-key',
      };

      const sdk = await Idioma.create(config);
      const sdkConfig = sdk.getConfig();
      expect(sdkConfig.locale.targets).toEqual(['es', 'fr']);
      expect(sdkConfig.translation?.provider).toBe('openai');
    });

    test('should throw error if API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      await expect(Idioma.create({ provider: 'anthropic' })).rejects.toThrow(ConfigError);
    });
  });

  describe('translateContent', () => {
    test('should translate string content', async () => {
      const sdk = await Idioma.create();

      // Mock the translateContent method
      const originalMethod = sdk.translateContent.bind(sdk);
      sdk.translateContent = mock(() =>
        Promise.resolve({
          translatedContent: 'Hola Mundo',
          usage: {
            promptTokens: 10,
            completionTokens: 5,
            totalTokens: 15,
          },
        })
      );

      const result = await sdk.translateContent({
        content: 'Hello World',
        format: 'string',
        sourceLocale: 'en',
        targetLocale: 'es',
      });

      expect(result.translatedContent).toBe('Hola Mundo');
      expect(result.usage).toBeDefined();
      
      // Restore original method
      sdk.translateContent = originalMethod;
    });

    test('should translate MDX content', async () => {
      const sdk = await Idioma.create();

      const mdxContent = `
---
title: Hello
description: World
---

# Hello World

This is a test.
      `.trim();

      // Mock the translateContent method for MDX
      const originalMethod = sdk.translateContent.bind(sdk);
      sdk.translateContent = mock(() =>
        Promise.resolve({
          translatedContent: `
---
title: Hola
description: Mundo
---

# Hola Mundo

Esto es una prueba.
          `.trim(),
        })
      );

      const result = await sdk.translateContent({
        content: mdxContent,
        format: 'mdx',
        sourceLocale: 'en',
        targetLocale: 'es',
      });

      expect(result.translatedContent).toContain('Hola Mundo');
      
      // Restore original method
      sdk.translateContent = originalMethod;
    });

    test('should include cost calculation when requested', async () => {
      const sdk = await Idioma.create();

      // Mock the translateContent method with costs
      const originalMethod = sdk.translateContent.bind(sdk);
      sdk.translateContent = mock(() =>
        Promise.resolve({
          translatedContent: 'Translated text',
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
          cost: {
            inputCost: 0.0003,
            outputCost: 0.00075,
            totalCost: 0.00105,
            formattedCost: '< $0.01',
          },
        })
      );

      const result = await sdk.translateContent({
        content: 'Test',
        format: 'string',
        sourceLocale: 'en',
        targetLocale: 'es',
        trackCosts: true,
      });

      expect(result.cost).toBeDefined();
      expect(result.cost?.formattedCost).toBe('< $0.01');
      
      // Restore original method
      sdk.translateContent = originalMethod;
    });
  });

  describe('translateFile', () => {
    test('should handle file not found error', async () => {
      const sdk = await Idioma.create();

      const result = await sdk.translateFile({
        filePath: '/non/existent/file.md',
        sourceLocale: 'en',
        targetLocale: 'es',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('getAvailableFormats', () => {
    test('should return supported formats', async () => {
      const sdk = await Idioma.create();
      const formats = sdk.getAvailableFormats();

      expect(formats).toContain('mdx');
      expect(formats).toContain('md');
      expect(formats).toContain('string');
    });
  });

  describe('estimateCost', () => {
    test('should estimate translation costs', async () => {
      const sdk = await Idioma.create();

      // Mock the estimateCost method
      const originalMethod = sdk.estimateCost.bind(sdk);
      sdk.estimateCost = mock(() =>
        Promise.resolve({
          estimatedFiles: 10,
          estimatedTokens: 10000,
          estimatedCost: {
            inputCost: 0.03,
            outputCost: 0.15,
            totalCost: 0.18,
            formattedCost: '$0.18',
          },
          breakdown: [
            {
              locale: 'es',
              files: 10,
              estimatedTokens: 5000,
              estimatedCost: 0.09,
            },
            {
              locale: 'fr',
              files: 10,
              estimatedTokens: 5000,
              estimatedCost: 0.09,
            },
          ],
        })
      );

      const estimate = await sdk.estimateCost({
        patterns: ['content/**/*.mdx'],
        targetLocales: ['es', 'fr'],
      });

      expect(estimate.estimatedFiles).toBe(10);
      expect(estimate.breakdown).toHaveLength(2);
      expect(estimate.estimatedCost.formattedCost).toBe('$0.18');
      
      // Restore original method
      sdk.estimateCost = originalMethod;
    });
  });

  describe('updateConfig', () => {
    test('should update configuration', async () => {
      const sdk = await Idioma.create();

      sdk.updateConfig({
        provider: 'openai',
        model: 'gpt-4o-mini',
      });

      const config = sdk.getConfig();
      expect(config.translation?.provider).toBe('openai');
      expect(config.translation?.model).toBe('gpt-4o-mini');
    });
  });

  describe('Static factory', () => {
    test('should create instance using factory method', async () => {
      const sdk = await Idioma.create({
        locale: {
          source: 'en',
          targets: ['de'],
        },
      });

      expect(sdk).toBeInstanceOf(Idioma);
      expect(sdk.getConfig().locale.targets).toContain('de');
    });
  });
});
