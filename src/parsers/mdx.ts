import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import { Config } from '../utils/config';
import { translateText, translateBatch } from '../ai/translate';
import { TranslationStrategy } from './types';

// Add parent references to all nodes in the tree
function addParentReferences(tree: any) {
  visit(tree, (node, index, parent) => {
    if (node !== tree) {
      node.parent = parent;
    }
  });
}

// Check if a text node should be translated based on config rules
function shouldTranslateNode(node: any, parent: any, config: Config): boolean {
  if (node.type !== 'text' || !node.value.trim()) return false;
  
  // Get skip patterns from config
  const patterns = config.translation?.rules?.patternsToSkip?.map(p => new RegExp(p)) || 
                   config.translation?.skipPatterns?.map(p => new RegExp(p)) || 
                   [/^type:\s*\w+$/]; // Default pattern
  
  // Check if text matches any skip pattern
  const trimmedValue = node.value.trim();
  if (patterns.some(p => p.test(trimmedValue))) {
    // Additional check: only skip if inside a directive
    let currentParent = parent;
    while (currentParent) {
      if (currentParent.type === 'containerDirective' || 
          currentParent.type === 'leafDirective' || 
          currentParent.type === 'textDirective') {
        return false; // Skip this node
      }
      currentParent = currentParent.parent;
    }
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
    aiClient: any
  ): Promise<string> {
    // Parse MDX content with directive support
    const tree = remark()
      .use(remarkMdx)
      .use(remarkDirective)
      .parse(content);
    
    // Add parent references to enable directive checking
    addParentReferences(tree);
    
    // Get translatable attributes from config
    const translatableAttrs = config.translation?.jsxAttributes || 
      ['title', 'description', 'tag', 'alt', 'placeholder', 'label'];
    
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
      if (shouldTranslateNode(node, parent, config)) {
        textsToTranslate.push({ 
          node, 
          type: 'text', 
          parent,
          originalText: node.value 
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
                originalText: attr.value
              });
            }
          }
        });
      }
    });
    
    // Visit image nodes to translate alt text
    visit(tree, 'image', (node: any) => {
      if (node.alt && node.alt.trim()) {
        textsToTranslate.push({
          node,
          type: 'imageAlt',
          attributeName: 'alt',
          originalText: node.alt
        });
      }
    });
    
    // Batch translate all texts for performance
    const textsToTranslateArray = textsToTranslate.map(item => item.originalText);
    const translations = await translateBatch(
      textsToTranslateArray,
      source,
      target,
      aiClient
    );
    
    // Apply translations
    textsToTranslate.forEach((item, index) => {
      if (item.type === 'text') {
        item.node.value = translations[index];
      } else if (item.type === 'imageAlt') {
        item.node.alt = translations[index];
      } else if (item.type === 'attribute') {
        item.node.value = translations[index];
      }
    });
    
    // Stringify back to MDX with directive support
    return remark()
      .use(remarkMdx)
      .use(remarkDirective)
      .stringify(tree);
  }
}