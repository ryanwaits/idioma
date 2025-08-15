// Core exports

// AI exports
export {
  getEffectiveProviderAndModel,
  getSmartDefaults,
  hasApiKeyForProvider,
} from './ai/defaults';
// Core functionality exports
export { processFiles } from './core/process-files';
export { translateFile } from './core/translate-file';
export * from './errors';
export { Idioma } from './Idioma';
// Parser and strategy exports
export { getFileStrategy } from './parsers';
export * from './strategies';
export * from './types';
export type { Config } from './utils/config';
export { loadConfig, mergeConfig, saveConfig } from './utils/config';
// Utility exports
export type { CostCalculation, TokenUsage } from './utils/cost';
export { aggregateUsage, calculateCost, formatCost, formatTokenCount, PRICING } from './utils/cost';
export { getLockFile, loadLock, saveLock, saveLockFile, shouldTranslate } from './utils/lockfile';
export { replaceLocaleInPattern } from './utils/paths';
