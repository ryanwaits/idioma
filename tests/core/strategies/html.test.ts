import { describe, expect, it } from 'bun:test';
import { HtmlStrategy } from '../../../src/strategies/html';

describe('HtmlStrategy', () => {
  describe('parse', () => {
    it('should parse simple HTML with text content', async () => {
      const strategy = new HtmlStrategy();
      const input = `<!DOCTYPE html>
<html>
  <head>
    <title>Test Page</title>
  </head>
  <body>
    <h1>Welcome</h1>
    <p>This is a test paragraph.</p>
  </body>
</html>`;
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.size).toBeGreaterThan(0);
      
      // Check for title text
      const titleText = Array.from(result.translatableContent.entries())
        .find(([key]) => key.includes('title.text'));
      expect(titleText?.[1].value).toBe('Test Page');
      
      // Check for h1 text
      const h1Text = Array.from(result.translatableContent.entries())
        .find(([key]) => key.includes('h1.text'));
      expect(h1Text?.[1].value).toBe('Welcome');
      
      // Check for paragraph text
      const pText = Array.from(result.translatableContent.entries())
        .find(([key]) => key.includes('p.text'));
      expect(pText?.[1].value).toBe('This is a test paragraph.');
    });

    it('should extract translatable attributes', async () => {
      const strategy = new HtmlStrategy();
      const input = `<html>
  <body>
    <img src="image.jpg" alt="Product image" title="Click to enlarge">
    <input type="text" placeholder="Enter your name">
    <button aria-label="Submit form">Submit</button>
  </body>
</html>`;
      
      const result = await strategy.parse(input);
      
      // Check for alt attribute
      const altAttr = Array.from(result.translatableContent.entries())
        .find(([key]) => key.includes('@alt'));
      expect(altAttr?.[1].value).toBe('Product image');
      
      // Check for title attribute
      const titleAttr = Array.from(result.translatableContent.entries())
        .find(([key]) => key.includes('@title'));
      expect(titleAttr?.[1].value).toBe('Click to enlarge');
      
      // Check for placeholder
      const placeholderAttr = Array.from(result.translatableContent.entries())
        .find(([key]) => key.includes('@placeholder'));
      expect(placeholderAttr?.[1].value).toBe('Enter your name');
      
      // Check for aria-label
      const ariaLabel = Array.from(result.translatableContent.entries())
        .find(([key]) => key.includes('@aria-label'));
      expect(ariaLabel?.[1].value).toBe('Submit form');
    });

    it('should handle meta tags', async () => {
      const strategy = new HtmlStrategy();
      const input = `<html>
  <head>
    <meta name="description" content="This is the page description">
    <meta name="keywords" content="test, html, translation">
    <meta name="author" content="Test Author">
    <meta property="og:title" content="Page Title">
    <meta property="og:description" content="Social media description">
  </head>
</html>`;
      
      const result = await strategy.parse(input);
      
      expect(result.translatableContent.get('meta.description')?.value)
        .toBe('This is the page description');
      expect(result.translatableContent.get('meta.keywords')?.value)
        .toBe('test, html, translation');
      expect(result.translatableContent.get('meta.author')?.value)
        .toBe('Test Author');
    });

    it('should skip script and style tags', async () => {
      const strategy = new HtmlStrategy();
      const input = `<html>
  <body>
    <p>Visible text</p>
    <script>
      console.log("This should not be translated");
    </script>
    <style>
      body { color: red; }
    </style>
    <code>const x = "not translated";</code>
  </body>
</html>`;
      
      const result = await strategy.parse(input);
      
      // Should have the paragraph text
      const hasVisibleText = Array.from(result.translatableContent.values())
        .some(node => node.value === 'Visible text');
      expect(hasVisibleText).toBe(true);
      
      // Should not have script content
      const hasScriptContent = Array.from(result.translatableContent.values())
        .some(node => node.value.includes('console.log'));
      expect(hasScriptContent).toBe(false);
      
      // Should not have style content
      const hasStyleContent = Array.from(result.translatableContent.values())
        .some(node => node.value.includes('color: red'));
      expect(hasStyleContent).toBe(false);
      
      // Should not have code content
      const hasCodeContent = Array.from(result.translatableContent.values())
        .some(node => node.value.includes('const x'));
      expect(hasCodeContent).toBe(false);
    });

    it('should handle nested HTML structures', async () => {
      const strategy = new HtmlStrategy();
      const input = `<html>
  <body>
    <div>
      <header>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      </header>
      <main>
        <article>
          <h2>Article Title</h2>
          <p>Article content goes here.</p>
        </article>
      </main>
    </div>
  </body>
</html>`;
      
      const result = await strategy.parse(input);
      
      // Check for nested link texts
      const hasHome = Array.from(result.translatableContent.values())
        .some(node => node.value === 'Home');
      const hasAbout = Array.from(result.translatableContent.values())
        .some(node => node.value === 'About');
      const hasContact = Array.from(result.translatableContent.values())
        .some(node => node.value === 'Contact');
      
      expect(hasHome).toBe(true);
      expect(hasAbout).toBe(true);
      expect(hasContact).toBe(true);
      
      // Check for article content
      const hasArticleTitle = Array.from(result.translatableContent.values())
        .some(node => node.value === 'Article Title');
      const hasArticleContent = Array.from(result.translatableContent.values())
        .some(node => node.value === 'Article content goes here.');
      
      expect(hasArticleTitle).toBe(true);
      expect(hasArticleContent).toBe(true);
    });

    it('should detect HTML metadata', async () => {
      const strategy = new HtmlStrategy();
      const input = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
  </head>
  <body>
    <p>Test</p>
    <script src="app.js"></script>
    <style>body {}</style>
  </body>
</html>`;
      
      const result = await strategy.parse(input);
      
      expect(result.metadata.htmlMetadata.hasDoctype).toBe(true);
      expect(result.metadata.htmlMetadata.encoding).toBe('UTF-8');
      expect(result.metadata.htmlMetadata.hasInlineScripts).toBe(false); // external script
      expect(result.metadata.htmlMetadata.hasInlineStyles).toBe(true);
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct HTML with translations', async () => {
      const strategy = new HtmlStrategy();
      const input = `<html>
  <body>
    <h1>Hello</h1>
    <p>World</p>
  </body>
</html>`;
      
      const parsed = await strategy.parse(input);
      
      // Create translations map
      const translations = new Map<string, string>();
      for (const [key, node] of parsed.translatableContent) {
        if (node.value === 'Hello') {
          translations.set(key, 'Hola');
        } else if (node.value === 'World') {
          translations.set(key, 'Mundo');
        }
      }
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      
      expect(result).toContain('Hola');
      expect(result).toContain('Mundo');
      expect(result).toContain('<h1>');
      expect(result).toContain('</h1>');
      expect(result).toContain('<p>');
      expect(result).toContain('</p>');
    });

    it('should preserve HTML structure', async () => {
      const strategy = new HtmlStrategy();
      const input = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Test</title>
  </head>
  <body>
    <div class="container">
      <p id="main">Content</p>
    </div>
  </body>
</html>`;
      
      const parsed = await strategy.parse(input);
      const translations = new Map<string, string>();
      
      // Add some translations
      for (const [key, node] of parsed.translatableContent) {
        if (node.value === 'Test') {
          translations.set(key, 'Prueba');
        } else if (node.value === 'Content') {
          translations.set(key, 'Contenido');
        }
      }
      
      const result = await strategy.reconstruct(translations, parsed.metadata);
      
      // Check structure is preserved
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('lang="en"');
      expect(result).toContain('class="container"');
      expect(result).toContain('id="main"');
    });
  });

  describe('validate', () => {
    it('should validate correct HTML', () => {
      const strategy = new HtmlStrategy();
      
      const result = strategy.validate('<html><body><p>Valid HTML</p></body></html>');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate HTML fragments', () => {
      const strategy = new HtmlStrategy();
      
      const result = strategy.validate('<div><p>Fragment</p></div>');
      
      expect(result.valid).toBe(true);
    });

    it('should handle malformed HTML gracefully', () => {
      const strategy = new HtmlStrategy();
      
      // parse5 is very forgiving, it will parse almost anything
      const result = strategy.validate('<p>Unclosed paragraph');
      
      // parse5 will auto-close tags, so this is still "valid"
      expect(result.valid).toBe(true);
    });
  });

  describe('canHandle', () => {
    it('should handle .html and .htm files', () => {
      const strategy = new HtmlStrategy();
      
      expect(strategy.canHandle('index.html')).toBe(true);
      expect(strategy.canHandle('page.htm')).toBe(true);
      expect(strategy.canHandle('/path/to/file.html')).toBe(true);
    });

    it('should not handle non-html files', () => {
      const strategy = new HtmlStrategy();
      
      expect(strategy.canHandle('data.xml')).toBe(false);
      expect(strategy.canHandle('file.txt')).toBe(false);
      expect(strategy.canHandle('script.js')).toBe(false);
    });
  });
});