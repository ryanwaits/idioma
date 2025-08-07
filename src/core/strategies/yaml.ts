import * as yaml from 'js-yaml';
import { BaseTranslationStrategy, type ParseResult, type TranslatableNode, type ValidationResult } from './base';

export interface YamlConfig {
  preserveComments?: boolean;
  includePaths?: string[];
  excludePaths?: string[];
  skipEmptyStrings?: boolean;
}

interface YamlMetadata {
  hasAnchors: boolean;
  hasAliases: boolean;
  hasMergeKeys: boolean;
  multilineStyle: 'literal' | 'folded' | 'plain';
  commentPositions: Array<{ line: number; text: string }>;
  indentSize: number;
  isMultiDocument: boolean;
}

export class YamlTranslationStrategy extends BaseTranslationStrategy {
  private config: YamlConfig;

  constructor(config?: YamlConfig) {
    super();
    this.config = config || {};
  }

  canHandle(filePath: string): boolean {
    return filePath.endsWith('.yaml') || filePath.endsWith('.yml');
  }

  async parse(content: string): Promise<ParseResult> {
    try {
      // Handle multi-document YAML
      const documents = yaml.loadAll(content);
      const translatableContent = new Map<string, TranslatableNode>();
      
      // Extract YAML metadata
      const yamlMetadata: YamlMetadata = {
        hasAnchors: content.includes('&'),
        hasAliases: content.includes('*'),
        hasMergeKeys: content.includes('<<'),
        multilineStyle: this.detectMultilineStyle(content),
        commentPositions: this.extractCommentPositions(content),
        indentSize: this.detectIndentSize(content),
        isMultiDocument: documents.length > 1
      };
      
      // Process each document
      documents.forEach((doc, docIndex) => {
        if (doc && typeof doc === 'object') {
          const prefix = documents.length > 1 ? `doc${docIndex}.` : '';
          this.extractFromDocument(
            doc as Record<string, any>,
            translatableContent,
            prefix
          );
        }
      });
      
      return {
        translatableContent,
        metadata: {
          documents,
          yamlMetadata,
          originalContent: content
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private detectMultilineStyle(content: string): 'literal' | 'folded' | 'plain' {
    if (content.includes('|')) return 'literal';
    if (content.includes('>')) return 'folded';
    return 'plain';
  }

  private extractCommentPositions(content: string): Array<{ line: number; text: string }> {
    const comments: Array<{ line: number; text: string }> = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const commentMatch = line.match(/#(.*)$/);
      if (commentMatch) {
        comments.push({
          line: index + 1,
          text: commentMatch[1].trim()
        });
      }
    });
    
    return comments;
  }

  private detectIndentSize(content: string): number {
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\s+)\S/);
      if (match) {
        return match[1].length;
      }
    }
    return 2; // Default to 2 spaces
  }

  private extractFromDocument(
    obj: Record<string, any>,
    translatableContent: Map<string, TranslatableNode>,
    prefix: string = '',
    path: string[] = [],
    depth: number = 0
  ): void {
    // Prevent infinite recursion
    if (depth > 100) {
      throw new Error('YAML depth limit exceeded');
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      const fullPath = prefix + currentPath.join('.');
      
      if (typeof value === 'string') {
        // Skip empty strings if configured
        if (this.config.skipEmptyStrings && !value.trim()) {
          continue;
        }

        // Check if path should be included/excluded
        if (this.shouldSkipPath(fullPath)) {
          continue;
        }

        // Check if string is translatable (YAML-specific checks)
        if (this.isTranslatableYamlValue(value, key)) {
          translatableContent.set(fullPath, {
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
              const arrayPath = `${fullPath}[${index}]`;
              if (!this.shouldSkipPath(arrayPath) && this.isTranslatableYamlValue(item, key)) {
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
            this.extractFromDocument(
              item,
              translatableContent,
              prefix,
              [...currentPath, `[${index}]`],
              depth + 1
            );
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        this.extractFromDocument(value, translatableContent, prefix, currentPath, depth + 1);
      }
    }
  }

  private isTranslatableYamlValue(value: string, key: string): boolean {
    // Skip environment variables
    if (/^\$\{.*\}$/.test(value)) return false;
    if (/^\$[A-Z_]+$/.test(value)) return false;
    
    // Skip file paths
    if (/^[\.\/~]/.test(value)) return false;
    
    // Skip shell commands
    if (/^(npm|yarn|pnpm|bun|docker|kubectl|git|python|node|bash|sh)\s/.test(value)) return false;
    
    // Skip common CI/CD keywords
    if (/^(on|uses|with|run|name|if|needs|strategy|matrix)$/.test(key)) return false;
    
    // Apply standard translatable string rules
    return this.isTranslatableString(value, key);
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
    const { documents, yamlMetadata } = metadata;
    const results: string[] = [];
    
    // Process each document
    documents.forEach((doc: any, index: number) => {
      const docCopy = JSON.parse(JSON.stringify(doc));
      const prefix = documents.length > 1 ? `doc${index}.` : '';
      
      // Apply translations for this document
      for (const [path, translation] of translations) {
        if (documents.length > 1) {
          if (path.startsWith(prefix)) {
            const docPath = path.substring(prefix.length);
            this.setValueByPath(docCopy, docPath.split(/\.|\[|\]/).filter(s => s), translation);
          }
        } else {
          this.setValueByPath(docCopy, path.split(/\.|\[|\]/).filter(s => s), translation);
        }
      }
      
      // Dump with appropriate options
      const yamlStr = yaml.dump(docCopy, {
        lineWidth: -1, // Preserve line breaks
        noRefs: !yamlMetadata.hasAnchors,
        indent: yamlMetadata.indentSize,
        quotingType: '"',
        forceQuotes: false,
        skipInvalid: false,
        flowLevel: -1,
        sortKeys: false
      });
      
      results.push(yamlStr);
    });
    
    // Join documents with separator if multi-document
    if (yamlMetadata.isMultiDocument) {
      return '---\n' + results.join('---\n');
    }
    
    // Add comments back if preserveComments is enabled
    let result = results[0];
    if (this.config.preserveComments && yamlMetadata.commentPositions.length > 0) {
      result = this.restoreComments(result, yamlMetadata.commentPositions, metadata.originalContent);
    }
    
    return result;
  }

  private restoreComments(
    translatedYaml: string,
    commentPositions: Array<{ line: number; text: string }>,
    originalContent: string
  ): string {
    // This is a simplified implementation
    // In production, you'd want more sophisticated comment restoration
    const translatedLines = translatedYaml.split('\n');
    const originalLines = originalContent.split('\n');
    
    // Try to match structure and restore comments
    commentPositions.forEach(comment => {
      const originalLine = originalLines[comment.line - 1];
      if (originalLine) {
        const keyMatch = originalLine.match(/^(\s*)(\S+):/);
        if (keyMatch) {
          const key = keyMatch[2];
          // Find corresponding line in translated YAML
          for (let i = 0; i < translatedLines.length; i++) {
            if (translatedLines[i].includes(`${key}:`)) {
              translatedLines[i] += ` # ${comment.text}`;
              break;
            }
          }
        }
      }
    });
    
    return translatedLines.join('\n');
  }

  validate(content: string): ValidationResult {
    try {
      yaml.loadAll(content);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          line: this.extractYamlLineNumber(error),
          column: this.extractYamlColumnNumber(error),
          message: error instanceof Error ? error.message : 'Invalid YAML'
        }]
      };
    }
  }

  private extractYamlLineNumber(error: any): number | undefined {
    // js-yaml includes mark property with line info
    if (error.mark && typeof error.mark.line === 'number') {
      return error.mark.line + 1; // js-yaml uses 0-based line numbers
    }
    return undefined;
  }

  private extractYamlColumnNumber(error: any): number | undefined {
    // js-yaml includes mark property with column info
    if (error.mark && typeof error.mark.column === 'number') {
      return error.mark.column + 1;
    }
    return undefined;
  }
}

export default YamlTranslationStrategy;