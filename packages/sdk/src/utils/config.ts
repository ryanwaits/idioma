import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

export const ConfigSchema: z.ZodSchema = z.object({
  provider: z.string().default('anthropic'),
  model: z.string().optional(),
  locale: z.object({
    source: z.string().default('en'),
    targets: z.array(z.string()).default([]),
  }),
  files: z.union([
    z.array(z.string()),
    z.object({
      include: z.array(
        z.union([
          z.string(),
          z.object({
            source: z.string(),
            target: z.string(),
          }),
        ])
      ),
      exclude: z.array(z.string()).optional(),

      mdx: z
        .object({
          skipAttributes: z
            .object({
              jsx: z.array(z.string()).optional(),
              frontmatter: z.array(z.string()).optional(),
            })
            .optional(),
          skipTags: z.array(z.string()).optional(),
        })
        .optional(),

      json: z
        .object({
          skipPaths: z.array(z.string()).optional(),
          skipKeys: z.array(z.string()).optional(),
          skipEmptyStrings: z.boolean().optional(),
        })
        .optional(),

      yaml: z
        .object({
          skipPaths: z.array(z.string()).optional(),
          skipKeys: z.array(z.string()).optional(),
          skipEmptyStrings: z.boolean().optional(),
          preserveComments: z.boolean().optional(),
        })
        .optional(),

      html: z
        .object({
          skipAttributes: z.array(z.string()).optional(),
          skipTags: z.array(z.string()).optional(),
          preserveWhitespace: z.boolean().optional(),
        })
        .optional(),

      xml: z
        .object({
          skipAttributes: z.array(z.string()).optional(),
          skipTags: z.array(z.string()).optional(),
          preserveCDATA: z.boolean().optional(),
          preserveNamespaces: z.boolean().optional(),
        })
        .optional(),
    }),
  ]),
  preserve: z.array(z.string()).optional(),
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
    preserve: [...(base?.preserve || []), ...(overrides.preserve || [])],
  };
}
