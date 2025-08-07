import { describe, expect, it, beforeEach } from 'bun:test';
import { FormatDetector } from '../../../src/core/formats/detector';
import type { TranslationStrategy } from '../../../src/core/strategies/base';

class MockStrategy implements TranslationStrategy {
  constructor(private extension: string) {}
  
  canHandle(filePath: string): boolean {
    return filePath.endsWith(this.extension);
  }
  
  async parse(content: string): Promise<any> {
    return { translatableContent: new Map(), metadata: {} };
  }
  
  async reconstruct(translations: Map<string, string>, metadata: any): Promise<string> {
    return '';
  }
  
  validate(content: string): any {
    return { valid: true };
  }
}

describe('FormatDetector', () => {
  let detector: FormatDetector;

  beforeEach(() => {
    detector = new FormatDetector();
  });

  describe('register and detect', () => {
    it('should register and detect custom strategies', () => {
      const jsonStrategy = new MockStrategy('.json');
      detector.register('.json', jsonStrategy);
      
      const detected = detector.detectFormat('test.json');
      expect(detected).toBe(jsonStrategy);
    });

    it('should handle case-insensitive extensions', () => {
      const strategy = new MockStrategy('.json');
      detector.register('.JSON', strategy);
      
      expect(detector.detectFormat('test.json')).toBe(strategy);
      expect(detector.detectFormat('test.JSON')).toBe(strategy);
    });

    it('should return null for unknown extensions', () => {
      expect(detector.detectFormat('test.unknown')).toBeNull();
    });

    it('should handle files without extensions', () => {
      expect(detector.detectFormat('README')).toBeNull();
    });
  });

  describe('content detection', () => {
    it('should detect JSON from content', async () => {
      const jsonStrategy = new MockStrategy('.json');
      detector.register('.json', jsonStrategy);
      
      const detected = await detector.detectFromContent('{"key": "value"}');
      expect(detected).toBe(jsonStrategy);
    });

    it('should detect JSON arrays', async () => {
      const jsonStrategy = new MockStrategy('.json');
      detector.register('.json', jsonStrategy);
      
      const detected = await detector.detectFromContent('[1, 2, 3]');
      expect(detected).toBe(jsonStrategy);
    });

    it('should detect YAML from content', async () => {
      const yamlStrategy = new MockStrategy('.yaml');
      detector.register('.yaml', yamlStrategy);
      
      const detected = await detector.detectFromContent('key: value\nother: test');
      expect(detected).toBe(yamlStrategy);
    });

    it('should detect YAML with front matter', async () => {
      const yamlStrategy = new MockStrategy('.yaml');
      detector.register('.yaml', yamlStrategy);
      
      const detected = await detector.detectFromContent('---\ntitle: Test\n---');
      expect(detected).toBe(yamlStrategy);
    });

    it('should detect HTML from content', async () => {
      const htmlStrategy = new MockStrategy('.html');
      detector.register('.html', htmlStrategy);
      
      const detected = await detector.detectFromContent('<html><body>Test</body></html>');
      expect(detected).toBe(htmlStrategy);
    });

    it('should detect HTML with DOCTYPE', async () => {
      const htmlStrategy = new MockStrategy('.html');
      detector.register('.html', htmlStrategy);
      
      const detected = await detector.detectFromContent('<!DOCTYPE html>\n<html>');
      expect(detected).toBe(htmlStrategy);
    });

    it('should detect XML from content', async () => {
      const xmlStrategy = new MockStrategy('.xml');
      detector.register('.xml', xmlStrategy);
      
      const detected = await detector.detectFromContent('<?xml version="1.0"?>\n<root>');
      expect(detected).toBe(xmlStrategy);
    });

    it('should detect CSV from content', async () => {
      const csvStrategy = new MockStrategy('.csv');
      detector.register('.csv', csvStrategy);
      
      const detected = await detector.detectFromContent('name,age,city\nJohn,30,NYC');
      expect(detected).toBe(csvStrategy);
    });

    it('should detect JavaScript from content', async () => {
      const jsStrategy = new MockStrategy('.js');
      detector.register('.js', jsStrategy);
      
      const detected = await detector.detectFromContent('const x = 42;');
      expect(detected).toBe(jsStrategy);
    });

    it('should detect JavaScript imports', async () => {
      const jsStrategy = new MockStrategy('.js');
      detector.register('.js', jsStrategy);
      
      const detected = await detector.detectFromContent("import { test } from './module';");
      expect(detected).toBe(jsStrategy);
    });

    it('should return null for unrecognized content', async () => {
      const detected = await detector.detectFromContent('Some random text');
      expect(detected).toBeNull();
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return all registered extensions', () => {
      detector.register('.json', new MockStrategy('.json'));
      detector.register('.yaml', new MockStrategy('.yaml'));
      detector.register('.xml', new MockStrategy('.xml'));
      
      const extensions = detector.getSupportedExtensions();
      expect(extensions).toContain('.json');
      expect(extensions).toContain('.yaml');
      expect(extensions).toContain('.xml');
    });

    it('should return empty array when no strategies registered', () => {
      expect(detector.getSupportedExtensions()).toEqual([]);
    });
  });

  describe('getStrategyForExtension', () => {
    it('should return strategy for registered extension', () => {
      const strategy = new MockStrategy('.json');
      detector.register('.json', strategy);
      
      expect(detector.getStrategyForExtension('.json')).toBe(strategy);
    });

    it('should return null for unregistered extension', () => {
      expect(detector.getStrategyForExtension('.unknown')).toBeNull();
    });

    it('should be case-insensitive', () => {
      const strategy = new MockStrategy('.json');
      detector.register('.json', strategy);
      
      expect(detector.getStrategyForExtension('.JSON')).toBe(strategy);
    });
  });
});