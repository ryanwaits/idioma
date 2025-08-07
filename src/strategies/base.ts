import type { Config } from '../utils/config';
import type { TokenUsage } from '../utils/cost';
import { translateText } from '../ai/translate';

// Unified result type for translation
export interface TranslationResult {
  content: string;
  usage: TokenUsage;
}

// Parse result for internal use
export interface ParseResult {
  translatableContent: Map<string, TranslatableNode>;
  metadata: any;
}

// Node representing translatable content
export interface TranslatableNode {
  value: string;
  context?: string;
  [key: string]: any;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    line?: number;
    column?: number;
    message: string;
  }>;
}

/**
 * Base class for all translation strategies
 * Provides a unified interface and common functionality
 */
export abstract class BaseTranslationStrategy {
  
  /**
   * Check if this strategy can handle the given file
   */
  abstract canHandle(filePath: string): boolean;
  
  /**
   * Get the name of this strategy for logging
   */
  abstract getName(): string;
  
  /**
   * Parse content and extract translatable strings
   */
  protected abstract parse(content: string): Promise<ParseResult>;
  
  /**
   * Reconstruct content with translated strings
   */
  protected abstract reconstruct(
    translations: Map<string, string>, 
    metadata: any
  ): Promise<string>;
  
  /**
   * Validate content format
   */
  abstract validate(content: string): ValidationResult;
  
  /**
   * Main translation method - orchestrates the full flow
   * This is what gets called by the CLI/SDK
   */
  async translate(
    content: string,
    sourceLocale: string,
    targetLocale: string,
    config: Config,
    aiClient?: any, // Optional, we can use translateText directly
    model?: string,
    provider?: string
  ): Promise<TranslationResult> {
    // Parse the content
    const parseResult = await this.parse(content);
    
    // Skip if no translatable content
    if (parseResult.translatableContent.size === 0) {
      return {
        content,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }
    
    // Translate all strings (in parallel for performance)
    const translations = new Map<string, string>();
    const translationPromises: Promise<void>[] = [];
    const usages: TokenUsage[] = [];
    
    // Batch translations for efficiency (optional optimization)
    const batchSize = 10; // Translate 10 strings at a time
    const entries = Array.from(parseResult.translatableContent.entries());
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      const batchPromise = Promise.all(
        batch.map(async ([path, node]) => {
          const result = await translateText(
            node.value,
            sourceLocale,
            targetLocale,
            provider || config.translation?.provider || 'anthropic',
            model || config.translation?.model
          );
          
          translations.set(path, result.text);
          usages.push(result.usage);
        })
      );
      
      translationPromises.push(batchPromise);
    }
    
    await Promise.all(translationPromises);
    
    // Reconstruct with translations
    const translatedContent = await this.reconstruct(translations, parseResult.metadata);
    
    // Aggregate usage
    const totalUsage = usages.reduce(
      (acc, usage) => ({
        promptTokens: acc.promptTokens + usage.promptTokens,
        completionTokens: acc.completionTokens + usage.completionTokens,
        totalTokens: acc.totalTokens + usage.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );
    
    return {
      content: translatedContent,
      usage: totalUsage,
    };
  }
  
  /**
   * Common utility: Check if a string should be translated
   */
  protected isTranslatableString(value: string, key: string = ''): boolean {
    // Skip empty or whitespace-only
    if (!value || !value.trim()) return false;
    
    // Skip very short strings (likely IDs or codes)
    if (value.trim().length < 2) return false;
    
    // Skip technical patterns
    const skipPatterns = [
      /^[A-Z_]+$/,                    // CONSTANTS
      /^[a-f0-9-]{36}$/i,            // UUIDs
      /^https?:\/\//,                 // URLs
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Emails
      /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/, // Hex colors
      /^[a-z]+[A-Z][a-zA-Z]*$/,       // camelCase
      /^[A-Z][a-z]+[A-Z][a-z]+(?:[A-Z][a-z]+)*$/, // PascalCase (multi-segment only)
      /^\d+(\.\d+)?$/,                // Numbers
      /^v?\d+\.\d+\.\d+/,            // Version numbers
      /^[A-Z]{2,}[-_]\d+$/,          // IDs like API-123
    ];
    
    if (skipPatterns.some(pattern => pattern.test(value))) {
      return false;
    }
    
    // Skip technical keys
    const technicalKeys = [
      'id', 'uid', 'uuid', 'key', 'token', 'hash', 'password', 'secret',
      'api_key', 'apiKey', 'api_secret', 'apiSecret', 'client_id', 'clientId',
      'client_secret', 'clientSecret', 'access_token', 'accessToken',
      'refresh_token', 'refreshToken', 'csrf', 'nonce', 'salt',
      'created_at', 'createdAt', 'updated_at', 'updatedAt', 
      'deleted_at', 'deletedAt', 'timestamp', 'version', 'build',
      'checksum', 'signature', 'fingerprint', 'sku', 'slug',
      'host', 'hostname', 'server', 'port', 'url', 'uri', 'endpoint',
      'domain', 'subdomain', 'ip', 'address', 'path', 'route'
    ];
    
    if (technicalKeys.includes(key.toLowerCase())) {
      return false;
    }
    
    // Positive indicators - likely translatable
    if (value.includes(' ') && value.split(' ').length > 1) return true; // Multi-word
    if (/[.!?]$/.test(value)) return true; // Sentence endings
    
    // Title case words (First letter capital, rest lowercase)
    if (/^[A-Z][a-z]+$/.test(value) && value.length >= 3) {
      return true; // Like "Title", "Name", "File"
    }
    
    // All lowercase words that are likely translatable
    if (/^[a-z]+$/.test(value) && value.length >= 3) {
      return true; // Like "title", "name", "description"  
    }
    
    // Mixed case but starts with capital (and not camelCase)
    if (/^[A-Z][a-z]/.test(value) && !/[A-Z]/.test(value.substring(2))) {
      return true; // Like "Hello", "World"
    }
    
    // Default to not translatable for safety
    return false;
  }
  
  /**
   * Utility: Set value by path in nested object
   */
  protected setValueByPath(obj: any, segments: string[], value: any): void {
    let current = obj;
    
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      const isArrayIndex = /^\d+$/.test(segment);
      
      if (isArrayIndex) {
        const index = parseInt(segment);
        if (!Array.isArray(current)) {
          throw new Error(`Expected array at path segment: ${segment}`);
        }
        current = current[index];
      } else {
        if (!current[segment]) {
          // Determine if next segment is array index
          const nextSegment = segments[i + 1];
          const nextIsArray = /^\d+$/.test(nextSegment);
          current[segment] = nextIsArray ? [] : {};
        }
        current = current[segment];
      }
    }
    
    const lastSegment = segments[segments.length - 1];
    const isArrayIndex = /^\d+$/.test(lastSegment);
    
    if (isArrayIndex) {
      const index = parseInt(lastSegment);
      if (!Array.isArray(current)) {
        throw new Error(`Expected array at path segment: ${lastSegment}`);
      }
      current[index] = value;
    } else {
      current[lastSegment] = value;
    }
  }
}