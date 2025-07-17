import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

// Extended config schema with provider and rules
export const ConfigSchema = z.object({
  projectId: z.string().optional(),
  locale: z.object({
    source: z.string().default('en'),
    targets: z.array(z.string()).default([]),
  }),
  files: z.record(z.string(), z.object({
    include: z.array(z.string()),
  })),
  translation: z.object({
    frontmatterFields: z.array(z.string()).default(['title', 'description', 'sidebarTitle']),
    jsxAttributes: z.array(z.string()).default(['title', 'description', 'tag', 'alt', 'placeholder', 'label']),
    skipPatterns: z.array(z.string()).default([]),
    // New fields for extensibility
    provider: z.string().default('anthropic'),
    model: z.string().optional(), // Optional model specification
    rules: z.object({
      patternsToSkip: z.array(z.string()).default([]), // No default patterns - intelligent detection instead
    }).optional(),
  }).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

const configPath = path.resolve('openlocale.json');

export async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return ConfigSchema.parse(JSON.parse(data));
  } catch {
    throw new Error('Configuration file not found. Run "openlocale init" first.');
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}