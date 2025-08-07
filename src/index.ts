// Main entry point for Idioma library
export { Idioma } from '../sdk/src/Idioma';
export type { IdiomaConfig } from '../sdk/src/types';
export * from '../sdk/src/types';
export * from '../sdk/src/errors';

// Export utilities for advanced usage
export { createAiClient, translateText } from './ai/translate';
export { loadConfig, saveConfig } from './utils/config';
export type { Config } from './utils/config';
export { loadLock, saveLock } from './utils/lockfile';
export type { LockFile } from './utils/lockfile';
export { calculateCost, type TokenUsage, type CostCalculation } from './utils/cost';