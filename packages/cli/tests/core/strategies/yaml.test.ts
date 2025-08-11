import { describe, expect, it } from 'bun:test';
import { YamlStrategy } from '../../../src/strategies/yaml';

describe('YamlStrategy', () => {
  describe('parse', () => {
    it('should parse simple YAML', async () => {
      const strategy = new YamlStrategy();
      const input = `
title: Hello World
description: A test description
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.size).toBe(2);
      expect(result.translatableContent.get('title')?.value).toBe('Hello World');
      expect(result.translatableContent.get('description')?.value).toBe('A test description');
    });

    it('should handle nested YAML', async () => {
      const strategy = new YamlStrategy();
      const input = `
menu:
  title: File Menu
  items:
    open: Open File
    save: Save File
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('menu.title')?.value).toBe('File Menu');
      expect(result.translatableContent.get('menu.items.open')?.value).toBe('Open File');
      expect(result.translatableContent.get('menu.items.save')?.value).toBe('Save File');
    });

    it('should handle arrays in YAML', async () => {
      const strategy = new YamlStrategy();
      const input = `
items:
  - First item
  - Second item
  - Third item
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('items[0]')?.value).toBe('First item');
      expect(result.translatableContent.get('items[1]')?.value).toBe('Second item');
      expect(result.translatableContent.get('items[2]')?.value).toBe('Third item');
    });

    it('should handle multi-document YAML', async () => {
      const strategy = new YamlStrategy();
      const input = `---
title: Document 1
description: First document
---
title: Document 2
description: Second document`;
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('doc0.title')?.value).toBe('Document 1');
      expect(result.translatableContent.get('doc0.description')?.value).toBe('First document');
      expect(result.translatableContent.get('doc1.title')?.value).toBe('Document 2');
      expect(result.translatableContent.get('doc1.description')?.value).toBe('Second document');
      expect(result.metadata.yamlMetadata.isMultiDocument).toBe(true);
    });

    it('should skip environment variables', async () => {
      const strategy = new YamlStrategy();
      const input = `
database_url: \${DATABASE_URL}
api_key: $API_KEY
app_name: My Application
port: $PORT
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.has('database_url')).toBe(false);
      expect(result.translatableContent.has('api_key')).toBe(false);
      expect(result.translatableContent.has('port')).toBe(false);
      expect(result.translatableContent.has('app_name')).toBe(true);
    });

    it('should skip file paths', async () => {
      const strategy = new YamlStrategy();
      const input = `
config_file: ./config/app.yaml
home_dir: ~/documents
root_path: /usr/local/bin
app_title: Application Title
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.has('config_file')).toBe(false);
      expect(result.translatableContent.has('home_dir')).toBe(false);
      expect(result.translatableContent.has('root_path')).toBe(false);
      expect(result.translatableContent.has('app_title')).toBe(true);
    });

    it('should skip shell commands', async () => {
      const strategy = new YamlStrategy();
      const input = `
script: npm run build
command: docker compose up
deploy: kubectl apply -f deployment.yaml
message: Build completed successfully
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.has('script')).toBe(false);
      expect(result.translatableContent.has('command')).toBe(false);
      expect(result.translatableContent.has('deploy')).toBe(false);
      expect(result.translatableContent.has('message')).toBe(true);
    });

    it('should detect YAML metadata', async () => {
      const strategy = new YamlStrategy();
      const input = `
defaults: &defaults
  name: Application Name
  description: App description

production:
  <<: *defaults
  environment: prod

text: |
  This is a literal
  multiline string
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.metadata.yamlMetadata.hasAnchors).toBe(true);
      expect(result.metadata.yamlMetadata.hasAliases).toBe(true);
      expect(result.metadata.yamlMetadata.hasMergeKeys).toBe(true);
      expect(result.metadata.yamlMetadata.multilineStyle).toBe('literal');
    });

    it('should detect and preserve comments', async () => {
      const strategy = new YamlStrategy();
      const input = `
# Main configuration
title: Application # The app title
description: Description # The app description
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.metadata.yamlMetadata.commentPositions).toHaveLength(3);
      expect(result.metadata.yamlMetadata.commentPositions[0].text).toBe('Main configuration');
      expect(result.metadata.yamlMetadata.commentPositions[1].text).toBe('The app title');
    });

    it('should respect includePaths config', async () => {
      const strategy = new YamlStrategy({
        includePaths: ['ui.labels', 'messages']
      });
      
      const input = `
ui:
  labels:
    title: Title
    button: Click me
  config:
    theme: dark
messages:
  error: Error occurred
data:
  value: Should be excluded
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.has('ui.labels.title')).toBe(true);
      expect(result.translatableContent.has('ui.labels.button')).toBe(true);
      expect(result.translatableContent.has('ui.config.theme')).toBe(false);
      expect(result.translatableContent.has('messages.error')).toBe(true);
      expect(result.translatableContent.has('data.value')).toBe(false);
    });

    it('should respect excludePaths config', async () => {
      const strategy = new YamlStrategy({
        excludePaths: ['config', 'internal.debug']
      });
      
      const input = `
title: App Title
config:
  apiKey: key123
  setting: value
internal:
  debug:
    message: Debug message
  label: Internal label
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.has('title')).toBe(true);
      expect(result.translatableContent.has('config.apiKey')).toBe(false);
      expect(result.translatableContent.has('config.setting')).toBe(false);
      expect(result.translatableContent.has('internal.debug.message')).toBe(false);
      expect(result.translatableContent.has('internal.label')).toBe(true);
    });

    it('should handle Rails i18n format', async () => {
      const strategy = new YamlStrategy();
      const input = `
en:
  activerecord:
    errors:
      messages:
        blank: can't be blank
        invalid: is invalid
  helpers:
    submit:
      create: Create %{model}
      update: Update %{model}
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('en.activerecord.errors.messages.blank')?.value)
        .toBe("can't be blank");
      expect(result.translatableContent.get('en.activerecord.errors.messages.invalid')?.value)
        .toBe('is invalid');
      expect(result.translatableContent.get('en.helpers.submit.create')?.value)
        .toBe('Create %{model}');
    });

    it('should handle complex nested structures', async () => {
      const strategy = new YamlStrategy();
      const input = `
database:
  connections:
    - name: primary
      host: localhost
      description: Primary database
    - name: replica
      host: replica.example.com
      description: Read replica
      `.trim();
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('database.connections.[0].description')?.value)
        .toBe('Primary database');
      expect(result.translatableContent.get('database.connections.[1].description')?.value)
        .toBe('Read replica');
      expect(result.translatableContent.has('database.connections.[0].host')).toBe(false);
    });

    it('should detect indentation size', async () => {
      const strategy = new YamlStrategy();
      
      const twoSpaces = `
parent:
  child: value`;
      
      const fourSpaces = `
parent:
    child: value`;
      
      const result2 = await strategy.parse(twoSpaces);
      const result4 = await strategy.parse(fourSpaces);
      
      expect(result2.metadata.yamlMetadata.indentSize).toBe(2);
      expect(result4.metadata.yamlMetadata.indentSize).toBe(4);
    });

    it('should throw on depth limit exceeded', async () => {
      const strategy = new YamlStrategy();
      
      // Create deeply nested object (101 levels)
      let obj: any = { message: 'Bottom' };
      for (let i = 0; i < 101; i++) {
        obj = { nested: obj };
      }
      
      const yaml = require('js-yaml');
      const input = yaml.dump(obj);
      
      await expect(strategy.parse(input)).rejects.toThrow('YAML depth limit exceeded');
    });

    it('should throw on invalid YAML', async () => {
      const strategy = new YamlStrategy();
      const input = `
title: Invalid
  description: Bad indentation
      `.trim();
      
      await expect(strategy.parse(input)).rejects.toThrow('Failed to parse YAML');
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct simple YAML with translations', async () => {
      const strategy = new YamlStrategy();
      const input = `
title: Hello
description: World
      `.trim();
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['title', 'Hola'],
        ['description', 'Mundo']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      const yaml = require('js-yaml');
      const resultObj = yaml.load(result);
      
      expect(resultObj.title).toBe('Hola');
      expect(resultObj.description).toBe('Mundo');
    });

    it('should reconstruct nested YAML', async () => {
      const strategy = new YamlStrategy();
      const input = `
menu:
  file:
    open: Open
    save: Save
      `.trim();
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['menu.file.open', 'Abrir'],
        ['menu.file.save', 'Guardar']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      const yaml = require('js-yaml');
      const resultObj = yaml.load(result);
      
      expect(resultObj.menu.file.open).toBe('Abrir');
      expect(resultObj.menu.file.save).toBe('Guardar');
    });

    it('should reconstruct arrays', async () => {
      const strategy = new YamlStrategy();
      const input = `
items:
  - First
  - Second
nested:
  - name: Item 1
  - name: Item 2
      `.trim();
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['items[0]', 'Primero'],
        ['items[1]', 'Segundo'],
        ['nested.[0].name', 'Artículo 1'],
        ['nested.[1].name', 'Artículo 2']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      const yaml = require('js-yaml');
      const resultObj = yaml.load(result);
      
      expect(resultObj.items[0]).toBe('Primero');
      expect(resultObj.items[1]).toBe('Segundo');
      expect(resultObj.nested[0].name).toBe('Artículo 1');
      expect(resultObj.nested[1].name).toBe('Artículo 2');
    });

    it('should reconstruct multi-document YAML', async () => {
      const strategy = new YamlStrategy();
      const input = `---
title: Document 1
---
title: Document 2`;
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['doc0.title', 'Documento 1'],
        ['doc1.title', 'Documento 2']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      const yaml = require('js-yaml');
      const documents = yaml.loadAll(result);
      
      expect(documents[0].title).toBe('Documento 1');
      expect(documents[1].title).toBe('Documento 2');
      expect(result).toContain('---');
    });

    it('should preserve untranslated values', async () => {
      const strategy = new YamlStrategy();
      const input = `
title: Hello
id: "123"
count: 42
active: true
      `.trim();
      
      const parsed = await strategy.parse(input);
      const translations = new Map([
        ['title', 'Hola']
      ]);
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      const yaml = require('js-yaml');
      const resultObj = yaml.load(result);
      
      expect(resultObj.title).toBe('Hola');
      expect(resultObj.id).toBe('123');
      expect(resultObj.count).toBe(42);
      expect(resultObj.active).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate correct YAML', () => {
      const strategy = new YamlStrategy();
      
      const result = strategy.validate('title: Valid YAML\ndescription: Test');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should detect invalid YAML', () => {
      const strategy = new YamlStrategy();
      
      const result = strategy.validate('title: Invalid\n  description: Bad indentation');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('bad indentation');
    });

    it('should detect duplicate keys', () => {
      const strategy = new YamlStrategy();
      
      const result = strategy.validate(`
title: First
title: Second
      `.trim());
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate multi-document YAML', () => {
      const strategy = new YamlStrategy();
      
      const result = strategy.validate(`---
title: Doc 1
---
title: Doc 2`);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('canHandle', () => {
    it('should handle .yaml and .yml files', () => {
      const strategy = new YamlStrategy();
      
      expect(strategy.canHandle('config.yaml')).toBe(true);
      expect(strategy.canHandle('settings.yml')).toBe(true);
      expect(strategy.canHandle('/path/to/file.yaml')).toBe(true);
      expect(strategy.canHandle('docker-compose.yml')).toBe(true);
    });

    it('should not handle non-yaml files', () => {
      const strategy = new YamlStrategy();
      
      expect(strategy.canHandle('data.json')).toBe(false);
      expect(strategy.canHandle('file.txt')).toBe(false);
      expect(strategy.canHandle('script.js')).toBe(false);
    });
  });
});