export interface TranslationStrategy {
  canHandle(filePath: string): boolean;
  parse(content: string, config?: any): Promise<ParseResult>;
  reconstruct(translations: Map<string, string>, metadata: any): Promise<string>;
  validate(content: string): ValidationResult;
}

export interface ParseResult {
  translatableContent: Map<string, TranslatableNode>;
  metadata: any;
}

export interface TranslatableNode {
  type: string;
  content: string;
  context?: string;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  line?: number;
  column?: number;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  line?: number;
  column?: number;
  message: string;
  severity: 'warning';
}

export abstract class BaseTranslationStrategy implements TranslationStrategy {
  protected format: string;

  constructor(format: string) {
    this.format = format;
  }

  abstract canHandle(filePath: string): boolean;
  abstract parse(content: string, config?: any): Promise<ParseResult>;
  abstract reconstruct(translations: Map<string, string>, metadata: any): Promise<string>;

  validate(content: string): ValidationResult {
    try {
      this.validateFormat(content);
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        errors: [{
          message: error.message,
          severity: 'error'
        }]
      };
    }
  }

  protected abstract validateFormat(content: string): void;

  protected isTranslatableString(value: string, key?: string): boolean {
    // Skip technical values
    if (/^[A-Z_]+$/.test(value)) return false; // Constants like API_KEY
    if (/^\d+$/.test(value)) return false; // Pure numbers
    if (/^[a-f0-9-]{36}$/i.test(value)) return false; // UUIDs
    if (/^https?:\/\//.test(value)) return false; // URLs
    if (/^\w+@\w+\.\w+$/.test(value)) return false; // Emails
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) return false; // Hex colors
    if (/^[a-z]+[A-Z][a-zA-Z]*$/.test(value)) return false; // camelCase identifiers
    if (/^\/.*\/[gimuy]*$/.test(value)) return false; // Regex patterns
    
    // Skip common technical keys
    if (key) {
      const techKeys = ['id', 'uuid', 'key', 'token', 'hash', 'version', 'timestamp', 
                        'created_at', 'updated_at', 'deleted_at', 'slug', 'sku', 'api_key'];
      if (techKeys.includes(key.toLowerCase())) return false;
    }
    
    // Must have meaningful content
    if (value.length < 2) return false;
    
    // Positive indicators
    if (value.includes(' ') && value.split(' ').length > 1) return true; // Multi-word
    if (/[.!?]$/.test(value)) return true; // Sentence endings
    if (/^[A-Z][a-z]/.test(value)) return true; // Sentence case
    
    return false;
  }

  protected setValueByPath(obj: any, path: string[], value: string): void {
    let current = obj;
    
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      
      // Handle array notation
      const arrayMatch = segment.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        const idx = parseInt(index);
        
        if (!current[key]) current[key] = [];
        if (!current[key][idx]) current[key][idx] = {};
        current = current[key][idx];
      } else if (segment.startsWith('[') && segment.endsWith(']')) {
        const index = parseInt(segment.slice(1, -1));
        if (!Array.isArray(current)) current = [];
        if (!current[index]) current[index] = {};
        current = current[index];
      } else {
        if (!current[segment]) current[segment] = {};
        current = current[segment];
      }
    }
    
    const lastSegment = path[path.length - 1];
    const arrayMatch = lastSegment.match(/^(.+)\[(\d+)\]$/);
    
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      if (!current[key]) current[key] = [];
      current[key][parseInt(index)] = value;
    } else if (lastSegment.startsWith('[') && lastSegment.endsWith(']')) {
      const index = parseInt(lastSegment.slice(1, -1));
      current[index] = value;
    } else {
      current[lastSegment] = value;
    }
  }
}

export class FormatParseError extends Error {
  constructor(
    public format: string,
    public file: string,
    public line?: number,
    public column?: number,
    public originalError?: Error
  ) {
    super(`Failed to parse ${format} file: ${file}`);
    this.name = 'FormatParseError';
  }
}