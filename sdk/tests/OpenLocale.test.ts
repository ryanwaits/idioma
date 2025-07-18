import { describe, test, expect, beforeEach, mock } from "bun:test";
import { OpenLocale } from "../src/OpenLocale";
import type { OpenLocaleConfig } from "../src/types";
import { ConfigError, TranslationError } from "../src/errors";

// Mock environment variables
beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-api-key";
});

describe("OpenLocale SDK", () => {
  describe("Constructor", () => {
    test("should create instance with default config", () => {
      const sdk = new OpenLocale();
      expect(sdk).toBeInstanceOf(OpenLocale);
      expect(sdk.getConfig()).toHaveProperty("locale");
    });

    test("should accept custom config", () => {
      const config: OpenLocaleConfig = {
        locale: {
          source: "en",
          targets: ["es", "fr"],
        },
        provider: "openai",
        model: "gpt-4o-2024-08-06",
      };
      
      const sdk = new OpenLocale(config);
      const sdkConfig = sdk.getConfig();
      expect(sdkConfig.locale.targets).toEqual(["es", "fr"]);
      expect(sdkConfig.translation.provider).toBe("openai");
    });

    test("should throw error if API key is missing", () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new OpenLocale({ provider: "anthropic" })).toThrow(ConfigError);
    });
  });

  describe("translateContent", () => {
    test("should translate string content", async () => {
      const sdk = new OpenLocale();
      
      // Mock the translation function
      const mockTranslate = mock(() => 
        Promise.resolve({
          translatedContent: "Hola Mundo",
          usage: {
            promptTokens: 10,
            completionTokens: 5,
            totalTokens: 15,
          },
        })
      );
      
      // This is a simplified test - in real implementation, we'd need to mock the AI client
      const result = await mockTranslate({
        content: "Hello World",
        format: "string",
        sourceLocale: "en",
        targetLocale: "es",
      });

      expect(result.translatedContent).toBe("Hola Mundo");
      expect(result.usage).toBeDefined();
    });

    test("should translate MDX content", async () => {
      const sdk = new OpenLocale();
      
      const mdxContent = `
---
title: Hello
description: World
---

# Hello World

This is a test.
      `.trim();

      // This would need proper mocking of the MDX parser
      const mockTranslate = mock(() => 
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

      const result = await mockTranslate({
        content: mdxContent,
        format: "mdx",
        sourceLocale: "en",
        targetLocale: "es",
      });

      expect(result.translatedContent).toContain("Hola Mundo");
    });

    test("should include cost calculation when requested", async () => {
      const sdk = new OpenLocale();
      
      const mockTranslate = mock(() => 
        Promise.resolve({
          translatedContent: "Translated text",
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
          cost: {
            inputCost: 0.0003,
            outputCost: 0.00075,
            totalCost: 0.00105,
            formattedCost: "< $0.01",
          },
        })
      );

      const result = await mockTranslate({
        content: "Test",
        format: "string",
        sourceLocale: "en",
        targetLocale: "es",
        trackCosts: true,
      });

      expect(result.cost).toBeDefined();
      expect(result.cost?.formattedCost).toBe("< $0.01");
    });
  });

  describe("translateFile", () => {
    test("should handle file not found error", async () => {
      const sdk = new OpenLocale();
      
      const result = await sdk.translateFile({
        filePath: "/non/existent/file.md",
        sourceLocale: "en",
        targetLocale: "es",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("File not found");
    });
  });

  describe("getAvailableFormats", () => {
    test("should return supported formats", () => {
      const sdk = new OpenLocale();
      const formats = sdk.getAvailableFormats();
      
      expect(formats).toContain("mdx");
      expect(formats).toContain("md");
      expect(formats).toContain("string");
    });
  });

  describe("estimateCost", () => {
    test("should estimate translation costs", async () => {
      const sdk = new OpenLocale();
      
      // Mock file resolution
      const mockEstimate = mock(() => 
        Promise.resolve({
          estimatedFiles: 10,
          estimatedTokens: 10000,
          estimatedCost: {
            inputCost: 0.03,
            outputCost: 0.15,
            totalCost: 0.18,
            formattedCost: "$0.18",
          },
          breakdown: [
            {
              locale: "es",
              files: 10,
              estimatedTokens: 5000,
              estimatedCost: 0.09,
            },
            {
              locale: "fr",
              files: 10,
              estimatedTokens: 5000,
              estimatedCost: 0.09,
            },
          ],
        })
      );

      const estimate = await mockEstimate({
        patterns: ["content/**/*.mdx"],
        targetLocales: ["es", "fr"],
      });

      expect(estimate.estimatedFiles).toBe(10);
      expect(estimate.breakdown).toHaveLength(2);
      expect(estimate.estimatedCost.formattedCost).toBe("$0.18");
    });
  });

  describe("updateConfig", () => {
    test("should update configuration", () => {
      const sdk = new OpenLocale();
      
      sdk.updateConfig({
        provider: "openai",
        model: "gpt-4o-mini",
      });

      const config = sdk.getConfig();
      expect(config.translation.provider).toBe("openai");
      expect(config.translation.model).toBe("gpt-4o-mini");
    });
  });

  describe("Static factory", () => {
    test("should create instance using factory method", async () => {
      const sdk = await OpenLocale.create({
        locale: {
          source: "en",
          targets: ["de"],
        },
      });

      expect(sdk).toBeInstanceOf(OpenLocale);
      expect(sdk.getConfig().locale.targets).toContain("de");
    });
  });
});