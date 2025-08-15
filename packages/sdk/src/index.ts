// Core exports
export * from './errors';
export { Idioma } from './Idioma';
export * from './types';

// AI exports
export { getSmartDefaults, getEffectiveProviderAndModel, hasApiKeyForProvider } from './ai/defaults';

// Utility exports
export type { CostCalculation, TokenUsage } from './utils/cost';
export { PRICING, calculateCost, aggregateUsage, formatCost, formatTokenCount } from './utils/cost';
export type { Config } from './utils/config';
export { loadConfig, saveConfig, mergeConfig } from './utils/config';
export { loadLock, saveLock, getLockFile, saveLockFile, shouldTranslate } from './utils/lockfile';
export { replaceLocaleInPattern } from './utils/paths';

// Core functionality exports
export { processFiles } from './core/process-files';
export { translateFile } from './core/translate-file';

// Parser and strategy exports
export { getFileStrategy } from './parsers';
export * from './strategies';
