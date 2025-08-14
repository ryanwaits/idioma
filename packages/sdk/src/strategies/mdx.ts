import { remark } from 'remark';
import remarkDirective from 'remark-directive';
import remarkMdx from 'remark-mdx';
import { visit } from 'unist-util-visit';
import { translateFrontmatter } from '../parsers/frontmatter';
import { BaseTranslationStrategy, type ParseResult, type TranslatableNode, type ValidationResult, type TranslationResult } from './base';
import type { Config } from '../utils/config';
import { getEffectiveFileConfig } from '../utils/config-normalizer';
import { translateBatch } from '../ai/translate';
import { aggregateUsage } from '../utils/cost';

// Add parent references to all nodes in the tree
function addParentReferences(tree: any) {
  visit(tree, (node, _index, parent) => {
    if (node !== tree) {
      node.parent = parent;
    }
  });
}

export class MdxStrategy extends BaseTranslationStrategy {
  
  canHandle(filePath: string): boolean {
    return filePath.endsWith('.mdx') || filePath.endsWith('.md');
  }
  
  getName(): string {
    return 'MDX';
  }
  
  /**
   * Override the main translate method for MDX since it needs special handling
   * MDX uses batch translation and AST manipulation instead of key-value pairs
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
    // Note: Frontmatter is already handled by translate-file.ts
    // This strategy only receives the main content without frontmatter
    let frontmatterUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    
    // Parse MDX content with directive support
    const tree = remark().use(remarkMdx).use(remarkDirective).parse(content);
    
    // Add parent references to enable directive checking
    addParentReferences(tree);
    
    // Get effective config with smart defaults
    const effectiveConfig = getEffectiveFileConfig(config, 'mdx');
    const translatableAttrs = effectiveConfig.translatableAttributes || [];
    
    // Collect all translatable text
    const textsToTranslate: {
      node: any;
      type: 'text' | 'attribute' | 'imageAlt';
      attributeName?: string;
      parent?: any;
      originalText: string;
    }[] = [];
    
    // Visit text nodes
    visit(tree, 'text', (node, index, parent) => {
      if (this.shouldTranslateNode(node, parent, config, index)) {
        textsToTranslate.push({
          node,
          type: 'text',
          parent,
          originalText: node.value,
        });
      }
    });
    
    // Visit JSX elements to find string attributes
    visit(tree, ['mdxJsxFlowElement', 'mdxJsxTextElement'], (node: any) => {
      if (node.attributes) {
        node.attributes.forEach((attr: any) => {
          if (attr.type === 'mdxJsxAttribute' && attr.value && typeof attr.value === 'string') {
            // Only translate configured attributes
            if (translatableAttrs.includes(attr.name)) {
              textsToTranslate.push({
                node: attr,
                type: 'attribute',
                attributeName: attr.name,
                originalText: attr.value,
              });
            }
          }
        });
      }
    });
    
    // Visit image nodes to translate alt text
    visit(tree, 'image', (node: any) => {
      if (node.alt?.trim()) {
        textsToTranslate.push({
          node,
          type: 'imageAlt',
          attributeName: 'alt',
          originalText: node.alt,
        });
      }
    });
    
    // Batch translate all texts for performance
    const textsToTranslateArray = textsToTranslate.map((item) => item.originalText);
    const translationResults = await translateBatch(
      textsToTranslateArray,
      sourceLocale,
      targetLocale,
      aiClient,
      model,
      provider
    );
    
    // Apply translations
    textsToTranslate.forEach((item, index) => {
      const translatedText = translationResults[index]?.text;
      if (item.type === 'text') {
        item.node.value = translatedText;
      } else if (item.type === 'imageAlt') {
        item.node.alt = translatedText;
      } else if (item.type === 'attribute') {
        item.node.value = translatedText;
      }
    });
    
    // Aggregate usage from all translations
    const totalUsage = aggregateUsage([
      ...translationResults.map((r) => r.usage),
      frontmatterUsage
    ]);
    
    // Stringify back to MDX with directive support
    const translatedContent = remark().use(remarkMdx).use(remarkDirective).stringify(tree);
    
    return {
      content: translatedContent,
      usage: totalUsage,
    };
  }
  
  // Check if a text node should be translated based on config rules
  private shouldTranslateNode(node: any, parent: any, config: Config, nodeIndex?: number): boolean {
    if (node.type !== 'text' || !node.value.trim()) return false;
    
    const trimmedValue = node.value.trim();
    
    // Check if this is a directive pseudo-attribute (first line of directive content)
    // This handles patterns like "type: help" that appear as the first content in directives
    if (parent && parent.type === 'paragraph' && nodeIndex === 0) {
      // Check if the paragraph's parent is a directive
      const paragraphParent = parent.parent;
      if (
        paragraphParent &&
        (paragraphParent.type === 'containerDirective' ||
          paragraphParent.type === 'leafDirective' ||
          paragraphParent.type === 'textDirective')
      ) {
        // Check if this paragraph is the first child of the directive
        const firstChild = paragraphParent.children[0];
        if (firstChild === parent) {
          // Check if the text matches a key-value pattern (e.g., "type: help", "variant: warning")
          if (/^[\w-]+:\s*[\w-]+(\n|$)/.test(trimmedValue)) {
            return false; // Skip directive pseudo-attributes
          }
        }
      }
    }
    
    // Get skip patterns from config for other cases
    const patterns =
      config.translation?.rules?.patternsToSkip?.map((p) => new RegExp(p)) ||
      config.translation?.skipPatterns?.map((p) => new RegExp(p)) ||
      [];
    
    // Check if text matches any skip pattern
    if (patterns.some((p) => p.test(trimmedValue))) {
      return false;
    }
    
    return true;
  }
  
  // MDX doesn't use the parse/reconstruct pattern, so these are not implemented
  protected async parse(content: string): Promise<ParseResult> {
    throw new Error('MDX strategy uses custom translate method');
  }
  
  protected async reconstruct(translations: Map<string, string>, metadata: any): Promise<string> {
    throw new Error('MDX strategy uses custom translate method');
  }
  
  validate(content: string): ValidationResult {
    try {
      remark().use(remarkMdx).use(remarkDirective).parse(content);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          message: error instanceof Error ? error.message : 'Invalid MDX'
        }]
      };
    }
  }
}