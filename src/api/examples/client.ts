/**
 * OpenLocale API Client
 * A simple TypeScript client for the OpenLocale API
 */

export class OpenLocaleClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiKey: string, apiUrl: string = 'http://localhost:3000') {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * Make an API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data;
  }

  /**
   * Check API health
   */
  async health() {
    return this.request('/api/health', { method: 'GET' });
  }

  /**
   * Translate content to a single language
   */
  async translate(params: {
    content: string;
    targetLocale: string;
    sourceLocale?: string;
    format?: 'string' | 'md' | 'mdx';
  }) {
    return this.request('/api/translate', {
      method: 'POST',
      body: JSON.stringify({
        sourceLocale: 'en',
        format: 'string',
        ...params,
      }),
    });
  }

  /**
   * Translate content to multiple languages
   */
  async translateBatch(params: {
    content: string;
    targetLocales: string[];
    sourceLocale?: string;
    format?: 'string' | 'md' | 'mdx';
  }) {
    return this.request('/api/translate/batch', {
      method: 'POST',
      body: JSON.stringify({
        sourceLocale: 'en',
        format: 'string',
        ...params,
      }),
    });
  }
}

// Example usage:
async function example() {
  const client = new OpenLocaleClient('your_api_key');

  // Simple translation
  const result = await client.translate({
    content: 'Hello world',
    targetLocale: 'es',
  });
  console.log(result.data.translatedContent); // "Hola mundo"

  // Batch translation
  const batchResult = await client.translateBatch({
    content: '# Welcome\n\nThis is a test.',
    targetLocales: ['es', 'fr', 'de'],
    format: 'md',
  });
  
  for (const [locale, translation] of Object.entries(batchResult.data.translations)) {
    console.log(`${locale}: ${translation.content}`);
  }
}