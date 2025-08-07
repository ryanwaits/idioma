import { BaseTranslationStrategy, type ParseResult, type TranslatableNode, type ValidationResult } from './base';
import * as xml2js from 'xml2js';

export interface XmlConfig {
  translatableAttributes?: string[];
  skipTags?: string[];
  preserveCDATA?: boolean;
  includePaths?: string[];
  excludePaths?: string[];
  attributePrefix?: string;
  textNodeName?: string;
}

export class XmlStrategy extends BaseTranslationStrategy {
  private config: XmlConfig;
  private translatableAttributes: string[];
  private skipTags: string[];
  private parser: xml2js.Parser;
  private builder: xml2js.Builder;

  constructor(config?: XmlConfig) {
    super();
    this.config = config || {};
    
    // Default translatable attributes
    this.translatableAttributes = config?.translatableAttributes || [
      'label', 'title', 'description', 'tooltip', 'help', 'message', 'text'
    ];
    
    // Tags to skip entirely
    this.skipTags = config?.skipTags || [
      'script', 'style', 'code'
    ];
    
    // Configure xml2js parser
    this.parser = new xml2js.Parser({
      explicitArray: true,
      preserveChildrenOrder: true,
      explicitCharkey: true,
      charkey: '_text',
      attrkey: '_attrs',
      explicitRoot: true,
      mergeAttrs: false,
      xmlns: true,
      explicitChildren: true,
      childkey: '_children',
      charsAsChildren: false,
      includeWhiteChars: true,
      async: false,
      strict: true,
      attrNameProcessors: [],
      attrValueProcessors: [],
      tagNameProcessors: [],
      valueProcessors: []
    });
    
    // Configure builder for reconstruction
    this.builder = new xml2js.Builder({
      renderOpts: {
        pretty: true,
        indent: '  ',
        newline: '\n'
      },
      xmldec: {
        version: '1.0',
        encoding: 'UTF-8',
        standalone: false
      },
      charkey: '_text',
      attrkey: '_attrs',
      rootName: 'root'
    });
  }

  canHandle(filePath: string): boolean {
    return filePath.endsWith('.xml');
  }
  
  getName(): string {
    return 'XML';
  }

  async parse(content: string): Promise<ParseResult> {
    try {
      const result = await xml2js.parseStringPromise(content, {
        explicitArray: true,
        preserveChildrenOrder: true,
        explicitCharkey: true,
        charkey: '_text',
        attrkey: '_attrs',
        explicitRoot: true,
        mergeAttrs: false,
        xmlns: false,  // Set to false to get simple string attributes
        explicitChildren: false,
        includeWhiteChars: true,
        async: true,
        strict: true
      });
      
      const translatableContent = new Map<string, TranslatableNode>();
      
      // Extract XML metadata
      const xmlMetadata = {
        hasXmlDeclaration: content.startsWith('<?xml'),
        encoding: this.extractXmlEncoding(content),
        rootElement: Object.keys(result)[0],
        hasCDATA: content.includes('<![CDATA['),
        hasNamespaces: content.includes('xmlns'),
        originalContent: content
      };
      
      // Walk the XML tree
      for (const [rootName, rootValue] of Object.entries(result)) {
        this.walkXML(rootValue, translatableContent, [rootName]);
      }
      
      return {
        translatableContent,
        metadata: {
          structure: result,
          xmlMetadata
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractXmlEncoding(content: string): string {
    const match = content.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i);
    return match ? match[1] : 'UTF-8';
  }

  private walkXML(
    node: any,
    translatableContent: Map<string, TranslatableNode>,
    path: string[],
    depth: number = 0
  ): void {
    // Prevent infinite recursion
    if (depth > 100) {
      throw new Error('XML depth limit exceeded');
    }
    
    // Skip certain tags
    const currentTag = path[path.length - 1]?.replace(/\[\d+\]$/, ''); // Remove array index for tag check
    if (currentTag && this.skipTags.includes(currentTag)) {
      return;
    }
    
    // Handle arrays (XML allows multiple elements with same name)
    if (Array.isArray(node)) {
      node.forEach((item, index) => {
        const lastSegment = path[path.length - 1];
        // If last segment already has an index, don't add another
        const indexedPath = lastSegment?.includes('[') 
          ? path 
          : [...path.slice(0, -1), `${lastSegment}[${index}]`];
        this.walkXML(item, translatableContent, indexedPath, depth);
      });
      return;
    }
    
    // Handle object nodes
    if (typeof node === 'object' && node !== null) {
      // Process attributes
      if (node._attrs) {
        for (const [attrName, attrValue] of Object.entries(node._attrs)) {
          if (this.translatableAttributes.includes(attrName) && typeof attrValue === 'string') {
            const attrPath = `${path.join('.')}.@${attrName}`;
            if (!this.shouldSkipPath(attrPath) && this.isTranslatableXmlValue(attrValue, attrName)) {
              translatableContent.set(attrPath, {
                value: attrValue,
                type: 'attribute',
                attributeName: attrName,
                elementName: currentTag,
                depth
              });
            }
          }
        }
      }
      
      // Process text content
      if (node._text) {
        const textContent = Array.isArray(node._text) ? node._text.join('') : node._text;
        const trimmedText = textContent.trim();
        
        if (trimmedText && this.isTranslatableXmlValue(trimmedText, currentTag || '')) {
          const textPath = `${path.join('.')}._text`;
          if (!this.shouldSkipPath(textPath)) {
            translatableContent.set(textPath, {
              value: trimmedText,
              type: 'text',
              elementName: currentTag,
              preserveWhitespace: this.shouldPreserveWhitespace(currentTag || ''),
              originalText: textContent, // Keep original with whitespace
              depth
            });
          }
        }
      }
      
      // Note: CDATA sections are parsed as regular text content by xml2js with our settings
      
      // Recurse into child elements
      for (const [childName, childValue] of Object.entries(node)) {
        if (!childName.startsWith('_') && childName !== '$') {
          this.walkXML(childValue, translatableContent, [...path, childName], depth + 1);
        }
      }
    }
  }

  private isTranslatableXmlValue(value: string, tagOrAttr: string): boolean {
    // Skip empty or whitespace-only
    if (!value.trim()) return false;
    
    // Skip technical values
    if (/^(true|false|null|undefined)$/i.test(value)) return false;
    if (/^\d+(\.\d+)?$/.test(value)) return false; // Pure numbers
    if (/^[A-Z_]+$/.test(value)) return false; // Constants
    
    // Skip URLs and file paths
    if (/^https?:\/\//.test(value)) return false;
    if (/^[\.\/\\]/.test(value)) return false;
    
    // Skip technical XML values
    if (/^#[A-Z]+$/.test(value)) return false; // Like #PCDATA, #IMPLIED
    if (/^\{.*\}$/.test(value)) return false; // Namespace URIs
    
    // Use base class method for additional checks
    return this.isTranslatableString(value, tagOrAttr);
  }

  private shouldPreserveWhitespace(tagName: string): boolean {
    // Tags where whitespace matters
    const whitespaceTags = ['pre', 'code', 'script', 'style'];
    return whitespaceTags.includes(tagName.toLowerCase());
  }

  private shouldSkipPath(path: string): boolean {
    // Remove array indices for path matching (e.g., "root.items[0].item[1]" -> "root.items.item")
    const normalizedPath = path.replace(/\[\d+\]/g, '');
    
    // Check excludePaths
    if (this.config.excludePaths) {
      for (const excludePath of this.config.excludePaths) {
        if (normalizedPath === excludePath || normalizedPath.startsWith(excludePath + '.')) {
          return true;
        }
      }
    }

    // Check includePaths (if specified, only include matching paths)
    if (this.config.includePaths && this.config.includePaths.length > 0) {
      let included = false;
      for (const includePath of this.config.includePaths) {
        if (normalizedPath === includePath || normalizedPath.startsWith(includePath + '.')) {
          included = true;
          break;
        }
      }
      return !included;
    }

    return false;
  }

  async reconstruct(translations: Map<string, string>, metadata: any): Promise<string> {
    const { structure, xmlMetadata } = metadata;
    
    // Deep clone the structure
    const reconstructed = JSON.parse(JSON.stringify(structure));
    
    // Apply translations
    for (const [path, translation] of translations) {
      this.setTranslationByPath(reconstructed, path, translation);
    }
    
    // Build XML string
    let xmlString = '';
    
    // Add XML declaration if original had one
    if (xmlMetadata.hasXmlDeclaration) {
      xmlString = `<?xml version="1.0" encoding="${xmlMetadata.encoding}"?>\n`;
    }
    
    // Convert structure back to XML
    const rootName = Object.keys(reconstructed)[0];
    const rootValue = reconstructed[rootName];
    
    // Note: rootValue is the content of the root element, not including the root element itself
    
    // Transform structure for xml2js builder
    // Builder expects $ for attributes and _ for text content
    const transformForBuilder = (obj: any): any => {
      if (Array.isArray(obj)) {
        // If array has single element, unwrap it (common in XML)
        if (obj.length === 1) {
          return transformForBuilder(obj[0]);
        }
        // Otherwise transform each element
        return obj.map(item => transformForBuilder(item));
      }
      if (typeof obj === 'object' && obj !== null) {
        const transformed: any = {};
        
        for (const [key, value] of Object.entries(obj)) {
          // Skip internal xml2js metadata
          if (key === '_attrsns' || key === '$$') continue;
          
          // Convert _attrs to $
          if (key === '_attrs') {
            transformed['$'] = value;
          }
          // Convert _text to _ but only if there are other properties
          else if (key === '_text') {
            // Check if this is the only property (besides _attrs)
            const otherKeys = Object.keys(obj).filter(k => k !== '_text' && k !== '_attrs');
            if (otherKeys.length === 0) {
              // If only text (and maybe attrs), use _ for text content
              if (obj._attrs) {
                transformed['_'] = value;
              } else {
                // Just text, return as string
                return value;
              }
            } else {
              // Mixed content, add as _ 
              transformed['_'] = value;
            }
          }
          // Handle regular elements
          else {
            transformed[key] = transformForBuilder(value);
          }
        }
        
        return transformed;
      }
      return obj;
    };
    
    // Transform the root value's content
    const transformedRoot: any = {};
    for (const [key, value] of Object.entries(rootValue)) {
      transformedRoot[key] = transformForBuilder(value);
    }
    
    // Wrap the transformed content in the root element
    // xml2js.Builder's rootName doesn't actually wrap - it expects the data to already have the root
    const wrappedData = { [rootName]: transformedRoot };
    
    // Use xml2js builder
    const builder = new xml2js.Builder({
      renderOpts: {
        pretty: true,
        indent: '  ',
        newline: '\n'
      },
      headless: true, // We already added the declaration
      charkey: '_',
      attrkey: '$'
    });
    
    // Build with the properly wrapped data
    xmlString += builder.buildObject(wrappedData);
    
    return xmlString;
  }

  private setTranslationByPath(obj: any, path: string, translation: string): void {
    const segments = path.split('.');
    let current = obj;
    
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      
      // Handle array notation like "title[0]"
      const arrayMatch = segment.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        if (!current[key]) return;
        current = current[key][parseInt(index)];
      } else {
        if (!current[segment]) return;
        current = current[segment];
        // If it's an array with single element, access first element
        if (Array.isArray(current) && current.length === 1) {
          current = current[0];
        }
      }
      
      if (!current) return;
    }
    
    const lastSegment = segments[segments.length - 1];
    
    // Handle attributes
    if (lastSegment.startsWith('@')) {
      const attrName = lastSegment.substring(1);
      if (!current._attrs) current._attrs = {};
      current._attrs[attrName] = translation;
    }
    // Handle text content
    else if (lastSegment === '_text') {
      // Preserve original whitespace if available
      if (current._text !== undefined) {
        if (typeof current._text === 'string') {
          const leadingSpace = current._text.match(/^\s*/)?.[0] || '';
          const trailingSpace = current._text.match(/\s*$/)?.[0] || '';
          current._text = leadingSpace + translation + trailingSpace;
        } else {
          current._text = translation;
        }
      }
    }
    // Note: CDATA is handled as regular text by xml2js
  }

  validate(content: string): ValidationResult {
    try {
      const parser = new xml2js.Parser({
        strict: true,
        async: false
      });
      
      parser.parseString(content, (err, result) => {
        if (err) {
          throw err;
        }
      });
      
      return { valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Try to extract line/column from error message
      const lineMatch = errorMessage.match(/line (\d+)/i);
      const columnMatch = errorMessage.match(/column (\d+)/i);
      
      return {
        valid: false,
        errors: [{
          line: lineMatch ? parseInt(lineMatch[1]) : undefined,
          column: columnMatch ? parseInt(columnMatch[1]) : undefined,
          message: `Invalid XML: ${errorMessage}`
        }]
      };
    }
  }
}