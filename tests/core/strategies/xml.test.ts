import { describe, expect, it } from 'bun:test';
import { XmlStrategy } from '../../../src/strategies/xml';

describe('XmlStrategy', () => {
  describe('parse', () => {
    it('should parse simple XML with text content', async () => {
      const strategy = new XmlStrategy();
      const input = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <title>Test Title</title>
  <description>This is a description</description>
  <item>
    <name>Item Name</name>
    <value>123</value>
  </item>
</root>`;
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('root.title[0]._text')?.value).toBe('Test Title');
      expect(result.translatableContent.get('root.description[0]._text')?.value).toBe('This is a description');
      expect(result.translatableContent.get('root.item[0].name[0]._text')?.value).toBe('Item Name');
      // Should skip pure numbers
      expect(result.translatableContent.has('root.item[0].value[0]._text')).toBe(false);
    });

    it('should extract translatable attributes', async () => {
      const strategy = new XmlStrategy();
      const input = `<?xml version="1.0"?>
<root>
  <button label="Click me" tooltip="This is a button">
    <text>Button Text</text>
  </button>
  <field title="Input Field" description="Enter your data here"/>
</root>`;
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('root.button[0].@label')?.value).toBe('Click me');
      expect(result.translatableContent.get('root.button[0].@tooltip')?.value).toBe('This is a button');
      expect(result.translatableContent.get('root.button[0].text[0]._text')?.value).toBe('Button Text');
      expect(result.translatableContent.get('root.field[0].@title')?.value).toBe('Input Field');
      expect(result.translatableContent.get('root.field[0].@description')?.value).toBe('Enter your data here');
    });

    it('should handle CDATA sections', async () => {
      const strategy = new XmlStrategy();
      const input = `<?xml version="1.0"?>
<root>
  <content><![CDATA[This is CDATA content with <special> characters]]></content>
  <code><![CDATA[function() { return "code"; }]]></code>
</root>`;
      
      const result = await strategy.parse(input);
      
      // CDATA is parsed as regular text content by xml2js
      const cdataContent = Array.from(result.translatableContent.entries())
        .find(([key]) => key.includes('content') && key.includes('_text'));
      expect(cdataContent?.[1].value).toBe('This is CDATA content with <special> characters');
      
      // Code in CDATA should be skipped as it looks like code
      const codeContent = Array.from(result.translatableContent.entries())
        .find(([key]) => key.includes('code') && key.includes('_text'));
      expect(codeContent).toBeUndefined();
    });

    it('should handle arrays of elements', async () => {
      const strategy = new XmlStrategy();
      const input = `<?xml version="1.0"?>
<root>
  <items>
    <item>First Item</item>
    <item>Second Item</item>
    <item>Third Item</item>
  </items>
</root>`;
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('root.items[0].item[0]._text')?.value).toBe('First Item');
      expect(result.translatableContent.get('root.items[0].item[1]._text')?.value).toBe('Second Item');
      expect(result.translatableContent.get('root.items[0].item[2]._text')?.value).toBe('Third Item');
    });

    it('should handle nested XML structures', async () => {
      const strategy = new XmlStrategy();
      const input = `<?xml version="1.0"?>
<catalog>
  <category name="Electronics">
    <product>
      <name>Laptop</name>
      <description>High-performance laptop</description>
      <specs>
        <cpu>Intel i7</cpu>
        <ram>16GB</ram>
      </specs>
    </product>
  </category>
</catalog>`;
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('catalog.category[0].product[0].name[0]._text')?.value)
        .toBe('Laptop');
      expect(result.translatableContent.get('catalog.category[0].product[0].description[0]._text')?.value)
        .toBe('High-performance laptop');
      expect(result.translatableContent.get('catalog.category[0].product[0].specs[0].cpu[0]._text')?.value)
        .toBe('Intel i7');
      // "16GB" is correctly skipped as a technical specification
      expect(result.translatableContent.has('catalog.category[0].product[0].specs[0].ram[0]._text'))
        .toBe(false);
    });

    it('should skip non-translatable values', async () => {
      const strategy = new XmlStrategy();
      const input = `<?xml version="1.0"?>
<config>
  <setting name="debug">true</setting>
  <setting name="port">8080</setting>
  <setting name="apiKey">ABC_123</setting>
  <setting name="message">Welcome message</setting>
  <url>https://example.com</url>
</config>`;
      
      const result = await strategy.parse(input);
      
      // Should skip technical values
      expect(result.translatableContent.has('config.setting[0]._text')).toBe(false); // "true"
      expect(result.translatableContent.has('config.setting[1]._text')).toBe(false); // "8080"
      expect(result.translatableContent.has('config.setting[2]._text')).toBe(false); // "ABC_123"
      expect(result.translatableContent.has('config.url._text')).toBe(false); // URL
      
      // Should include translatable message
      const hasWelcome = Array.from(result.translatableContent.values())
        .some(node => node.value === 'Welcome message');
      expect(hasWelcome).toBe(true);
    });

    it('should detect XML metadata', async () => {
      const strategy = new XmlStrategy();
      const input = `<?xml version="1.0" encoding="ISO-8859-1"?>
<root xmlns="http://example.com/ns">
  <data><![CDATA[test]]></data>
</root>`;
      
      const result = await strategy.parse(input);
      
      expect(result.metadata.xmlMetadata.hasXmlDeclaration).toBe(true);
      expect(result.metadata.xmlMetadata.encoding).toBe('ISO-8859-1');
      expect(result.metadata.xmlMetadata.rootElement).toBe('root');
      expect(result.metadata.xmlMetadata.hasCDATA).toBe(true);
      expect(result.metadata.xmlMetadata.hasNamespaces).toBe(true);
    });

    it('should respect includePaths config', async () => {
      const strategy = new XmlStrategy({
        includePaths: ['root.content', 'root.metadata']
      });
      
      const input = `<?xml version="1.0"?>
<root>
  <content>
    <title>Include this</title>
    <description>Also include this</description>
  </content>
  <metadata>
    <author>Include author</author>
  </metadata>
  <config>
    <setting>Should be excluded</setting>
  </config>
</root>`;
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.has('root.content[0].title[0]._text')).toBe(true);
      expect(result.translatableContent.has('root.content[0].description[0]._text')).toBe(true);
      expect(result.translatableContent.has('root.metadata[0].author[0]._text')).toBe(true);
      expect(result.translatableContent.has('root.config[0].setting[0]._text')).toBe(false);
    });

    it('should respect excludePaths config', async () => {
      const strategy = new XmlStrategy({
        excludePaths: ['root.internal', 'root.debug']
      });
      
      const input = `<?xml version="1.0"?>
<root>
  <public>
    <message>Public message</message>
  </public>
  <internal>
    <secret>Should be excluded</secret>
  </internal>
  <debug>
    <log>Debug log excluded</log>
  </debug>
</root>`;
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.has('root.public[0].message[0]._text')).toBe(true);
      expect(result.translatableContent.has('root.internal[0].secret[0]._text')).toBe(false);
      expect(result.translatableContent.has('root.debug[0].log[0]._text')).toBe(false);
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct XML with translations', async () => {
      const strategy = new XmlStrategy();
      const input = `<?xml version="1.0"?>
<root>
  <greeting>Hello</greeting>
  <farewell>Goodbye</farewell>
</root>`;
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['root.greeting[0]._text', 'Hola'],
        ['root.farewell[0]._text', 'Adiós']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      
      expect(result).toContain('<greeting>Hola</greeting>');
      expect(result).toContain('<farewell>Adiós</farewell>');
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('should reconstruct attributes', async () => {
      const strategy = new XmlStrategy();
      const input = `<?xml version="1.0"?>
<root>
  <button label="Submit" title="Click to submit"/>
</root>`;
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['root.button[0].@label', 'Enviar'],
        ['root.button[0].@title', 'Haga clic para enviar']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      
      expect(result).toContain('label="Enviar"');
      expect(result).toContain('title="Haga clic para enviar"');
    });

    it('should handle arrays in reconstruction', async () => {
      const strategy = new XmlStrategy();
      const input = `<?xml version="1.0"?>
<root>
  <list>
    <item>First</item>
    <item>Second</item>
  </list>
</root>`;
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['root.list[0].item[0]._text', 'Primero'],
        ['root.list[0].item[1]._text', 'Segundo']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      
      expect(result).toContain('<item>Primero</item>');
      expect(result).toContain('<item>Segundo</item>');
    });

    it('should preserve XML structure and formatting', async () => {
      const strategy = new XmlStrategy();
      const input = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <nested>
    <deep>
      <element>Text</element>
    </deep>
  </nested>
</root>`;
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['root.nested[0].deep[0].element[0]._text', 'Texto']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      
      // Check structure is preserved
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<root>');
      expect(result).toContain('<nested>');
      expect(result).toContain('<deep>');
      expect(result).toContain('<element>Texto</element>');
      expect(result).toContain('</deep>');
      expect(result).toContain('</nested>');
      expect(result).toContain('</root>');
    });
  });

  describe('validate', () => {
    it('should validate correct XML', () => {
      const strategy = new XmlStrategy();
      
      const result = strategy.validate('<?xml version="1.0"?><root><child>Valid XML</child></root>');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should detect invalid XML', () => {
      const strategy = new XmlStrategy();
      
      const result = strategy.validate('<root><unclosed></root>');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Invalid XML');
    });

    it('should detect mismatched tags', () => {
      const strategy = new XmlStrategy();
      
      const result = strategy.validate('<root><child></parent></root>');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate XML without declaration', () => {
      const strategy = new XmlStrategy();
      
      const result = strategy.validate('<root><child>Content</child></root>');
      
      expect(result.valid).toBe(true);
    });
  });

  describe('canHandle', () => {
    it('should handle .xml files', () => {
      const strategy = new XmlStrategy();
      
      expect(strategy.canHandle('data.xml')).toBe(true);
      expect(strategy.canHandle('/path/to/file.xml')).toBe(true);
      expect(strategy.canHandle('config.xml')).toBe(true);
    });

    it('should not handle non-xml files', () => {
      const strategy = new XmlStrategy();
      
      expect(strategy.canHandle('data.html')).toBe(false);
      expect(strategy.canHandle('file.json')).toBe(false);
      expect(strategy.canHandle('script.js')).toBe(false);
    });
  });
});