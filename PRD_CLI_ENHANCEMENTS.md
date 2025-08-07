# Product Requirements Document: Idioma CLI Format Support

## Executive Summary

Extend Idioma's CLI capabilities to support 7 new file formats beyond MDX/Markdown while maintaining our "90% cheaper than SaaS" value proposition. This focused enhancement enables translation of configuration files, data files, and source code documentation, expanding Idioma's utility for diverse developer workflows.

## Goals & Objectives

### Primary Goals
- Support 7 new file formats with intelligent content detection
- Maintain 100% format structure and syntax preservation
- Implement smart detection of translatable vs technical content
- Enable automatic format detection by file extension
- Ensure zero breaking changes to existing MDX functionality

### Success Metrics
- All 7 formats fully implemented with comprehensive test coverage
- <1% false positive rate for technical content detection
- 100% format preservation (no syntax errors after translation)
- Zero regression in existing MDX translation quality
- All formats configurable via idioma.json only (no CLI flags)

## Technical Requirements

### Core Architecture Principles
1. **Strategy Pattern**: Each format implements `TranslationStrategy` interface
2. **Smart Detection**: Automatic identification of translatable strings
3. **Format Preservation**: Maintain exact structure, spacing, and syntax
4. **Configuration-First**: All settings via idioma.json, no CLI flags
5. **Incremental Adoption**: Formats work independently, no interdependencies

### File Extension Mapping
```typescript
const FORMAT_EXTENSIONS = {
  '.json': JsonTranslationStrategy,
  '.yaml': YamlTranslationStrategy,
  '.yml': YamlTranslationStrategy,
  '.html': HtmlTranslationStrategy,
  '.htm': HtmlTranslationStrategy,
  '.csv': CsvTranslationStrategy,
  '.xml': XmlTranslationStrategy,
  '.js': JavaScriptTranslationStrategy,
  '.ts': JavaScriptTranslationStrategy,
  '.jsx': JavaScriptTranslationStrategy,
  '.tsx': JavaScriptTranslationStrategy,
  '.mjs': JavaScriptTranslationStrategy,
  '.cjs': JavaScriptTranslationStrategy
};
```

## User Personas

### 1. Technical Writer
- **Needs**: Translate documentation across multiple formats
- **Pain Points**: Manual copy-paste between tools
- **Value Prop**: Single tool for all documentation formats

### 2. Full-Stack Developer
- **Needs**: Translate UI components and config files
- **Pain Points**: Inconsistent translations across file types
- **Value Prop**: Unified translation with glossary support

### 3. Enterprise Developer
- **Needs**: Translate data files and application strings
- **Pain Points**: Managing translations across multiple file types
- **Value Prop**: Unified translation with format preservation

## Detailed Format Specifications

### 1.1 JSON Translation

**Use Cases**:
- i18n/localization files (e.g., `locales/en.json`)
- Configuration files with user-facing strings
- API response templates
- Framework-specific translation files (React, Vue, Rails)

**Smart Detection Rules**:
```typescript
private isTranslatableString(value: string, key: string): boolean {
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
  const techKeys = ['id', 'uuid', 'key', 'token', 'hash', 'version', 'timestamp', 
                    'created_at', 'updated_at', 'deleted_at', 'slug', 'sku', 'api_key'];
  if (techKeys.includes(key.toLowerCase())) return false;
  
  // Must have meaningful content
  if (value.length < 2) return false;
  
  // Positive indicators
  if (value.includes(' ') && value.split(' ').length > 1) return true; // Multi-word
  if (/[.!?]$/.test(value)) return true; // Sentence endings
  if (/^[A-Z][a-z]/.test(value)) return true; // Sentence case
  
  return false;
}
```

**Implementation Details**:
```typescript
export class JsonTranslationStrategy implements TranslationStrategy {
  async parse(content: string): Promise<ParseResult> {
    const data = JSON.parse(content);
    const translatableStrings = new Map<string, TranslatableNode>();
    
    function extractStrings(obj: any, path: string[] = [], depth = 0) {
      // Prevent infinite recursion
      if (depth > 100) throw new Error('JSON depth limit exceeded');
      
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];
        
        if (typeof value === 'string') {
          if (this.isTranslatableString(value, key)) {
            translatableStrings.set(
              currentPath.join('.'),
              {
                value,
                context: path[path.length - 1] || 'root',
                depth,
                siblings: Object.keys(obj)
              }
            );
          }
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'string' && this.isTranslatableString(item, key)) {
              translatableStrings.set(
                `${currentPath.join('.')}[${index}]`,
                { value: item, isArrayItem: true }
              );
            } else if (typeof item === 'object' && item !== null) {
              extractStrings(item, [...currentPath, `[${index}]`], depth + 1);
            }
          });
        } else if (typeof value === 'object' && value !== null) {
          extractStrings(value, currentPath, depth + 1);
        }
      }
    }
    
    extractStrings(data);
    return { translatableStrings, metadata: { structure: data } };
  }

  async reconstruct(translations: Map<string, string>, metadata: any): Promise<string> {
    const result = JSON.parse(JSON.stringify(metadata.structure));
    
    for (const [path, translation] of translations) {
      setValueByPath(result, path.split('.'), translation);
    }
    
    // Preserve original formatting style
    const hasNewlines = metadata.originalContent?.includes('\n');
    return JSON.stringify(result, null, hasNewlines ? 2 : undefined);
  }
}
```

**Configuration in idioma.json**:
```json
{
  "files": {
    "json": {
      "include": ["locales/**/*.json", "i18n/**/*.json"],
      "exclude": ["package.json", "tsconfig.json", "*.lock.json"]
    }
  },
  "translation": {
    "json": {
      "includePaths": ["title", "description", "label", "message", "error", "warning"],
      "excludePaths": ["id", "key", "url", "timestamp"],
      "preserveArrayOrder": true,
      "skipEmptyStrings": true
    }
  }
}
```

### 1.2 YAML Translation

**Use Cases**:
- Rails i18n files (e.g., `config/locales/en.yml`)
- Docker Compose descriptions and labels
- CI/CD pipeline descriptions
- Kubernetes manifest annotations
- Configuration files with translatable content

**YAML-Specific Features**:
```typescript
export class YamlTranslationStrategy implements TranslationStrategy {
  async parse(content: string): Promise<ParseResult> {
    // Handle multi-document YAML
    const documents = yaml.loadAll(content);
    const translatableStrings = new Map<string, TranslatableNode>();
    
    // Preserve YAML-specific features
    const yamlMetadata = {
      hasAnchors: content.includes('&'),
      hasAliases: content.includes('*'),
      hasMergeKeys: content.includes('<<'),
      multilineStyle: this.detectMultilineStyle(content),
      commentPositions: this.extractCommentPositions(content),
      indentSize: this.detectIndentSize(content)
    };
    
    documents.forEach((doc, docIndex) => {
      this.extractFromDocument(doc, translatableStrings, docIndex);
    });
    
    return { translatableStrings, metadata: { documents, yamlMetadata } };
  }
  
  private detectMultilineStyle(content: string): 'literal' | 'folded' | 'plain' {
    if (content.includes('|')) return 'literal';
    if (content.includes('>')) return 'folded';
    return 'plain';
  }
  
  private isTranslatableYamlValue(value: string, key: string): boolean {
    // Skip environment variables
    if (/^\$\{.*\}$/.test(value)) return false;
    if (/^\$[A-Z_]+$/.test(value)) return false;
    
    // Skip file paths
    if (/^[\.\/~]/.test(value)) return false;
    
    // Skip shell commands
    if (/^(npm|yarn|pnpm|bun|docker|kubectl|git)\s/.test(value)) return false;
    
    // Apply standard rules
    return this.isTranslatableString(value, key);
  }
  
  async reconstruct(translations: Map<string, string>, metadata: any): Promise<string> {
    const results = metadata.documents.map((doc, index) => {
      const docCopy = JSON.parse(JSON.stringify(doc));
      
      // Apply translations for this document
      for (const [path, translation] of translations) {
        if (path.startsWith(`doc${index}.`)) {
          const docPath = path.substring(`doc${index}.`.length);
          setValueByPath(docCopy, docPath.split('.'), translation);
        }
      }
      
      return yaml.dump(docCopy, {
        styles: metadata.yamlMetadata.multilineStyle,
        lineWidth: -1, // Preserve line breaks
        noRefs: !metadata.yamlMetadata.hasAnchors,
        indent: metadata.yamlMetadata.indentSize
      });
    });
    
    return results.join('---\n');
  }
}
```

### 1.3 HTML Translation

**Use Cases**:
- Static HTML websites
- Email templates (marketing, transactional)
- Landing pages
- Generated documentation
- HTML fragments/partials

**HTML-Specific Handling**:
```typescript
export class HtmlTranslationStrategy implements TranslationStrategy {
  private translatableAttributes = [
    'alt', 'title', 'placeholder', 'aria-label', 'aria-description',
    'data-tooltip', 'data-title', 'content', 'label', 'value'
  ];
  
  private skipTags = [
    'script', 'style', 'code', 'pre', 'kbd', 'samp', 'var'
  ];
  
  async parse(content: string): Promise<ParseResult> {
    const document = parse(content, { 
      sourceCodeLocationInfo: true,
      scriptingEnabled: false 
    });
    
    const translatableContent = new Map<string, TranslatableNode>();
    const htmlMetadata = {
      doctype: this.extractDoctype(content),
      hasInlineStyles: content.includes('style='),
      hasInlineScripts: content.includes('onclick') || content.includes('onload'),
      encoding: this.extractEncoding(document)
    };
    
    this.walkDOM(document, translatableContent);
    
    return { translatableContent, metadata: { document, htmlMetadata } };
  }
  
  private walkDOM(node: any, translatableContent: Map<string, TranslatableNode>) {
    if (this.skipTags.includes(node.nodeName)) return;
    
    // Text nodes
    if (node.nodeName === '#text') {
      const text = node.value.trim();
      if (text && this.isTranslatableText(text)) {
        const id = this.generateNodeId(node);
        translatableContent.set(id, {
          type: 'text',
          content: text,
          parentTag: node.parentNode?.nodeName,
          preserveWhitespace: this.shouldPreserveWhitespace(node.parentNode)
        });
      }
    }
    
    // Attributes
    if (node.attrs) {
      for (const attr of node.attrs) {
        if (this.translatableAttributes.includes(attr.name)) {
          const id = `${this.generateNodeId(node)}.@${attr.name}`;
          translatableContent.set(id, {
            type: 'attribute',
            content: attr.value,
            attributeName: attr.name,
            tagName: node.nodeName
          });
        }
      }
    }
    
    // Meta tags special handling
    if (node.nodeName === 'meta') {
      const nameAttr = node.attrs?.find(a => a.name === 'name');
      const contentAttr = node.attrs?.find(a => a.name === 'content');
      
      if (nameAttr && contentAttr && 
          ['description', 'keywords', 'author'].includes(nameAttr.value)) {
        const id = `meta.${nameAttr.value}`;
        translatableContent.set(id, {
          type: 'meta',
          content: contentAttr.value,
          metaName: nameAttr.value
        });
      }
    }
    
    // Recurse children
    if (node.childNodes) {
      for (const child of node.childNodes) {
        this.walkDOM(child, translatableContent);
      }
    }
  }
  
  private isTranslatableText(text: string): boolean {
    // Skip code-like content
    if (/^[\{\}\[\]()<>]/.test(text)) return false;
    if (/^\$|^@|^#/.test(text)) return false;
    if (/^[A-Z_]+$/.test(text)) return false; // Constants
    
    // Must have meaningful content
    if (text.length < 2) return false;
    if (!/[a-zA-Z]/.test(text)) return false; // Must have letters
    
    return true;
  }
}
```

### 1.4 CSV Translation

**Use Cases**:
- Translation spreadsheets
- Product catalogs with descriptions
- Database exports with user-facing content
- Spreadsheet-based localization workflows

**CSV-Specific Features**:
```typescript
export class CsvTranslationStrategy implements TranslationStrategy {
  async parse(content: string, config?: CsvConfig): Promise<ParseResult> {
    // Auto-detect delimiter
    const delimiter = this.detectDelimiter(content);
    
    // Parse with options
    const records = parseCSV(content, {
      columns: true, // First row as headers
      delimiter,
      skip_empty_lines: true,
      relax_quotes: true,
      escape: '\\',
      quote: '"'
    });
    
    // Auto-detect translatable columns
    const translatableColumns = config?.columns || 
                                this.autoDetectColumns(records);
    
    const translatableContent = new Map<string, TranslatableNode>();
    
    records.forEach((record, rowIndex) => {
      translatableColumns.forEach(column => {
        const value = record[column];
        if (value && typeof value === 'string' && value.trim()) {
          if (!this.shouldSkipValue(value)) {
            translatableContent.set(
              `row_${rowIndex}_col_${column}`,
              {
                value: value.trim(),
                column,
                rowIndex,
                hasQuotes: value.includes('"') || value.includes("'"),
                hasNewlines: value.includes('\n')
              }
            );
          }
        }
      });
    });
    
    return { 
      translatableContent, 
      metadata: { 
        records, 
        columns: Object.keys(records[0] || {}),
        translatableColumns,
        delimiter,
        hasHeaders: true
      } 
    };
  }
  
  private detectDelimiter(content: string): string {
    const firstLine = content.split('\n')[0];
    const delimiters = [',', '\t', ';', '|'];
    
    let maxCount = 0;
    let bestDelimiter = ',';
    
    for (const delimiter of delimiters) {
      const count = (firstLine.match(new RegExp(delimiter, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  }
  
  private autoDetectColumns(records: any[]): string[] {
    if (records.length === 0) return [];
    
    const columns = Object.keys(records[0]);
    const translatableColumns = [];
    
    for (const col of columns) {
      // Skip obvious non-translatable columns
      if (/^(id|uuid|sku|created|updated|timestamp|date|time|count|quantity|price|amount|stock|weight|dimension|lat|lon|lng|email|phone|url|ip|hash|token|key)(_|$)/i.test(col)) {
        continue;
      }
      
      // Include obvious translatable columns
      if (/^(name|title|description|label|message|content|text|summary|excerpt|body|comment|note|tooltip|placeholder|error|warning|info|success|caption|heading|subtitle)(_|$)/i.test(col)) {
        translatableColumns.push(col);
        continue;
      }
      
      // Sample first 10 rows to determine if translatable
      const samples = records.slice(0, 10)
        .map(r => r[col])
        .filter(v => v && typeof v === 'string');
      
      if (this.looksLikeTranslatableContent(samples)) {
        translatableColumns.push(col);
      }
    }
    
    return translatableColumns;
  }
  
  private looksLikeTranslatableContent(values: string[]): boolean {
    if (values.length === 0) return false;
    
    let translatableCount = 0;
    
    for (const value of values) {
      // Has multiple words
      if (value.includes(' ') && value.split(' ').length > 2) {
        translatableCount++;
      }
      // Has sentence structure
      else if (/[.!?]$/.test(value)) {
        translatableCount++;
      }
      // Starts with capital letter (likely prose)
      else if (/^[A-Z][a-z]/.test(value) && value.length > 10) {
        translatableCount++;
      }
    }
    
    // If >50% look translatable, include the column
    return translatableCount / values.length > 0.5;
  }
}
```

### 1.5 XML Translation

**Use Cases**:
- Android strings.xml resources
- RSS/Atom feed descriptions
- SOAP message content
- SVG text elements
- XLIFF translation files

**XML-Specific Handling**:
```typescript
export class XmlTranslationStrategy implements TranslationStrategy {
  async parse(content: string): ParseResult {
    const parser = new DOMParser({
      locator: {},
      errorHandler: {
        warning: (w) => console.warn('XML Parse Warning:', w),
        error: (e) => { throw new Error(`XML Parse Error: ${e}`); },
        fatalError: (e) => { throw new Error(`XML Fatal Error: ${e}`); }
      }
    });
    
    const doc = parser.parseFromString(content, 'text/xml');
    const translatableContent = new Map<string, TranslatableNode>();
    
    // Detect XML type for specialized handling
    const xmlType = this.detectXmlType(doc);
    const xmlMetadata = {
      type: xmlType,
      hasNamespaces: content.includes('xmlns'),
      hasCDATA: content.includes('<![CDATA['),
      hasProcessingInstructions: content.includes('<?'),
      encoding: this.extractEncoding(content),
      standalone: this.extractStandalone(content)
    };
    
    // Apply type-specific parsing
    switch (xmlType) {
      case 'android-strings':
        this.parseAndroidStrings(doc, translatableContent);
        break;
      case 'xliff':
        this.parseXliff(doc, translatableContent);
        break;
      case 'svg':
        this.parseSvg(doc, translatableContent);
        break;
      default:
        this.parseGenericXml(doc, translatableContent);
    }
    
    return { translatableContent, metadata: { document: doc, xmlMetadata } };
  }
  
  private detectXmlType(doc: Document): string {
    const root = doc.documentElement;
    
    if (root.nodeName === 'resources' && 
        root.getElementsByTagName('string').length > 0) {
      return 'android-strings';
    }
    
    if (root.nodeName === 'xliff') {
      return 'xliff';
    }
    
    if (root.nodeName === 'svg') {
      return 'svg';
    }
    
    if (root.nodeName === 'rss' || root.nodeName === 'feed') {
      return 'feed';
    }
    
    return 'generic';
  }
  
  private parseAndroidStrings(doc: Document, translatableContent: Map<string, TranslatableNode>) {
    const strings = doc.getElementsByTagName('string');
    
    for (let i = 0; i < strings.length; i++) {
      const element = strings[i];
      const name = element.getAttribute('name');
      const translatable = element.getAttribute('translatable');
      
      if (name && translatable !== 'false') {
        const text = element.textContent?.trim();
        if (text) {
          translatableContent.set(`string.${name}`, {
            type: 'android-string',
            content: text,
            name,
            hasFormatArgs: text.includes('%'),
            hasPlurals: element.parentElement?.nodeName === 'plurals'
          });
        }
      }
    }
    
    // Handle string arrays
    const stringArrays = doc.getElementsByTagName('string-array');
    for (let i = 0; i < stringArrays.length; i++) {
      const array = stringArrays[i];
      const name = array.getAttribute('name');
      const items = array.getElementsByTagName('item');
      
      for (let j = 0; j < items.length; j++) {
        const text = items[j].textContent?.trim();
        if (text) {
          translatableContent.set(`string-array.${name}[${j}]`, {
            type: 'android-string-array',
            content: text,
            arrayName: name,
            index: j
          });
        }
      }
    }
  }
  
  private parseSvg(doc: Document, translatableContent: Map<string, TranslatableNode>) {
    // Text elements
    const textElements = doc.getElementsByTagName('text');
    for (let i = 0; i < textElements.length; i++) {
      const element = textElements[i];
      const text = element.textContent?.trim();
      if (text && this.isTranslatableText(text)) {
        translatableContent.set(`text[${i}]`, {
          type: 'svg-text',
          content: text,
          x: element.getAttribute('x'),
          y: element.getAttribute('y')
        });
      }
    }
    
    // Title and desc elements
    const titles = doc.getElementsByTagName('title');
    const descs = doc.getElementsByTagName('desc');
    
    for (let i = 0; i < titles.length; i++) {
      const text = titles[i].textContent?.trim();
      if (text) {
        translatableContent.set(`title[${i}]`, {
          type: 'svg-metadata',
          content: text
        });
      }
    }
    
    for (let i = 0; i < descs.length; i++) {
      const text = descs[i].textContent?.trim();
      if (text) {
        translatableContent.set(`desc[${i}]`, {
          type: 'svg-metadata',
          content: text
        });
      }
    }
  }
}
```

### 1.6 JavaScript/TypeScript/JSX Translation

**Use Cases**:
- i18n object literals
- Module exports with translation strings
- JSX text content in React components
- Vue/Angular template strings
- JSDoc comments

**JavaScript-Specific Parsing**:
```typescript
export class JavaScriptTranslationStrategy implements TranslationStrategy {
  async parse(content: string): ParseResult {
    // Detect file type for proper plugin configuration
    const isTypeScript = content.includes(': ') || content.includes('interface ') || 
                        content.includes('type ');
    const isJSX = content.includes('<') && content.includes('/>');
    
    const ast = parse(content, {
      sourceType: 'module',
      plugins: [
        ...(isTypeScript ? ['typescript'] : []),
        ...(isJSX ? ['jsx'] : []),
        'decorators-legacy',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'optionalChaining',
        'nullishCoalescingOperator'
      ],
      tokens: true,
      attachComment: true
    });
    
    const translatableContent = new Map<string, TranslatableNode>();
    
    traverse(ast, {
      // String literals in objects
      ObjectProperty(path) {
        if (path.node.value.type === 'StringLiteral') {
          const key = path.node.key.type === 'Identifier' 
            ? path.node.key.name 
            : path.node.key.value;
          
          if (this.isInTranslationContext(path) || 
              this.isTranslatableString(path.node.value.value, key)) {
            const loc = path.node.loc;
            if (loc) {
              translatableContent.set(
                `${loc.start.line}:${loc.start.column}`,
                {
                  type: 'object-value',
                  content: path.node.value.value,
                  key,
                  context: this.getObjectContext(path)
                }
              );
            }
          }
        }
      },
      
      // Template literals
      TemplateLiteral(path) {
        path.node.quasis.forEach((quasi, index) => {
          if (quasi.value.cooked && this.isTranslatableString(quasi.value.cooked)) {
            const loc = quasi.loc;
            if (loc) {
              translatableContent.set(
                `template_${loc.start.line}:${loc.start.column}`,
                {
                  type: 'template',
                  content: quasi.value.cooked,
                  hasInterpolations: path.node.expressions.length > 0,
                  interpolationCount: path.node.expressions.length
                }
              );
            }
          }
        });
      },
      
      // JSX Text
      JSXText(path) {
        const text = path.node.value.trim();
        if (text && !this.shouldSkipJsxText(text)) {
          const loc = path.node.loc;
          if (loc) {
            translatableContent.set(
              `jsx_text_${loc.start.line}:${loc.start.column}`,
              {
                type: 'jsx-text',
                content: text,
                parentComponent: this.getParentComponentName(path)
              }
            );
          }
        }
      },
      
      // JSX Attributes
      JSXAttribute(path) {
        const attrName = path.node.name.name;
        if (this.isTranslatableJsxAttribute(attrName) && 
            path.node.value?.type === 'StringLiteral') {
          const loc = path.node.loc;
          if (loc) {
            translatableContent.set(
              `jsx_attr_${loc.start.line}:${loc.start.column}`,
              {
                type: 'jsx-attribute',
                content: path.node.value.value,
                attributeName: attrName,
                componentName: path.parent.name?.name
              }
            );
          }
        }
      },
      
      // JSDoc comments
      enter(path) {
        if (path.node.leadingComments) {
          path.node.leadingComments.forEach((comment, index) => {
            if (comment.type === 'CommentBlock' && comment.value.includes('*')) {
              const jsdoc = this.parseJSDoc(comment.value);
              if (jsdoc.description) {
                translatableContent.set(
                  `jsdoc_${comment.loc.start.line}`,
                  {
                    type: 'jsdoc',
                    content: jsdoc.description,
                    tags: jsdoc.tags
                  }
                );
              }
            }
          });
        }
      }
    });
    
    return { translatableContent, metadata: { ast } };
  }
  
  private isInTranslationContext(path: any): boolean {
    // Check if we're in a translations/i18n/messages object
    let current = path;
    while (current.parent) {
      if (current.parent.type === 'VariableDeclarator') {
        const name = current.parent.id?.name;
        if (name && /^(translations?|i18n|messages?|strings?|locale|lang)/i.test(name)) {
          return true;
        }
      }
      
      if (current.parent.type === 'ObjectProperty') {
        const key = current.parent.key?.name || current.parent.key?.value;
        if (key && /^(translations?|i18n|messages?|strings?|locale|lang)/i.test(key)) {
          return true;
        }
      }
      
      current = current.parent;
    }
    return false;
  }
  
  private shouldSkipJsxText(text: string): boolean {
    // Skip whitespace-only
    if (!text.trim()) return true;
    
    // Skip single characters (likely operators or symbols)
    if (text.trim().length === 1) return true;
    
    // Skip code-like content
    if (/^[{}\[\]()<>]/.test(text)) return true;
    
    // Skip numbers
    if (/^\d+$/.test(text)) return true;
    
    return false;
  }
  
  private isTranslatableJsxAttribute(name: string): boolean {
    const translatableAttrs = [
      'title', 'alt', 'placeholder', 'label', 'aria-label',
      'aria-description', 'data-tooltip', 'data-title',
      'helperText', 'errorText', 'description'
    ];
    return translatableAttrs.includes(name);
  }
  
  private parseJSDoc(comment: string): { description?: string; tags: any[] } {
    const lines = comment.split('\n');
    const description = [];
    const tags = [];
    
    for (const line of lines) {
      const trimmed = line.replace(/^\s*\*\s?/, '');
      if (trimmed.startsWith('@')) {
        const match = trimmed.match(/^@(\w+)\s+(.*)$/);
        if (match) {
          tags.push({ name: match[1], value: match[2] });
        }
      } else if (trimmed && !trimmed.startsWith('*')) {
        description.push(trimmed);
      }
    }
    
    return {
      description: description.join(' ').trim(),
      tags
    };
  }
}
```

## Implementation Architecture

### Base Strategy Interface
```typescript
// src/core/strategies/base.ts
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
```

### Format Detection System
```typescript
// src/core/formats/detector.ts
export class FormatDetector {
  private strategies = new Map<string, TranslationStrategy>();
  
  constructor() {
    this.registerDefaultStrategies();
  }
  
  private registerDefaultStrategies() {
    this.strategies.set('.json', new JsonTranslationStrategy());
    this.strategies.set('.yaml', new YamlTranslationStrategy());
    this.strategies.set('.yml', new YamlTranslationStrategy());
    this.strategies.set('.html', new HtmlTranslationStrategy());
    this.strategies.set('.htm', new HtmlTranslationStrategy());
    this.strategies.set('.csv', new CsvTranslationStrategy());
    this.strategies.set('.xml', new XmlTranslationStrategy());
    this.strategies.set('.js', new JavaScriptTranslationStrategy());
    this.strategies.set('.ts', new JavaScriptTranslationStrategy());
    this.strategies.set('.jsx', new JavaScriptTranslationStrategy());
    this.strategies.set('.tsx', new JavaScriptTranslationStrategy());
  }
  
  detectFormat(filePath: string): TranslationStrategy | null {
    const ext = path.extname(filePath).toLowerCase();
    return this.strategies.get(ext) || null;
  }
  
  async detectFromContent(content: string): Promise<TranslationStrategy | null> {
    // Try to detect format from content
    if (this.looksLikeJson(content)) return this.strategies.get('.json');
    if (this.looksLikeYaml(content)) return this.strategies.get('.yaml');
    if (this.looksLikeHtml(content)) return this.strategies.get('.html');
    if (this.looksLikeXml(content)) return this.strategies.get('.xml');
    if (this.looksLikeCsv(content)) return this.strategies.get('.csv');
    if (this.looksLikeJavaScript(content)) return this.strategies.get('.js');
    
    return null;
  }
  
  private looksLikeJson(content: string): boolean {
    const trimmed = content.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
           (trimmed.startsWith('[') && trimmed.endsWith(']'));
  }
  
  private looksLikeYaml(content: string): boolean {
    return /^---\n/.test(content) || /^\w+:\s/.test(content);
  }
  
  private looksLikeHtml(content: string): boolean {
    return /<html|<body|<div|<!DOCTYPE/i.test(content);
  }
  
  private looksLikeXml(content: string): boolean {
    return /^<\?xml/.test(content) || /<\/\w+>$/.test(content.trim());
  }
  
  private looksLikeCsv(content: string): boolean {
    const lines = content.split('\n').slice(0, 2);
    return lines.some(line => line.split(',').length > 2);
  }
  
  private looksLikeJavaScript(content: string): boolean {
    return /^(import|export|const|let|var|function|class)\s/.test(content);
  }
}
```

## Testing Strategy

### Test Coverage Requirements

Each format must have:
1. **Unit Tests**: Individual function testing
2. **Integration Tests**: End-to-end translation flow
3. **Validation Tests**: Output format validation
4. **Edge Case Tests**: Boundary conditions and errors
5. **Performance Tests**: Large file handling

### Format-Specific Test Cases

#### JSON Tests
```typescript
describe('JsonTranslationStrategy', () => {
  it('should preserve number values', async () => {
    const input = '{"count": 42, "label": "items"}';
    const strategy = new JsonTranslationStrategy();
    const parsed = await strategy.parse(input);
    const translations = new Map([['label', 'elementos']]);
    const result = await strategy.reconstruct(translations, parsed.metadata);
    expect(JSON.parse(result).count).toBe(42);
  });
  
  it('should skip UUID strings', async () => {
    const input = '{"id": "550e8400-e29b-41d4-a716-446655440000", "name": "Test"}';
    const strategy = new JsonTranslationStrategy();
    const parsed = await strategy.parse(input);
    expect(parsed.translatableContent.has('id')).toBe(false);
    expect(parsed.translatableContent.has('name')).toBe(true);
  });
  
  it('should handle nested objects', async () => {
    const input = '{"menu": {"title": "File", "items": ["Open", "Save"]}}';
    const strategy = new JsonTranslationStrategy();
    const parsed = await strategy.parse(input);
    expect(parsed.translatableContent.get('menu.title').content).toBe('File');
    expect(parsed.translatableContent.get('menu.items[0]').content).toBe('Open');
  });
  
  it('should handle empty values', async () => {
    const input = '{"title": "", "description": null, "label": "Test"}';
    const strategy = new JsonTranslationStrategy();
    const parsed = await strategy.parse(input);
    expect(parsed.translatableContent.size).toBe(1);
    expect(parsed.translatableContent.has('label')).toBe(true);
  });
  
  it('should detect technical keys', async () => {
    const input = '{"api_key": "sk-123", "user_token": "abc", "message": "Hello"}';
    const strategy = new JsonTranslationStrategy();
    const parsed = await strategy.parse(input);
    expect(parsed.translatableContent.has('api_key')).toBe(false);
    expect(parsed.translatableContent.has('user_token')).toBe(false);
    expect(parsed.translatableContent.has('message')).toBe(true);
  });
});
```

#### YAML Tests
```typescript
describe('YamlTranslationStrategy', () => {
  it('should preserve anchors and aliases', async () => {
    const input = `
defaults: &defaults
  name: "Application"
  description: "A test app"
production:
  <<: *defaults
  environment: "prod"
    `;
    const strategy = new YamlTranslationStrategy();
    const parsed = await strategy.parse(input);
    const result = await strategy.reconstruct(new Map(), parsed.metadata);
    expect(result).toContain('&defaults');
    expect(result).toContain('*defaults');
  });
  
  it('should handle multi-document YAML', async () => {
    const input = `---
title: "Document 1"
---
title: "Document 2"`;
    const strategy = new YamlTranslationStrategy();
    const parsed = await strategy.parse(input);
    expect(parsed.translatableContent.get('doc0.title').content).toBe('Document 1');
    expect(parsed.translatableContent.get('doc1.title').content).toBe('Document 2');
  });
  
  it('should skip environment variables', async () => {
    const input = `
database_url: ${DATABASE_URL}
api_key: $API_KEY
app_name: "My Application"
    `;
    const strategy = new YamlTranslationStrategy();
    const parsed = await strategy.parse(input);
    expect(parsed.translatableContent.has('database_url')).toBe(false);
    expect(parsed.translatableContent.has('api_key')).toBe(false);
    expect(parsed.translatableContent.has('app_name')).toBe(true);
  });
});
```

#### HTML Tests
```typescript
describe('HtmlTranslationStrategy', () => {
  it('should translate alt attributes', async () => {
    const input = '<img src="logo.png" alt="Company Logo">';
    const strategy = new HtmlTranslationStrategy();
    const parsed = await strategy.parse(input);
    expect(parsed.translatableContent.values())
      .toContainEqual(expect.objectContaining({
        type: 'attribute',
        content: 'Company Logo',
        attributeName: 'alt'
      }));
  });
  
  it('should skip script tags', async () => {
    const input = '<script>console.log("Hello World");</script><p>Text</p>';
    const strategy = new HtmlTranslationStrategy();
    const parsed = await strategy.parse(input);
    const contents = Array.from(parsed.translatableContent.values())
      .map(node => node.content);
    expect(contents).not.toContain('console.log("Hello World");');
    expect(contents).toContain('Text');
  });
  
  it('should handle meta tags', async () => {
    const input = '<meta name="description" content="Site description">';
    const strategy = new HtmlTranslationStrategy();
    const parsed = await strategy.parse(input);
    expect(parsed.translatableContent.get('meta.description').content)
      .toBe('Site description');
  });
  
  it('should preserve HTML entities', async () => {
    const input = '<p>Copyright &copy; 2024 &amp; beyond</p>';
    const strategy = new HtmlTranslationStrategy();
    const parsed = await strategy.parse(input);
    const result = await strategy.reconstruct(new Map(), parsed.metadata);
    expect(result).toContain('&copy;');
    expect(result).toContain('&amp;');
  });
});
```

#### CSV Tests
```typescript
describe('CsvTranslationStrategy', () => {
  it('should auto-detect delimiter', async () => {
    const inputs = [
      'name,description\nItem1,Description1',
      'name\tdescription\nItem1\tDescription1',
      'name;description\nItem1;Description1'
    ];
    
    const strategy = new CsvTranslationStrategy();
    for (const input of inputs) {
      const parsed = await strategy.parse(input);
      expect(parsed.translatableContent.size).toBeGreaterThan(0);
    }
  });
  
  it('should auto-detect translatable columns', async () => {
    const input = `id,name,description,price,stock
1,Product A,Great product,19.99,100
2,Product B,Another product,29.99,50`;
    
    const strategy = new CsvTranslationStrategy();
    const parsed = await strategy.parse(input);
    const keys = Array.from(parsed.translatableContent.keys());
    
    expect(keys.some(k => k.includes('col_name'))).toBe(true);
    expect(keys.some(k => k.includes('col_description'))).toBe(true);
    expect(keys.some(k => k.includes('col_price'))).toBe(false);
    expect(keys.some(k => k.includes('col_stock'))).toBe(false);
  });
  
  it('should handle quoted values with commas', async () => {
    const input = 'title,description\n"Hello, World","A greeting, indeed"';
    const strategy = new CsvTranslationStrategy();
    const parsed = await strategy.parse(input);
    expect(parsed.translatableContent.get('row_0_col_title').content)
      .toBe('Hello, World');
  });
});
```

#### XML Tests
```typescript
describe('XmlTranslationStrategy', () => {
  it('should handle Android strings.xml', async () => {
    const input = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My App</string>
    <string name="greeting">Hello, %s!</string>
    <string name="api_key" translatable="false">abc123</string>
</resources>`;
    
    const strategy = new XmlTranslationStrategy();
    const parsed = await strategy.parse(input);
    
    expect(parsed.translatableContent.has('string.app_name')).toBe(true);
    expect(parsed.translatableContent.has('string.greeting')).toBe(true);
    expect(parsed.translatableContent.has('string.api_key')).toBe(false);
  });
  
  it('should handle SVG text elements', async () => {
    const input = `<svg>
      <text x="10" y="20">Label Text</text>
      <title>Chart Title</title>
      <desc>Chart Description</desc>
    </svg>`;
    
    const strategy = new XmlTranslationStrategy();
    const parsed = await strategy.parse(input);
    
    expect(parsed.translatableContent.get('text[0]').content).toBe('Label Text');
    expect(parsed.translatableContent.get('title[0]').content).toBe('Chart Title');
    expect(parsed.translatableContent.get('desc[0]').content).toBe('Chart Description');
  });
  
  it('should preserve CDATA sections', async () => {
    const input = `<root>
      <description><![CDATA[Text with <html> tags]]></description>
    </root>`;
    
    const strategy = new XmlTranslationStrategy();
    const parsed = await strategy.parse(input);
    const result = await strategy.reconstruct(new Map(), parsed.metadata);
    expect(result).toContain('<![CDATA[');
  });
});
```

#### JavaScript/JSX Tests
```typescript
describe('JavaScriptTranslationStrategy', () => {
  it('should translate JSDoc comments', async () => {
    const input = `
/**
 * Calculates the sum of two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The sum
 */
function add(a, b) { return a + b; }
    `;
    
    const strategy = new JavaScriptTranslationStrategy();
    const parsed = await strategy.parse(input);
    const jsdocContent = Array.from(parsed.translatableContent.values())
      .find(node => node.type === 'jsdoc');
    expect(jsdocContent?.content).toBe('Calculates the sum of two numbers');
  });
  
  it('should translate JSX text content', async () => {
    const input = '<Button>Click me</Button>';
    const strategy = new JavaScriptTranslationStrategy();
    const parsed = await strategy.parse(input);
    const jsxText = Array.from(parsed.translatableContent.values())
      .find(node => node.type === 'jsx-text');
    expect(jsxText?.content).toBe('Click me');
  });
  
  it('should detect i18n objects', async () => {
    const input = `
const translations = {
  en: {
    greeting: "Hello",
    farewell: "Goodbye"
  }
};
    `;
    
    const strategy = new JavaScriptTranslationStrategy();
    const parsed = await strategy.parse(input);
    const contents = Array.from(parsed.translatableContent.values())
      .map(node => node.content);
    expect(contents).toContain('Hello');
    expect(contents).toContain('Goodbye');
  });
  
  it('should skip import paths', async () => {
    const input = `
import Component from './components/Component';
import { helper } from '../utils/helper';
const message = "User message";
    `;
    
    const strategy = new JavaScriptTranslationStrategy();
    const parsed = await strategy.parse(input);
    const contents = Array.from(parsed.translatableContent.values())
      .map(node => node.content);
    expect(contents).not.toContain('./components/Component');
    expect(contents).not.toContain('../utils/helper');
    expect(contents).toContain('User message');
  });
  
  it('should handle template literals', async () => {
    const input = 'const msg = `Hello ${name}, welcome!`;';
    const strategy = new JavaScriptTranslationStrategy();
    const parsed = await strategy.parse(input);
    const template = Array.from(parsed.translatableContent.values())
      .find(node => node.type === 'template');
    expect(template?.content).toContain('Hello');
    expect(template?.hasInterpolations).toBe(true);
  });
});
```

## Error Handling Strategy

### Parse Errors
```typescript
class FormatParseError extends Error {
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

class TranslationStrategy {
  protected handleParseError(error: Error, file: string): never {
    if (error.message.includes('JSON')) {
      const match = error.message.match(/position (\d+)/);
      const position = match ? parseInt(match[1]) : undefined;
      throw new FormatParseError('JSON', file, undefined, position, error);
    }
    
    throw new FormatParseError(this.format, file, undefined, undefined, error);
  }
}
```

### Recovery Mechanisms
```typescript
export class ErrorRecovery {
  static async tryRecover(error: FormatParseError, content: string): Promise<string | null> {
    switch (error.format) {
      case 'JSON':
        return this.tryFixJson(content, error);
      case 'YAML':
        return this.tryFixYaml(content, error);
      case 'HTML':
        return this.tryFixHtml(content, error);
      default:
        return null;
    }
  }
  
  private static tryFixJson(content: string, error: FormatParseError): string | null {
    // Try to fix common JSON errors
    let fixed = content;
    
    // Fix trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix single quotes
    fixed = fixed.replace(/'/g, '"');
    
    // Try to parse again
    try {
      JSON.parse(fixed);
      return fixed;
    } catch {
      return null;
    }
  }
  
  private static tryFixYaml(content: string, error: FormatParseError): string | null {
    // Fix common YAML issues
    let fixed = content;
    
    // Fix tabs (YAML doesn't allow tabs)
    fixed = fixed.replace(/\t/g, '  ');
    
    // Fix inconsistent indentation
    const lines = fixed.split('\n');
    const indentSize = this.detectIndentSize(lines);
    fixed = lines.map(line => {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const spaces = Math.floor(indent.length / indentSize) * indentSize;
      return ' '.repeat(spaces) + line.trim();
    }).join('\n');
    
    return fixed;
  }
}
```

### User Feedback
```typescript
export class ErrorReporter {
  static report(error: FormatParseError): void {
    console.error(`
❌ Failed to parse ${error.format} file

File: ${error.file}
${error.line ? `Line: ${error.line}` : ''}
${error.column ? `Column: ${error.column}` : ''}

This usually means the file has invalid ${error.format} syntax.
Please check the file and try again.

Tip: You can validate ${error.format} files using:
${this.getValidationCommand(error.format)}

Common issues:
${this.getCommonIssues(error.format)}
    `);
  }
  
  private static getValidationCommand(format: string): string {
    const commands = {
      JSON: 'npx jsonlint file.json',
      YAML: 'npx yaml-validator file.yaml',
      HTML: 'npx html-validate file.html',
      XML: 'xmllint --noout file.xml',
      JavaScript: 'npx eslint file.js',
      CSV: 'npx csv-validator file.csv'
    };
    return commands[format] || 'Check documentation for validation tools';
  }
  
  private static getCommonIssues(format: string): string {
    const issues = {
      JSON: '• Trailing commas\n• Single quotes instead of double\n• Missing quotes around keys',
      YAML: '• Tabs instead of spaces\n• Inconsistent indentation\n• Missing colons',
      HTML: '• Unclosed tags\n• Invalid nesting\n• Unescaped special characters',
      XML: '• Missing closing tags\n• Invalid characters\n• Namespace issues',
      JavaScript: '• Syntax errors\n• Unterminated strings\n• Invalid JSX',
      CSV: '• Inconsistent column count\n• Unescaped quotes\n• Invalid delimiters'
    };
    return issues[format] || 'Check format-specific documentation';
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Day 1-2)
- [ ] Create TranslationStrategy interface in src/core/strategies/base.ts
- [ ] Set up format detection system in src/core/formats/detector.ts
- [ ] Update configuration schema to support format-specific options
- [ ] Create comprehensive test framework for format validation

### Phase 2: Data Format Parsers (Day 3-5)
- [ ] JSON Parser Implementation
  - [ ] Implement recursive traversal with type detection
  - [ ] Add smart string detection (skip UUIDs, URLs, etc.)
  - [ ] Create tests for nested objects, arrays, edge cases
  - [ ] Validate output maintains valid JSON syntax
  
- [ ] YAML Parser Implementation  
  - [ ] Integrate js-yaml for parsing/serialization
  - [ ] Preserve comments, anchors, and references
  - [ ] Handle multi-document YAML files
  - [ ] Test complex structures and indentation preservation

### Phase 3: Web Format Parsers (Day 6-8)
- [ ] HTML Parser Implementation
  - [ ] Integrate parse5 for DOM manipulation
  - [ ] Configure translatable attributes via idioma.json
  - [ ] Skip script/style tags, preserve entities
  - [ ] Test with various HTML5 elements and structures
  
- [ ] XML Parser Implementation
  - [ ] Use xmldom for parsing with namespace support
  - [ ] Handle CDATA sections and processing instructions
  - [ ] Implement configurable element/attribute selection
  - [ ] Validate against sample XML schemas

### Phase 4: Structured Data Parser (Day 9)
- [ ] CSV Parser Implementation
  - [ ] Integrate csv-parse for robust parsing
  - [ ] Add column selection via configuration
  - [ ] Preserve delimiters, quotes, escaping
  - [ ] Test with various CSV formats and encodings

### Phase 5: Code Parsers (Day 10-12)
- [ ] JavaScript/TypeScript/JSX Parser Implementation
  - [ ] Set up Babel with all necessary plugins
  - [ ] Parse and preserve JSDoc comments
  - [ ] Detect string literals vs template literals
  - [ ] Handle JSX text content and attributes
  - [ ] Skip import paths, variable names, etc.
  - [ ] Test with real-world code samples

### Phase 6: Integration & Testing (Day 13-14)
- [ ] Update CLI to support new format commands
- [ ] Create format-specific configuration examples
- [ ] Write comprehensive integration tests
- [ ] Performance testing with large files
- [ ] Update documentation with examples

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Format parsing errors | High | Extensive test suite, graceful degradation, clear error messages |
| Performance issues with large files | Medium | Streaming parsers, chunking, memory limits |
| Edge case handling | Medium | Comprehensive test coverage, community feedback |
| Breaking existing functionality | High | Feature flags, extensive regression testing |
| Configuration complexity | Medium | Smart defaults, validation, examples |

## Success Metrics

### Technical Metrics
- All 7 formats fully supported with 100% test coverage
- Zero regression in existing MDX functionality
- <1% false positive rate in translatable content detection
- 100% format validity after translation (no syntax errors)
- All formats configurable via idioma.json only

### Quality Metrics
- Zero data loss during translation
- Consistent formatting preservation across all files
- Accurate technical content detection (URLs, IDs, etc. untranslated)
- Proper handling of edge cases (empty files, malformed content)
- Clear error messages with actionable solutions

### Adoption Metrics
- 50% of users adopt at least one new format within first month
- 80% success rate on first translation attempt
- Documentation clarity (measured by reduced support questions)
- Time to first successful translation <5 minutes for new formats

## Configuration Examples

### Complete idioma.json with All Formats
```json
{
  "projectId": "prj_xxxxxxxxxxxxxxxxxxxx",
  "locale": {
    "source": "en",
    "targets": ["es", "fr", "de", "ja"]
  },
  "files": {
    "mdx": {
      "include": ["content/**/*.mdx"]
    },
    "json": {
      "include": ["locales/**/*.json"],
      "exclude": ["**/package.json", "**/tsconfig.json"]
    },
    "yaml": {
      "include": ["config/**/*.yaml", "**/*.yml"],
      "preserveComments": true
    },
    "html": {
      "include": ["templates/**/*.html"],
      "translatableAttributes": ["alt", "title", "placeholder", "aria-label"]
    },
    "csv": {
      "include": ["data/**/*.csv"],
      "columns": ["description", "label", "message"],
      "skipHeader": false
    },
    "xml": {
      "include": ["resources/**/*.xml"],
      "translatableElements": ["string", "description", "title"],
      "preserveNamespaces": true
    },
    "javascript": {
      "include": ["src/**/*.{js,ts,jsx,tsx}"],
      "translateJSDoc": true,
      "translateComments": false,
      "translateStringLiterals": true
    }
  },
  "translation": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20240620",
    "skipPatterns": [
      "^[A-Z_]+$",           // Constants
      "^[a-f0-9-]{36}$",     // UUIDs
      "^https?://",          // URLs
      "^[\\w.-]+@[\\w.-]+$", // Emails
      "^#[0-9A-Fa-f]{6}$"    // Hex colors
    ]
  }
}
```

## Conclusion

This focused enhancement to support 7 new file formats transforms Idioma from an MDX-specific tool into a comprehensive translation solution for modern development workflows. By maintaining strict format preservation, implementing intelligent content detection, and ensuring configuration simplicity, we deliver immediate value while maintaining our core promise of being 90% cheaper than SaaS alternatives.