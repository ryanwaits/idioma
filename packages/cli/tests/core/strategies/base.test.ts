import { describe, expect, it } from 'bun:test';
import { BaseTranslationStrategy } from '../../../src/strategies/base';

class TestStrategy extends BaseTranslationStrategy {
  canHandle(filePath: string): boolean {
    return filePath.endsWith('.test');
  }
  
  getName(): string {
    return 'Test';
  }

  protected async parse(content: string): Promise<any> {
    return {
      translatableContent: new Map(),
      metadata: {}
    };
  }

  protected async reconstruct(translations: Map<string, string>, metadata: any): Promise<string> {
    return 'reconstructed';
  }

  validate(content: string): any {
    if (content === 'invalid') {
      return {
        valid: false,
        errors: [{ message: 'Invalid format' }]
      };
    }
    return { valid: true };
  }
}

describe('BaseTranslationStrategy', () => {
  const strategy = new TestStrategy();

  describe('isTranslatableString', () => {
    it('should skip constants', () => {
      expect(strategy['isTranslatableString']('API_KEY')).toBe(false);
      expect(strategy['isTranslatableString']('MAX_SIZE')).toBe(false);
    });

    it('should skip pure numbers', () => {
      expect(strategy['isTranslatableString']('123')).toBe(false);
      expect(strategy['isTranslatableString']('42')).toBe(false);
    });

    it('should skip UUIDs', () => {
      expect(strategy['isTranslatableString']('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
      expect(strategy['isTranslatableString']('123e4567-e89b-12d3-a456-426614174000')).toBe(false);
    });

    it('should skip URLs', () => {
      expect(strategy['isTranslatableString']('https://example.com')).toBe(false);
      expect(strategy['isTranslatableString']('http://localhost:3000')).toBe(false);
    });

    it('should skip emails', () => {
      expect(strategy['isTranslatableString']('test@example.com')).toBe(false);
      expect(strategy['isTranslatableString']('user@domain.org')).toBe(false);
    });

    it('should skip hex colors', () => {
      expect(strategy['isTranslatableString']('#FF5733')).toBe(false);
      expect(strategy['isTranslatableString']('#000000')).toBe(false);
    });

    it('should skip camelCase identifiers', () => {
      expect(strategy['isTranslatableString']('myVariable')).toBe(false);
      expect(strategy['isTranslatableString']('getUserName')).toBe(false);
    });

    it('should skip regex patterns', () => {
      expect(strategy['isTranslatableString']('/^test$/gi')).toBe(false);
      expect(strategy['isTranslatableString']('/\\d+/')).toBe(false);
    });

    it('should skip technical keys', () => {
      expect(strategy['isTranslatableString']('some_value', 'id')).toBe(false);
      expect(strategy['isTranslatableString']('some_value', 'uuid')).toBe(false);
      expect(strategy['isTranslatableString']('some_value', 'api_key')).toBe(false);
    });

    it('should skip short strings', () => {
      expect(strategy['isTranslatableString']('a')).toBe(false);
      expect(strategy['isTranslatableString']('x')).toBe(false);
    });

    it('should accept multi-word strings', () => {
      expect(strategy['isTranslatableString']('Hello world')).toBe(true);
      expect(strategy['isTranslatableString']('This is a test')).toBe(true);
    });

    it('should accept sentences', () => {
      expect(strategy['isTranslatableString']('This is a sentence.')).toBe(true);
      expect(strategy['isTranslatableString']('Are you sure?')).toBe(true);
      expect(strategy['isTranslatableString']('Great job!')).toBe(true);
    });

    it('should accept sentence case', () => {
      expect(strategy['isTranslatableString']('Title')).toBe(true);
      expect(strategy['isTranslatableString']('Description')).toBe(true);
    });
  });

  describe('setValueByPath', () => {
    it('should set simple path', () => {
      const obj: any = {};
      strategy['setValueByPath'](obj, ['key'], 'value');
      expect(obj.key).toBe('value');
    });

    it('should set nested path', () => {
      const obj: any = {};
      strategy['setValueByPath'](obj, ['a', 'b', 'c'], 'value');
      expect(obj.a.b.c).toBe('value');
    });

    it('should handle array notation', () => {
      const obj: any = {};
      strategy['setValueByPath'](obj, ['items', '0'], 'first');
      expect(obj.items[0]).toBe('first');
      
      strategy['setValueByPath'](obj, ['items', '1'], 'second');
      expect(obj.items[1]).toBe('second');
    });

    it('should handle nested arrays', () => {
      const obj: any = { data: { items: [{}] } };
      strategy['setValueByPath'](obj, ['data', 'items', '0', 'name'], 'test');
      expect(obj.data.items[0].name).toBe('test');
    });

    it('should handle pure array index notation', () => {
      const obj: any = [];
      strategy['setValueByPath'](obj, ['0'], 'first');
      expect(obj[0]).toBe('first');
    });
  });

  describe('validate', () => {
    it('should return valid for valid content', () => {
      const result = strategy.validate('valid content');
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid content', () => {
      const result = strategy.validate('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toBe('Invalid format');
    });
  });
});