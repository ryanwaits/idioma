import { BaseTranslationStrategy, type ParseResult, type TranslatableNode, type ValidationResult } from './base';

export interface JsonConfig {
  includePaths?: string[];
  excludePaths?: string[];
  preserveArrayOrder?: boolean;
  skipEmptyStrings?: boolean;
}

export class JsonTranslationStrategy extends BaseTranslationStrategy {
  private config: JsonConfig;

  constructor(config?: JsonConfig) {
    super();
    this.config = config || {};
  }

  canHandle(filePath: string): boolean {
    return filePath.endsWith('.json');
  }

  async parse(content: string): Promise<ParseResult> {
    try {
      const data = JSON.parse(content);
      const translatableContent = new Map<string, TranslatableNode>();
      
      // Detect formatting style
      const hasNewlines = content.includes('\n');
      const indentMatch = content.match(/^\s+"/m);
      const indentSize = indentMatch ? indentMatch[0].length - 1 : 2;
      
      this.extractStrings(data, translatableContent);
      
      return {
        translatableContent,
        metadata: {
          structure: data,
          originalContent: content,
          hasNewlines,
          indentSize
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractStrings(
    obj: any,
    translatableContent: Map<string, TranslatableNode>,
    path: string[] = [],
    depth: number = 0
  ): void {
    // Prevent infinite recursion
    if (depth > 100) {
      throw new Error('JSON depth limit exceeded');
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      
      if (typeof value === 'string') {
        // Skip empty strings if configured
        if (this.config.skipEmptyStrings && !value.trim()) {
          continue;
        }

        // Check if path should be included/excluded
        const pathString = currentPath.join('.');
        if (this.shouldSkipPath(pathString)) {
          continue;
        }

        // Check if string is translatable
        if (this.isTranslatableString(value, key)) {
          translatableContent.set(pathString, {
            value,
            context: path[path.length - 1] || 'root',
            depth,
            siblings: Object.keys(obj),
            isArrayItem: false
          });
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'string') {
            if (!this.config.skipEmptyStrings || item.trim()) {
              const arrayPath = `${currentPath.join('.')}[${index}]`;
              if (!this.shouldSkipPath(arrayPath) && this.isTranslatableString(item, key)) {
                translatableContent.set(arrayPath, {
                  value: item,
                  context: key,
                  depth,
                  isArrayItem: true,
                  arrayIndex: index
                });
              }
            }
          } else if (typeof item === 'object' && item !== null) {
            this.extractStrings(
              item,
              translatableContent,
              [...currentPath, `[${index}]`],
              depth + 1
            );
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        this.extractStrings(value, translatableContent, currentPath, depth + 1);
      }
    }
  }

  private shouldSkipPath(path: string): boolean {
    // Check excludePaths
    if (this.config.excludePaths) {
      for (const excludePath of this.config.excludePaths) {
        if (path === excludePath || path.startsWith(excludePath + '.')) {
          return true;
        }
      }
    }

    // Check includePaths (if specified, only include matching paths)
    if (this.config.includePaths && this.config.includePaths.length > 0) {
      let included = false;
      for (const includePath of this.config.includePaths) {
        if (path === includePath || path.startsWith(includePath + '.')) {
          included = true;
          break;
        }
      }
      return !included;
    }

    return false;
  }

  async reconstruct(translations: Map<string, string>, metadata: any): Promise<string> {
    const result = JSON.parse(JSON.stringify(metadata.structure));
    
    for (const [path, translation] of translations) {
      this.setValueByPath(result, path, translation);
    }
    
    // Preserve original formatting style
    if (metadata.hasNewlines) {
      return JSON.stringify(result, null, metadata.indentSize || 2);
    }
    return JSON.stringify(result);
  }

  private setValueByPath(obj: any, path: string, value: string): void {
    const segments = path.split(/\.|\[|\]/).filter(s => s);
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

  validate(content: string): ValidationResult {
    try {
      JSON.parse(content);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          line: this.extractLineNumber(error),
          column: this.extractColumnNumber(error),
          message: error instanceof Error ? error.message : 'Invalid JSON'
        }]
      };
    }
  }

  private extractLineNumber(error: any): number | undefined {
    // Try to extract line number from error message
    const match = error.message?.match(/line (\d+)/i);
    return match ? parseInt(match[1]) : undefined;
  }

  private extractColumnNumber(error: any): number | undefined {
    // Try to extract column number from error message
    const match = error.message?.match(/column (\d+)|position (\d+)/i);
    return match ? parseInt(match[1] || match[2]) : undefined;
  }
}

export default JsonTranslationStrategy;