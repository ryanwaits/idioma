import { getFormatDefaults, mergeWithDefaults } from '../core/format-defaults';
import type { Config } from './config';

/**
 * Normalize file config from simple array to full object format
 */
export function normalizeFileConfig(
  fileConfig: string[] | Record<string, any>,
  fileType: string
): Record<string, any> {
  // If it's already an object, merge with defaults
  if (!Array.isArray(fileConfig)) {
    const defaults = getFormatDefaults(fileType);
    return mergeWithDefaults(fileConfig, defaults);
  }

  // Convert simple array to object format with defaults
  const defaults = getFormatDefaults(fileType);
  return {
    include: fileConfig,
    ...defaults,
  };
}

/**
 * Normalize entire config to use full object format with smart defaults
 */
export function normalizeConfig(config: Config): Config {
  const normalizedFiles: Record<string, any> = {};

  for (const [fileType, fileConfig] of Object.entries(config.files || {})) {
    normalizedFiles[fileType] = normalizeFileConfig(fileConfig, fileType);
  }

  return {
    ...config,
    files: normalizedFiles,
  };
}

/**
 * Get effective config for a file type (with all defaults applied)
 */
export function getEffectiveFileConfig(config: Config, fileType: string): Record<string, any> {
  const fileConfig = config.files?.[fileType];
  if (!fileConfig) {
    return getFormatDefaults(fileType);
  }

  return normalizeFileConfig(fileConfig, fileType);
}
