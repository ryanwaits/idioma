import type { z } from "zod";
import type { TokenUsage, CostCalculation } from "@/utils/cost";
import type { Config } from "@/utils/config";

export interface TranslateContentParams {
  content: string;
  format: "mdx" | "md" | "string";
  sourceLocale: string;
  targetLocale: string;
  trackCosts?: boolean;
}

export interface TranslateContentResult {
  translatedContent: string;
  usage?: TokenUsage;
  cost?: CostCalculation;
}

export interface TranslateFileParams {
  filePath: string;
  sourceLocale: string;
  targetLocale: string;
  outputPath?: string;
  showCosts?: boolean;
}

export interface TranslateFileResult {
  success: boolean;
  outputPath?: string;
  usage?: TokenUsage;
  cost?: CostCalculation;
  error?: string;
}

export interface TranslateFilesParams {
  patterns: string[];
  sourceLocale: string;
  targetLocales: string[];
  showCosts?: boolean;
}

export interface ProcessFilesResult {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  totalUsage?: TokenUsage;
  totalCost?: CostCalculation;
  errors: Array<{ file: string; error: string }>;
}

export interface CostEstimateParams {
  patterns: string[];
  targetLocales: string[];
}

export interface CostEstimate {
  estimatedFiles: number;
  estimatedTokens: number;
  estimatedCost: CostCalculation;
  breakdown: Array<{
    locale: string;
    files: number;
    estimatedTokens: number;
    estimatedCost: number;
  }>;
}

export interface OpenLocaleConfig extends Partial<Config> {
  apiKey?: string;
  provider?: "anthropic" | "openai";
  model?: string;
  cachePath?: string;
}