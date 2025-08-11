import { describe, it, expect } from 'bun:test';
import { CSVTranslationStrategy } from '../../../src/strategies/csv';

describe('CSVTranslationStrategy', () => {
  const strategy = new CSVTranslationStrategy();

  describe('canHandle', () => {
    it('should handle .csv files', () => {
      expect(strategy.canHandle('products.csv')).toBe(true);
      expect(strategy.canHandle('/path/to/data.csv')).toBe(true);
    });

    it('should not handle non-csv files', () => {
      expect(strategy.canHandle('data.json')).toBe(false);
      expect(strategy.canHandle('document.txt')).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate valid CSV content', () => {
      const content = `name,description,price
Product A,Description A,10.99`;
      
      const result = strategy.validate(content);
      expect(result.valid).toBe(true);
    });

    it('should detect empty CSV', () => {
      const result = strategy.validate('');
      expect(result.valid).toBe(false);
      expect(result.errors?.[0].message).toContain('Empty CSV file');
    });
  });

  describe('parse', () => {
    it('should detect comma delimiter', async () => {
      const content = `name,description,price
Product A,Description of A,10.99
Product B,Description of B,20.99`;
      
      // @ts-ignore - accessing protected method for testing
      const result = await strategy.parse(content);
      
      expect(result.metadata.delimiter).toBe(',');
      expect(result.metadata.headers).toEqual(['name', 'description', 'price']);
      expect(result.translatableContent.size).toBeGreaterThan(0);
    });

    it('should detect semicolon delimiter', async () => {
      const content = `name;description;price
Product A;Description of A;10.99`;
      
      // @ts-ignore - accessing protected method for testing
      const result = await strategy.parse(content);
      
      expect(result.metadata.delimiter).toBe(';');
    });

    it('should detect tab delimiter', async () => {
      const content = `name\tdescription\tprice
Product A\tDescription of A\t10.99`;
      
      // @ts-ignore - accessing protected method for testing
      const result = await strategy.parse(content);
      
      expect(result.metadata.delimiter).toBe('\t');
    });

    it('should detect pipe delimiter', async () => {
      const content = `name|description|price
Product A|Description of A|10.99`;
      
      // @ts-ignore - accessing protected method for testing
      const result = await strategy.parse(content);
      
      expect(result.metadata.delimiter).toBe('|');
    });

    it('should identify translatable columns', async () => {
      const content = `id,name,description,sku,email,price
1,Office Chair,Comfortable chair,SKU001,test@example.com,99.99`;
      
      // @ts-ignore - accessing protected method for testing
      const result = await strategy.parse(content);
      
      // Should include name and description as translatable
      expect(result.metadata.translatableColumns).toContain('name');
      expect(result.metadata.translatableColumns).toContain('description');
      
      // Should not include technical fields
      expect(result.metadata.translatableColumns).not.toContain('id');
      expect(result.metadata.translatableColumns).not.toContain('sku');
      expect(result.metadata.translatableColumns).not.toContain('email');
      expect(result.metadata.translatableColumns).not.toContain('price');
    });

    it('should extract translatable content', async () => {
      const content = `name,description
Product A,Description of A
Product B,Description of B`;
      
      // @ts-ignore - accessing protected method for testing
      const result = await strategy.parse(content);
      
      // Should have 4 translatable items (2 names + 2 descriptions)
      expect(result.translatableContent.size).toBe(4);
      
      // Check that values are correctly extracted
      const values = Array.from(result.translatableContent.values()).map(v => v.value);
      expect(values).toContain('Product A');
      expect(values).toContain('Description of A');
      expect(values).toContain('Product B');
      expect(values).toContain('Description of B');
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct CSV with translations', async () => {
      const content = `name,description,price
Product A,Description A,10.99`;
      
      // @ts-ignore - accessing protected method for testing
      const parseResult = await strategy.parse(content);
      
      // Create mock translations
      const translations = new Map();
      translations.set('row0_col0', 'Producto A');
      translations.set('row0_col1', 'Descripción A');
      
      // @ts-ignore - accessing protected method for testing
      const reconstructed = await strategy.reconstruct(translations, parseResult.metadata);
      
      const lines = reconstructed.split('\n');
      expect(lines[0]).toBe('name,description,price'); // Headers unchanged
      expect(lines[1]).toBe('Producto A,Descripción A,10.99');
    });

    it('should handle quoted fields with commas', async () => {
      const content = `name,description
"Product, Special","Has, commas"`;
      
      // @ts-ignore - accessing protected method for testing
      const parseResult = await strategy.parse(content);
      
      // Create mock translations
      const translations = new Map();
      translations.set('row0_col0', 'Producto, Especial');
      translations.set('row0_col1', 'Tiene, comas');
      
      // @ts-ignore - accessing protected method for testing
      const reconstructed = await strategy.reconstruct(translations, parseResult.metadata);
      
      const lines = reconstructed.split('\n');
      expect(lines[1]).toContain('"Producto, Especial"');
      expect(lines[1]).toContain('"Tiene, comas"');
    });

    it('should preserve delimiter in reconstruction', async () => {
      const content = `name;description;price
Product A;Description A;10.99`;
      
      // @ts-ignore - accessing protected method for testing
      const parseResult = await strategy.parse(content);
      
      const translations = new Map();
      translations.set('row0_col0', 'Producto A');
      translations.set('row0_col1', 'Descripción A');
      
      // @ts-ignore - accessing protected method for testing
      const reconstructed = await strategy.reconstruct(translations, parseResult.metadata);
      
      // Should use semicolon delimiter
      expect(reconstructed).toContain(';');
      expect(reconstructed.split('\n')[1]).toBe('Producto A;Descripción A;10.99');
    });
  });

  describe('CSV edge cases', () => {
    it('should handle single column CSV', async () => {
      const content = `description
First item
Second item`;
      
      // @ts-ignore - accessing protected method for testing
      const result = await strategy.parse(content);
      
      expect(result.metadata.headers).toEqual(['description']);
      expect(result.translatableContent.size).toBe(2);
    });

    it('should handle CSV with only headers', async () => {
      const content = `name,description,price`;
      
      // @ts-ignore - accessing protected method for testing
      const result = await strategy.parse(content);
      
      expect(result.metadata.headers).toEqual(['name', 'description', 'price']);
      expect(result.translatableContent.size).toBe(0); // No data rows
    });

    it('should handle empty fields', async () => {
      const content = `name,description,notes
Product A,Description A,
Product B,,Some notes
,Description C,More notes`;
      
      // @ts-ignore - accessing protected method for testing
      const result = await strategy.parse(content);
      
      // Check that rows are parsed correctly with empty fields
      expect(result.metadata.rows[0]).toEqual(['Product A', 'Description A', '']);
      expect(result.metadata.rows[1]).toEqual(['Product B', '', 'Some notes']);
      expect(result.metadata.rows[2]).toEqual(['', 'Description C', 'More notes']);
    });

    it('should handle escaped quotes', async () => {
      const content = `name,description
"The ""Best"" Product","Has ""quotes"""`;
      
      // @ts-ignore - accessing protected method for testing
      const result = await strategy.parse(content);
      
      // Should parse escaped quotes correctly
      const firstRow = result.metadata.rows[0];
      expect(firstRow[0]).toBe('The "Best" Product');
      expect(firstRow[1]).toBe('Has "quotes"');
    });
  });
});