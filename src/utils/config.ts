import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

// Extended config schema with provider and rules
export const ConfigSchema: z.ZodSchema = z.object({
  projectId: z.string().optional(),
  locale: z.object({
    source: z.string().default('en'),
    targets: z.array(z.string()).default([]),
  }),
  files: z.record(
    z.string(),
    z.union([
      z.object({
        include: z.array(z.string()),
        exclude: z.array(z.string()).optional(),
        // MDX-specific options
        frontmatterFields: z.array(z.string()).optional(),
        jsxAttributes: z.array(z.string()).optional(),
      }),
      z.object({
        include: z.array(z.string()),
        exclude: z.array(z.string()).optional(),
        // JSON-specific options
        includePaths: z.array(z.string()).optional(),
        excludePaths: z.array(z.string()).optional(),
        preserveArrayOrder: z.boolean().optional(),
        skipEmptyStrings: z.boolean().optional(),
      }),
      z.object({
        include: z.array(z.string()),
        exclude: z.array(z.string()).optional(),
        // YAML-specific options
        preserveComments: z.boolean().optional(),
      }),
      z.object({
        include: z.array(z.string()),
        exclude: z.array(z.string()).optional(),
        // HTML-specific options
        translatableAttributes: z.array(z.string()).optional(),
      }),
      z.object({
        include: z.array(z.string()),
        exclude: z.array(z.string()).optional(),
        // CSV-specific options
        columns: z.array(z.string()).optional(),
        skipHeader: z.boolean().optional(),
        delimiter: z.string().optional(),
      }),
      z.object({
        include: z.array(z.string()),
        exclude: z.array(z.string()).optional(),
        // XML-specific options
        translatableElements: z.array(z.string()).optional(),
        preserveNamespaces: z.boolean().optional(),
      }),
      z.object({
        include: z.array(z.string()),
        exclude: z.array(z.string()).optional(),
        // JavaScript-specific options
        translateJSDoc: z.boolean().optional(),
        translateComments: z.boolean().optional(),
        translateStringLiterals: z.boolean().optional(),
      }),
    ])
  ),
  translation: z
    .object({
      provider: z.string().default('anthropic'),
      model: z.string().optional(), // Optional model specification
      skipPatterns: z.array(z.string()).default([]),
      rules: z
        .object({
          patternsToSkip: z.array(z.string()).default([]), // No default patterns - intelligent detection instead
        })
        .optional(),
    })
    .optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

const configPath = path.resolve('idioma.json');

export async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return ConfigSchema.parse(JSON.parse(data));
  } catch {
    throw new Error('Configuration file not found. Run "idioma init" first.');
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export function mergeConfig(base: Config, overrides: Partial<Config>): Config {
  const mergedTranslation = {
    provider: overrides.translation?.provider || base?.translation?.provider || 'anthropic',
    model: overrides.translation?.model || base?.translation?.model,
    skipPatterns: overrides.translation?.skipPatterns || base?.translation?.skipPatterns || [],
    rules: {
      patternsToSkip: [
        ...(base?.translation?.rules?.patternsToSkip || []),
        ...(overrides.translation?.rules?.patternsToSkip || []),
      ],
    },
  };

  return {
    ...base,
    ...overrides,
    locale: {
      ...(base?.locale || {}),
      ...(overrides.locale || {}),
    },
    files: {
      ...(base?.files || {}),
      ...(overrides.files || {}),
    },
    translation: mergedTranslation,
  };
}
