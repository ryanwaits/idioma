import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

export const ConfigSchema: z.ZodSchema = z.object({
  projectId: z.string().optional(),
  locale: z.object({
    source: z.string().default('en'),
    targets: z.array(z.string()).default([]),
  }),
  files: z.union([
    z.array(z.string()),
    z.object({
      include: z.array(z.union([
        z.string(),
        z.object({
          source: z.string(),
          target: z.string()
        })
      ])),
      exclude: z.array(z.string()).optional(),

      mdx: z.object({
        translatableAttributes: z.array(z.string()).optional(),
        frontmatterFields: z.array(z.string()).optional(),
        jsxAttributes: z.array(z.string()).optional(),
        skipTags: z.array(z.string()).optional(),
      }).optional(),

      json: z.object({
        includePaths: z.array(z.string()).optional(),
        excludePaths: z.array(z.string()).optional(),
        skipEmptyStrings: z.boolean().optional(),
        skipKeys: z.array(z.string()).optional(),
      }).optional(),

      yaml: z.object({
        includePaths: z.array(z.string()).optional(),
        excludePaths: z.array(z.string()).optional(),
        preserveComments: z.boolean().optional(),
        skipEmptyStrings: z.boolean().optional(),
      }).optional(),

      html: z.object({
        translatableAttributes: z.array(z.string()).optional(),
        skipTags: z.array(z.string()).optional(),
        preserveWhitespace: z.boolean().optional(),
      }).optional(),

      xml: z.object({
        translatableAttributes: z.array(z.string()).optional(),
        skipTags: z.array(z.string()).optional(),
        preserveCDATA: z.boolean().optional(),
        preserveNamespaces: z.boolean().optional(),
      }).optional(),
    }),
  ]),
  translation: z
    .object({
      provider: z.string().default('anthropic'),
      model: z.string().optional(),
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
