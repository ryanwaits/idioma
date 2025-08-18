import generate from '@babel/generator';
// @ts-ignore - ESM compatibility fix for @babel/generator
const generateCode = generate.default || generate;
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
// @ts-ignore - ESM compatibility fix for @babel/traverse
const traverseAST = traverse.default || traverse;
import * as t from '@babel/types';
import { translateBatch } from '../ai/translate';
import type { Config } from '../utils/config';
import { aggregateUsage } from '../utils/cost';
import { getPreservedTerms, parsePreserveRules } from '../utils/preserve';
import {
  BaseTranslationStrategy,
  type ParseResult,
  type TranslatableNode,
  type TranslationResult,
  type ValidationResult,
} from './base';

export interface JavaScriptConfig {
  // Function names that indicate translatable strings
  translatablePatterns?: string[];
  // JSX attributes to translate
  jsxAttributes?: string[];
  // What to extract: 'objects' | 'functions' | 'both'
  extractMode?: 'objects' | 'functions' | 'both';
  // Whether to preserve comments
  preserveComments?: boolean;
  // Regex patterns to skip
  skipPatterns?: RegExp[];
  // Include/exclude paths
  includePaths?: string[];
  excludePaths?: string[];
}

interface TranslationContext {
  path: string;
  value: string;
  type: 'object' | 'function' | 'jsx-attribute' | 'jsx-text';
  functionName?: string;
  attributeName?: string;
  node: any;
  metadata: any;
}

export class JavaScriptStrategy extends BaseTranslationStrategy {
  private config: JavaScriptConfig;
  private defaultTranslatablePatterns = ['t', 'i18n.t', 'translate', '__', '_t'];
  private defaultJsxAttributes = [
    'title',
    'alt',
    'placeholder',
    'label',
    'aria-label',
    'description',
  ];

  constructor(config?: JavaScriptConfig) {
    super();
    this.config = {
      translatablePatterns: this.defaultTranslatablePatterns,
      jsxAttributes: this.defaultJsxAttributes,
      extractMode: 'both',
      preserveComments: true,
      skipPatterns: [],
      ...config,
    };
  }

  canHandle(filePath: string): boolean {
    return /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(filePath);
  }

  getName(): string {
    return 'JavaScript';
  }

  async parse(content: string): Promise<ParseResult> {
    const translatableContent = new Map<string, TranslatableNode>();
    const contexts: TranslationContext[] = [];

    try {
      // Parse with TypeScript and JSX support
      const ast = parse(content, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'functionBind',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'dynamicImport',
          'nullishCoalescingOperator',
          'optionalChaining',
        ],
      });

      // Traverse AST to find translatable content
      traverseAST(ast, {
        // Handle object expressions (translation objects)
        ObjectExpression: (path) => {
          if (this.config.extractMode === 'functions') return;
          this.extractFromObject(path, contexts);
        },

        // Handle function calls (t(), i18n.t(), etc.)
        CallExpression: (path) => {
          if (this.config.extractMode === 'objects') return;
          this.extractFromFunctionCall(path, contexts);
        },

        // Handle JSX elements
        JSXElement: (path) => {
          this.extractFromJSXElement(path, contexts);
        },

        // Handle JSX attributes
        JSXAttribute: (path) => {
          this.extractFromJSXAttribute(path, contexts);
        },
      });

      // Convert contexts to translatable content
      for (const context of contexts) {
        if (this.isTranslatableString(context.value) && !this.shouldSkipPath(context.path)) {
          translatableContent.set(context.path, {
            value: context.value,
            context: context.type,
            functionName: context.functionName,
            attributeName: context.attributeName,
            node: context.node,
            metadata: context.metadata,
          });
        }
      }

      return {
        translatableContent,
        metadata: {
          ast,
          originalContent: content,
          contexts,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to parse JavaScript: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private extractFromObject(path: any, contexts: TranslationContext[]): void {
    // Check if this object looks like a translation object
    if (!this.isTranslationObject(path.node)) return;

    // Extract strings from object properties
    this.extractObjectProperties(path.node, contexts, []);
  }

  private extractObjectProperties(
    obj: any,
    contexts: TranslationContext[],
    pathSegments: string[]
  ): void {
    if (!t.isObjectExpression(obj)) return;

    for (let i = 0; i < obj.properties.length; i++) {
      const prop = obj.properties[i];

      if (t.isObjectProperty(prop) || t.isObjectMethod(prop)) {
        let key: string;

        // Get property key
        if (t.isIdentifier(prop.key)) {
          key = prop.key.name;
        } else if (t.isStringLiteral(prop.key)) {
          key = prop.key.value;
        } else {
          continue; // Skip computed properties
        }

        const currentPath = [...pathSegments, key];

        if (t.isObjectProperty(prop) && t.isStringLiteral(prop.value)) {
          // String value - potential translation
          contexts.push({
            path: currentPath.join('.'),
            value: prop.value.value,
            type: 'object',
            node: prop.value,
            metadata: { property: prop, pathSegments: currentPath },
          });
        } else if (t.isObjectProperty(prop) && t.isObjectExpression(prop.value)) {
          // Nested object - recurse
          this.extractObjectProperties(prop.value, contexts, currentPath);
        }
      }
    }
  }

  private extractFromFunctionCall(path: any, contexts: TranslationContext[]): void {
    const node = path.node;
    const functionName = this.getFunctionName(node.callee);

    if (!functionName || !this.config.translatablePatterns?.includes(functionName)) {
      return;
    }

    // Extract first argument if it's a string literal
    if (node.arguments.length > 0 && t.isStringLiteral(node.arguments[0])) {
      const keyPath = `function.${functionName}.${contexts.length}`;
      contexts.push({
        path: keyPath,
        value: node.arguments[0].value,
        type: 'function',
        functionName,
        node: node.arguments[0],
        metadata: { callExpression: node, functionName },
      });
    }
  }

  private extractFromJSXElement(path: any, contexts: TranslationContext[]): void {
    const node = path.node;

    // Extract text content from JSX elements
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (t.isJSXText(child) && child.value.trim()) {
          const keyPath = `jsx.text.${contexts.length}`;
          contexts.push({
            path: keyPath,
            value: child.value.trim(),
            type: 'jsx-text',
            node: child,
            metadata: { parent: node, childIndex: i },
          });
        }
      }
    }
  }

  private extractFromJSXAttribute(path: any, contexts: TranslationContext[]): void {
    const node = path.node;

    if (t.isJSXIdentifier(node.name) && t.isStringLiteral(node.value)) {
      const attrName = node.name.name;

      if (this.config.jsxAttributes?.includes(attrName)) {
        const keyPath = `jsx.attribute.${attrName}.${contexts.length}`;
        contexts.push({
          path: keyPath,
          value: node.value.value,
          type: 'jsx-attribute',
          attributeName: attrName,
          node: node.value,
          metadata: { attribute: node, attributeName: attrName },
        });
      }
    }
  }

  private isTranslationObject(node: any): boolean {
    if (!t.isObjectExpression(node)) return false;

    // Check if most properties are string literals (indicating a translation object)
    let stringProps = 0;
    let totalProps = 0;

    for (const prop of node.properties) {
      if (t.isObjectProperty(prop)) {
        totalProps++;
        if (t.isStringLiteral(prop.value) || t.isObjectExpression(prop.value)) {
          stringProps++;
        }
      }
    }

    return totalProps > 0 && stringProps / totalProps >= 0.7; // 70% string/object properties
  }

  private getFunctionName(callee: any): string | null {
    if (t.isIdentifier(callee)) {
      return callee.name;
    } else if (t.isMemberExpression(callee)) {
      const objectName = t.isIdentifier(callee.object) ? callee.object.name : null;
      const propertyName = t.isIdentifier(callee.property) ? callee.property.name : null;
      if (objectName && propertyName) {
        return `${objectName}.${propertyName}`;
      }
    }
    return null;
  }

  private shouldSkipPath(path: string): boolean {
    if (this.config.excludePaths?.some((exclude) => path.includes(exclude))) {
      return true;
    }

    if (
      this.config.includePaths?.length &&
      !this.config.includePaths.some((include) => path.includes(include))
    ) {
      return true;
    }

    return this.config.skipPatterns?.some((pattern) => pattern.test(path)) || false;
  }

  protected async reconstruct(translations: Map<string, string>, metadata: any): Promise<string> {
    const { ast, contexts } = metadata;

    // Apply translations to the AST
    for (const [path, translation] of translations) {
      const context = contexts.find((c: TranslationContext) => c.path === path);
      if (context?.node) {
        if (t.isStringLiteral(context.node)) {
          context.node.value = translation;
        } else if (t.isJSXText(context.node)) {
          context.node.value = translation;
        }
      }
    }

    // Generate code from modified AST
    const result = generateCode(ast, {
      retainLines: this.config.preserveComments,
      comments: this.config.preserveComments,
      // Preserve Unicode characters instead of escaping them
      compact: false,
      minified: false,
      jsescOption: {
        minimal: true, // Use minimal escaping - preserve Unicode
      },
    });

    return result.code;
  }

  /**
   * Override the main translate method to handle preserve rules
   */
  async translate(
    content: string,
    sourceLocale: string,
    targetLocale: string,
    config: Config,
    aiClient?: any,
    model?: string,
    provider?: string
  ): Promise<TranslationResult> {
    // Parse preserve rules
    const preserveRules = parsePreserveRules(config.preserve || []);
    const preservedTerms = getPreservedTerms(preserveRules);

    // Parse the content
    const parseResult = await this.parse(content);

    // Skip if no translatable content
    if (parseResult.translatableContent.size === 0) {
      return {
        content,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    // Collect all texts for batch translation
    const textsToTranslate = Array.from(parseResult.translatableContent.values()).map(
      (node) => node.value
    );

    // Batch translate all texts for performance
    const translationResults = await translateBatch(
      textsToTranslate,
      sourceLocale,
      targetLocale,
      aiClient,
      model,
      provider,
      preservedTerms
    );

    // Create translations map
    const translations = new Map<string, string>();
    const entries = Array.from(parseResult.translatableContent.entries());

    entries.forEach(([path, node], index) => {
      const translatedText = translationResults[index]?.text || node.value;
      translations.set(path, translatedText);
    });

    // Reconstruct with translations
    const translatedContent = await this.reconstruct(translations, parseResult.metadata);

    // Aggregate usage from all translations
    const totalUsage = aggregateUsage(translationResults.map((r) => r.usage));

    return {
      content: translatedContent,
      usage: totalUsage,
    };
  }

  validate(content: string): ValidationResult {
    try {
      parse(content, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'functionBind',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'dynamicImport',
          'nullishCoalescingOperator',
          'optionalChaining',
        ],
      });

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        errors: [
          {
            line: error.loc?.line,
            column: error.loc?.column,
            message: error.message,
          },
        ],
      };
    }
  }
}
