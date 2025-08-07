import { describe, expect, it } from 'bun:test';
import { JsonStrategy } from '../../../src/strategies/json';

describe('JsonStrategy', () => {
  describe('parse', () => {
    it('should parse simple JSON object', async () => {
      const strategy = new JsonStrategy();
      const input = '{"title": "Hello World", "description": "A test"}';
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.size).toBe(2);
      expect(result.translatableContent.get('title')?.value).toBe('Hello World');
      expect(result.translatableContent.get('description')?.value).toBe('A test');
    });

    it('should handle nested objects', async () => {
      const strategy = new JsonStrategy();
      const input = JSON.stringify({
        menu: {
          title: 'File',
          items: {
            open: 'Open File',
            save: 'Save File'
          }
        }
      });
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('menu.title')?.value).toBe('File');
      expect(result.translatableContent.get('menu.items.open')?.value).toBe('Open File');
      expect(result.translatableContent.get('menu.items.save')?.value).toBe('Save File');
    });

    it('should handle arrays of strings', async () => {
      const strategy = new JsonStrategy();
      const input = JSON.stringify({
        labels: ['First', 'Second', 'Third']
      });
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('labels[0]')?.value).toBe('First');
      expect(result.translatableContent.get('labels[1]')?.value).toBe('Second');
      expect(result.translatableContent.get('labels[2]')?.value).toBe('Third');
    });

    it('should handle arrays of objects', async () => {
      const strategy = new JsonStrategy();
      const input = JSON.stringify({
        items: [
          { name: 'Item 1', description: 'First item' },
          { name: 'Item 2', description: 'Second item' }
        ]
      });
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('items.[0].name')?.value).toBe('Item 1');
      expect(result.translatableContent.get('items.[0].description')?.value).toBe('First item');
      expect(result.translatableContent.get('items.[1].name')?.value).toBe('Item 2');
    });

    it('should skip non-translatable strings', async () => {
      const strategy = new JsonStrategy();
      const input = JSON.stringify({
        id: '550e8400-e29b-41d4-a716-446655440000', // UUID
        url: 'https://example.com', // URL
        email: 'test@example.com', // Email
        hex: '#FF5733', // Hex color
        constant: 'API_KEY', // Constant
        camelCase: 'myVariableName', // camelCase identifier
        title: 'This is translatable' // Translatable
      });
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.has('id')).toBe(false);
      expect(result.translatableContent.has('url')).toBe(false);
      expect(result.translatableContent.has('email')).toBe(false);
      expect(result.translatableContent.has('hex')).toBe(false);
      expect(result.translatableContent.has('constant')).toBe(false);
      expect(result.translatableContent.has('camelCase')).toBe(false);
      expect(result.translatableContent.has('title')).toBe(true);
    });

    it('should skip technical keys', async () => {
      const strategy = new JsonStrategy();
      const input = JSON.stringify({
        api_key: 'some value',
        user_token: 'token123',
        uuid: 'unique-id',
        created_at: '2024-01-01',
        message: 'User message'
      });
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.has('api_key')).toBe(false);
      expect(result.translatableContent.has('user_token')).toBe(false);
      expect(result.translatableContent.has('uuid')).toBe(false);
      expect(result.translatableContent.has('created_at')).toBe(false);
      expect(result.translatableContent.has('message')).toBe(true);
    });

    it('should handle empty strings based on config', async () => {
      const strategySkip = new JsonStrategy({ skipEmptyStrings: true });
      const strategyInclude = new JsonStrategy({ skipEmptyStrings: false });
      
      const input = JSON.stringify({
        empty: '',
        whitespace: '   ',
        content: 'Has content'
      });
      
      const resultSkip = await strategySkip.parse(input);
      const resultInclude = await strategyInclude.parse(input);
      
      expect(resultSkip.translatableContent.has('empty')).toBe(false);
      expect(resultSkip.translatableContent.has('whitespace')).toBe(false);
      expect(resultSkip.translatableContent.has('content')).toBe(true);
      
      expect(resultInclude.translatableContent.has('empty')).toBe(false); // Empty strings are never translatable
      expect(resultInclude.translatableContent.has('content')).toBe(true);
    });

    it('should respect includePaths config', async () => {
      const strategy = new JsonStrategy({
        includePaths: ['ui.labels', 'messages']
      });
      
      const input = JSON.stringify({
        ui: {
          labels: {
            title: 'Title',
            button: 'Click me'
          },
          config: {
            theme: 'dark'
          }
        },
        messages: {
          error: 'Error occurred'
        },
        data: {
          value: 'Should be excluded'
        }
      });
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.has('ui.labels.title')).toBe(true);
      expect(result.translatableContent.has('ui.labels.button')).toBe(true);
      expect(result.translatableContent.has('ui.config.theme')).toBe(false);
      expect(result.translatableContent.has('messages.error')).toBe(true);
      expect(result.translatableContent.has('data.value')).toBe(false);
    });

    it('should respect excludePaths config', async () => {
      const strategy = new JsonStrategy({
        excludePaths: ['config', 'internal.debug']
      });
      
      const input = JSON.stringify({
        title: 'App Title',
        config: {
          apiKey: 'key123',
          setting: 'value'
        },
        internal: {
          debug: {
            message: 'Debug message'
          },
          label: 'Internal label'
        }
      });
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.has('title')).toBe(true);
      expect(result.translatableContent.has('config.apiKey')).toBe(false);
      expect(result.translatableContent.has('config.setting')).toBe(false);
      expect(result.translatableContent.has('internal.debug.message')).toBe(false);
      expect(result.translatableContent.has('internal.label')).toBe(true);
    });

    it('should detect formatting style', async () => {
      const strategy = new JsonStrategy();
      
      const minified = '{"title":"Test","description":"Desc"}';
      const pretty = `{
  "title": "Test",
  "description": "Desc"
}`;
      
      const resultMinified = await strategy.parse(minified);
      const resultPretty = await strategy.parse(pretty);
      
      expect(resultMinified.metadata.hasNewlines).toBe(false);
      expect(resultPretty.metadata.hasNewlines).toBe(true);
      expect(resultPretty.metadata.indentSize).toBe(2);
    });

    it('should handle null and undefined values', async () => {
      const strategy = new JsonStrategy();
      const input = JSON.stringify({
        nullValue: null,
        stringValue: 'Test',
        numberValue: 42,
        boolValue: true
      });
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.size).toBe(1);
      expect(result.translatableContent.has('stringValue')).toBe(true);
    });

    it('should handle deep nesting', async () => {
      const strategy = new JsonStrategy();
      const input = JSON.stringify({
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  message: 'Deep message'
                }
              }
            }
          }
        }
      });
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('level1.level2.level3.level4.level5.message')?.value)
        .toBe('Deep message');
    });

    it('should throw on depth limit exceeded', async () => {
      const strategy = new JsonStrategy();
      
      // Create deeply nested object (101 levels)
      let obj: any = { message: 'Bottom' };
      for (let i = 0; i < 101; i++) {
        obj = { nested: obj };
      }
      
      const input = JSON.stringify(obj);
      
      await expect(strategy.parse(input)).rejects.toThrow('JSON depth limit exceeded');
    });

    it('should throw on invalid JSON', async () => {
      const strategy = new JsonStrategy();
      const input = '{ invalid json }';
      
      await expect(strategy.parse(input)).rejects.toThrow('Failed to parse JSON');
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct simple object with translations', async () => {
      const strategy = new JsonStrategy();
      const input = '{"title": "Hello", "description": "World"}';
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['title', 'Hola'],
        ['description', 'Mundo']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      const resultObj = JSON.parse(result);
      
      expect(resultObj.title).toBe('Hola');
      expect(resultObj.description).toBe('Mundo');
    });

    it('should reconstruct nested objects', async () => {
      const strategy = new JsonStrategy();
      const input = JSON.stringify({
        menu: {
          file: {
            open: 'Open',
            save: 'Save'
          }
        }
      });
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['menu.file.open', 'Abrir'],
        ['menu.file.save', 'Guardar']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      const resultObj = JSON.parse(result);
      
      expect(resultObj.menu.file.open).toBe('Abrir');
      expect(resultObj.menu.file.save).toBe('Guardar');
    });

    it('should reconstruct arrays', async () => {
      const strategy = new JsonStrategy();
      const input = JSON.stringify({
        items: ['First', 'Second'],
        nested: [
          { name: 'Item 1' },
          { name: 'Item 2' }
        ]
      });
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['items[0]', 'Primero'],
        ['items[1]', 'Segundo'],
        ['nested.[0].name', 'Artículo 1'],
        ['nested.[1].name', 'Artículo 2']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      const resultObj = JSON.parse(result);
      
      expect(resultObj.items[0]).toBe('Primero');
      expect(resultObj.items[1]).toBe('Segundo');
      expect(resultObj.nested[0].name).toBe('Artículo 1');
      expect(resultObj.nested[1].name).toBe('Artículo 2');
    });

    it('should preserve formatting style', async () => {
      const strategy = new JsonStrategy();
      
      const minified = '{"title":"Test"}';
      const pretty = `{
  "title": "Test"
}`;
      
      const parsedMinified = await strategy.parse(minified);
      const parsedPretty = await strategy.parse(pretty);
      
      const translations = new Map([['title', 'Prueba']]);
      
      const resultMinified = await strategy.reconstruct(translations, parsedMinified.metadata);
      const resultPretty = await strategy.reconstruct(translations, parsedPretty.metadata);
      
      expect(resultMinified).not.toContain('\n');
      expect(resultPretty).toContain('\n');
      expect(resultPretty).toContain('  '); // Has indentation
    });

    it('should preserve untranslated values', async () => {
      const strategy = new JsonStrategy();
      const input = JSON.stringify({
        title: 'Hello',
        id: '123',
        count: 42,
        active: true
      });
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['title', 'Hola']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      const resultObj = JSON.parse(result);
      
      expect(resultObj.title).toBe('Hola');
      expect(resultObj.id).toBe('123');
      expect(resultObj.count).toBe(42);
      expect(resultObj.active).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate correct JSON', () => {
      const strategy = new JsonStrategy();
      
      const result = strategy.validate('{"valid": "json"}');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should detect invalid JSON', () => {
      const strategy = new JsonStrategy();
      
      const result = strategy.validate('{ invalid json }');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('JSON');
    });

    it('should detect trailing commas', () => {
      const strategy = new JsonStrategy();
      
      const result = strategy.validate('{"key": "value",}');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should detect unclosed brackets', () => {
      const strategy = new JsonStrategy();
      
      const result = strategy.validate('{"key": "value"');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('canHandle', () => {
    it('should handle .json files', () => {
      const strategy = new JsonStrategy();
      
      expect(strategy.canHandle('data.json')).toBe(true);
      expect(strategy.canHandle('/path/to/file.json')).toBe(true);
      expect(strategy.canHandle('package.json')).toBe(true);
    });

    it('should not handle non-json files', () => {
      const strategy = new JsonStrategy();
      
      expect(strategy.canHandle('data.yaml')).toBe(false);
      expect(strategy.canHandle('file.txt')).toBe(false);
      expect(strategy.canHandle('script.js')).toBe(false);
    });
  });
});