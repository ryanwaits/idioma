import { BaseTranslationStrategy, type ParseResult, type TranslatableNode, type ValidationResult } from './base';
import * as parse5 from 'parse5';

export interface HtmlConfig {
  translatableAttributes?: string[];
  skipTags?: string[];
  preserveWhitespace?: boolean;
  includePaths?: string[];
  excludePaths?: string[];
}

export class HtmlStrategy extends BaseTranslationStrategy {
  private config: HtmlConfig;
  private translatableAttributes: string[];
  private skipTags: string[];
  private nodeIdCounter: number = 0;

  constructor(config?: HtmlConfig) {
    super();
    this.config = config || {};
    
    // Default translatable attributes
    this.translatableAttributes = config?.translatableAttributes || [
      'alt', 'title', 'placeholder', 'aria-label', 'aria-description',
      'data-tooltip', 'data-title', 'data-description'
    ];
    
    // Tags to skip entirely
    this.skipTags = config?.skipTags || [
      'script', 'style', 'code', 'pre', 'svg', 'math'
    ];
  }

  canHandle(filePath: string): boolean {
    return filePath.endsWith('.html') || filePath.endsWith('.htm');
  }
  
  getName(): string {
    return 'HTML';
  }

  async parse(content: string): Promise<ParseResult> {
    this.nodeIdCounter = 0;
    const document = parse5.parse(content, {
      sourceCodeLocationInfo: true
    });
    
    const translatableContent = new Map<string, TranslatableNode>();
    
    // Extract HTML metadata
    const htmlMetadata = {
      hasDoctype: content.toLowerCase().startsWith('<!doctype'),
      encoding: this.extractEncoding(document),
      hasInlineScripts: content.includes('<script') && !content.includes('src='),
      hasInlineStyles: content.includes('<style'),
      originalContent: content
    };
    
    // Walk the DOM tree
    this.walkDOM(document, translatableContent, []);
    
    return {
      translatableContent,
      metadata: {
        document,
        htmlMetadata
      }
    };
  }

  private extractEncoding(document: any): string {
    const findNode = (node: any, callback: (node: any) => boolean): any => {
      if (callback(node)) return node;
      if (node.childNodes) {
        for (const child of node.childNodes) {
          const result = findNode(child, callback);
          if (result) return result;
        }
      }
      return null;
    };

    const metaCharset = findNode(document, (node) => 
      node.nodeName === 'meta' && 
      node.attrs?.some((attr: any) => attr.name === 'charset')
    );
    
    if (metaCharset) {
      const charsetAttr = metaCharset.attrs.find((attr: any) => attr.name === 'charset');
      return charsetAttr?.value || 'utf-8';
    }
    
    return 'utf-8';
  }

  private walkDOM(
    node: any, 
    translatableContent: Map<string, TranslatableNode>,
    path: string[]
  ): void {
    // Skip certain tags entirely
    if (node.nodeName && this.skipTags.includes(node.nodeName)) {
      return;
    }
    
    // Process text nodes
    if (node.nodeName === '#text') {
      const text = node.value?.trim();
      if (text && this.isTranslatableHtmlText(text, path)) {
        const id = this.generateNodePath(path, 'text', this.nodeIdCounter++);
        translatableContent.set(id, {
          value: text,
          type: 'text',
          parentTag: path[path.length - 1] || 'root',
          preserveWhitespace: this.shouldPreserveWhitespace(path),
          depth: path.length
        });
      }
    }
    
    // Process element nodes
    if (node.nodeName && !node.nodeName.startsWith('#')) {
      const currentPath = [...path, node.nodeName];
      
      // Process attributes
      if (node.attrs) {
        for (const attr of node.attrs) {
          if (this.translatableAttributes.includes(attr.name) && attr.value) {
            const id = this.generateNodePath(currentPath, `@${attr.name}`, this.nodeIdCounter++);
            translatableContent.set(id, {
              value: attr.value,
              type: 'attribute',
              attributeName: attr.name,
              tagName: node.nodeName,
              depth: currentPath.length
            });
          }
        }
        
        // Special handling for meta tags
        if (node.nodeName === 'meta') {
          const nameAttr = node.attrs.find((a: any) => a.name === 'name');
          const contentAttr = node.attrs.find((a: any) => a.name === 'content');
          
          if (nameAttr && contentAttr) {
            const metaName = nameAttr.value;
            if (['description', 'keywords', 'author', 'og:title', 'og:description', 
                 'twitter:title', 'twitter:description'].includes(metaName)) {
              const id = `meta.${metaName}`;
              translatableContent.set(id, {
                value: contentAttr.value,
                type: 'meta',
                metaName: metaName,
                depth: currentPath.length
              });
            }
          }
        }
      }
      
      // Recurse into children
      if (node.childNodes) {
        for (const child of node.childNodes) {
          this.walkDOM(child, translatableContent, currentPath);
        }
      }
    } else if (node.childNodes) {
      // Document nodes and fragments
      for (const child of node.childNodes) {
        this.walkDOM(child, translatableContent, path);
      }
    }
  }

  private generateNodePath(path: string[], suffix: string, counter: number): string {
    const basePath = path.filter(p => p).join('.');
    return basePath ? `${basePath}.${suffix}_${counter}` : `${suffix}_${counter}`;
  }

  private isTranslatableHtmlText(text: string, path: string[]): boolean {
    // Skip very short text
    if (text.length < 2) return false;
    
    // Skip code-like content
    if (/^[\{\}\[\]()<>]/.test(text)) return false;
    if (/^\$|^@|^#/.test(text) && text.length < 10) return false;
    
    // Skip if in a heading and it's just a number or version
    const parentTag = path[path.length - 1];
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(parentTag)) {
      if (/^v?\d+(\.\d+)*$/.test(text)) return false;
    }
    
    // Must have at least one letter
    if (!/[a-zA-Z]/.test(text)) return false;
    
    // Use base class method for additional checks
    return this.isTranslatableString(text, parentTag || '');
  }

  private shouldPreserveWhitespace(path: string[]): boolean {
    // Check if any parent is a whitespace-sensitive tag
    const whitespaceTags = ['pre', 'textarea', 'code'];
    return path.some(tag => whitespaceTags.includes(tag));
  }

  async reconstruct(translations: Map<string, string>, metadata: any): Promise<string> {
    const { document, htmlMetadata } = metadata;
    const documentCopy = this.cloneDocument(document);
    
    // Apply translations
    this.applyTranslations(documentCopy, translations, []);
    
    // Serialize back to HTML
    return parse5.serialize(documentCopy);
  }

  private cloneDocument(node: any): any {
    const clone: any = {
      nodeName: node.nodeName
    };
    
    // Copy essential parse5 properties
    if (node.mode !== undefined) {
      clone.mode = node.mode;
    }
    
    if (node.tagName !== undefined) {
      clone.tagName = node.tagName;
    }
    
    if (node.namespaceURI !== undefined) {
      clone.namespaceURI = node.namespaceURI;
    }
    
    // DOCTYPE specific properties
    if (node.name !== undefined) {
      clone.name = node.name;
    }
    
    if (node.publicId !== undefined) {
      clone.publicId = node.publicId;
    }
    
    if (node.systemId !== undefined) {
      clone.systemId = node.systemId;
    }
    
    if (node.value !== undefined) {
      clone.value = node.value;
    }
    
    if (node.attrs) {
      clone.attrs = node.attrs.map((attr: any) => ({ ...attr }));
    }
    
    if (node.childNodes) {
      clone.childNodes = [];
      for (const child of node.childNodes) {
        const clonedChild = this.cloneDocument(child);
        clonedChild.parentNode = clone; // Set parent reference
        clone.childNodes.push(clonedChild);
      }
    }
    
    if (node.sourceCodeLocation) {
      clone.sourceCodeLocation = node.sourceCodeLocation;
    }
    
    return clone;
  }

  private applyTranslations(
    node: any, 
    translations: Map<string, string>,
    path: string[],
    counter: { value: number } = { value: 0 }
  ): void {
    // Process text nodes
    if (node.nodeName === '#text') {
      const text = node.value?.trim();
      if (text) {
        const id = this.generateNodePath(path, 'text', counter.value++);
        if (translations.has(id)) {
          // Preserve surrounding whitespace
          const leadingSpace = node.value.match(/^\s*/)?.[0] || '';
          const trailingSpace = node.value.match(/\s*$/)?.[0] || '';
          node.value = leadingSpace + translations.get(id) + trailingSpace;
        }
      }
    }
    
    // Process element nodes
    if (node.nodeName && !node.nodeName.startsWith('#')) {
      const currentPath = [...path, node.nodeName];
      
      // Process attributes
      if (node.attrs) {
        for (const attr of node.attrs) {
          if (this.translatableAttributes.includes(attr.name)) {
            const id = this.generateNodePath(currentPath, `@${attr.name}`, counter.value++);
            if (translations.has(id)) {
              attr.value = translations.get(id)!;
            }
          }
        }
        
        // Special handling for meta tags
        if (node.nodeName === 'meta') {
          const nameAttr = node.attrs.find((a: any) => a.name === 'name');
          const contentAttr = node.attrs.find((a: any) => a.name === 'content');
          
          if (nameAttr && contentAttr) {
            const metaName = nameAttr.value;
            const id = `meta.${metaName}`;
            if (translations.has(id)) {
              contentAttr.value = translations.get(id)!;
            }
          }
        }
      }
      
      // Recurse into children
      if (node.childNodes) {
        for (const child of node.childNodes) {
          this.applyTranslations(child, translations, currentPath, counter);
        }
      }
    } else if (node.childNodes) {
      // Document nodes and fragments
      for (const child of node.childNodes) {
        this.applyTranslations(child, translations, path, counter);
      }
    }
  }

  validate(content: string): ValidationResult {
    try {
      parse5.parse(content);
      
      // Check for basic HTML structure
      const hasHtmlTag = /<html/i.test(content);
      const hasBodyTag = /<body/i.test(content);
      const hasClosingTags = /<\/\w+>/i.test(content);
      
      // Basic validation passed
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          message: `Invalid HTML: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
}