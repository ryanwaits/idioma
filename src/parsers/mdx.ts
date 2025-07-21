import { remark } from 'remark';
import remarkDirective from 'remark-directive';
import remarkMdx from 'remark-mdx';
import { visit } from 'unist-util-visit';
import { translateBatch } from '../ai/translate';
import type { Config } from '../utils/config';
import { aggregateUsage } from '../utils/cost';
import type { StrategyTranslationResult, TranslationStrategy } from './types';

// Add parent references to all nodes in the tree
function addParentReferences(tree: any) {
  visit(tree, (node, _index, parent) => {
    if (node !== tree) {
      node.parent = parent;
    }
  });
}

// Check if a text node should be translated based on config rules
function shouldTranslateNode(node: any, parent: any, config: Config, nodeIndex?: number): boolean {
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

export class MDXStrategy implements TranslationStrategy {
  canHandle(filePath: string): boolean {
    return filePath.endsWith('.mdx') || filePath.endsWith('.md');
  }

  getName(): string {
    return 'MDX';
  }

  async translate(
    content: string,
    source: string,
    target: string,
    config: Config,
    aiClient: any,
    model?: string,
    provider?: string
  ): Promise<StrategyTranslationResult> {
    // Parse MDX content with directive support
    const tree = remark().use(remarkMdx).use(remarkDirective).parse(content);

    // Add parent references to enable directive checking
    addParentReferences(tree);

    // Get translatable attributes from config
    const translatableAttrs = config.translation?.jsxAttributes || [
      'title',
      'description',
      'tag',
      'alt',
      'placeholder',
      'label',
    ];

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
      if (shouldTranslateNode(node, parent, config, index)) {
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
      source,
      target,
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
    const totalUsage = aggregateUsage(translationResults.map((r) => r.usage));

    // Stringify back to MDX with directive support
    const translatedContent = remark().use(remarkMdx).use(remarkDirective).stringify(tree);

    return {
      content: translatedContent,
      usage: totalUsage,
    };
  }
}
