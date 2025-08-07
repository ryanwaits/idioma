# Idioma API

A REST API for AI-powered translations using the Idioma SDK.

## Features

- 🔐 **Secure Authentication** with Unkey API keys
- 🚦 **Rate Limiting** to prevent abuse
- 🌍 **Multi-language Support** with batch translations
- 💰 **Cost Tracking** for all translations
- 🔄 **Multiple AI Providers** (Anthropic, OpenAI)
- 📝 **Format Preservation** (Markdown, MDX)

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   cp src/api/.env.example .env
   # Edit .env with your API keys
   ```

3. **Start the server:**
   ```bash
   bun run src/api/index.ts
   ```

## Authentication

All API endpoints require authentication using Unkey API keys.

### Setting up Unkey

1. Sign up at [unkey.com](https://unkey.com)
2. Create an API in the Unkey dashboard
3. Add your `UNKEY_ROOT_KEY` and `UNKEY_API_ID` to `.env`
4. Create API keys for your users

### Using API Keys

Include your API key in requests using one of these methods:

```bash
# Header: X-API-Key
curl -H "X-API-Key: your_key_here" ...

# Header: Authorization Bearer
curl -H "Authorization: Bearer your_key_here" ...
```

## Endpoints

### `GET /api/health`

Health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "providers": {
    "anthropic": true,
    "openai": false
  }
}
```

### `POST /api/translate`

Translate content to a single target language.

**Request:**
```json
{
  "content": "Hello world",
  "sourceLocale": "en",
  "targetLocale": "es",
  "format": "string"  // "string" | "md" | "mdx"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "translatedContent": "Hola mundo",
    "sourceLocale": "en",
    "targetLocale": "es",
    "format": "string",
    "usage": {
      "promptTokens": 15,
      "completionTokens": 5,
      "totalTokens": 20
    },
    "cost": {
      "inputCost": 0.000045,
      "outputCost": 0.000075,
      "totalCost": 0.00012,
      "formattedCost": "< $0.01"
    },
    "duration": "523ms"
  },
  "ratelimit": {
    "limit": 100,
    "remaining": 99,
    "reset": 1704067260
  }
}
```

### `POST /api/translate/batch`

Translate content to multiple target languages.

**Request:**
```json
{
  "content": "# Welcome\n\nThis is a test document.",
  "sourceLocale": "en",
  "targetLocales": ["es", "fr", "de"],
  "format": "md"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "translations": {
      "es": {
        "content": "# Bienvenido\n\nEste es un documento de prueba.",
        "usage": { /* ... */ },
        "cost": { /* ... */ }
      },
      "fr": {
        "content": "# Bienvenue\n\nCeci est un document de test.",
        "usage": { /* ... */ },
        "cost": { /* ... */ }
      },
      "de": {
        "content": "# Willkommen\n\nDies ist ein Testdokument.",
        "usage": { /* ... */ },
        "cost": { /* ... */ }
      }
    },
    "sourceLocale": "en",
    "format": "md",
    "totalUsage": {
      "promptTokens": 150,
      "completionTokens": 120,
      "totalTokens": 270
    },
    "totalCost": {
      "amount": 0.00135,
      "formatted": "$0.00"
    },
    "duration": "2341ms"
  }
}
```

## Rate Limits

- **Standard endpoints**: 100 requests per minute
- **Batch endpoints**: 10 requests per minute

Rate limits are applied per API key. When you exceed the limit, you'll receive a 429 response:

```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message here",
  "details": [ /* Optional validation errors */ ]
}
```

### Common Error Codes

- `401` - Invalid or missing API key
- `400` - Validation error (check details)
- `429` - Rate limit exceeded
- `500` - Internal server error

## Advanced Configuration

### API Key Metadata

You can store metadata with your Unkey API keys to customize behavior:

```json
{
  "provider": "openai",     // Override default provider
  "model": "gpt-4o-mini",   // Use specific model
  "tier": "premium"         // Custom tier for rate limiting
}
```

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Unkey (required)
UNKEY_ROOT_KEY=unkey_root_xxx
UNKEY_API_ID=api_xxx

# AI Providers (at least one required)
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Defaults
TRANSLATION_PROVIDER=anthropic
```

## Examples

### cURL

```bash
# Simple translation
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "content": "Hello world",
    "targetLocale": "es"
  }'

# Batch translation
curl -X POST http://localhost:3000/api/translate/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "content": "# Hello\n\nWelcome to Idioma!",
    "targetLocales": ["es", "fr", "ja"],
    "format": "md"
  }'
```

### JavaScript/TypeScript

```typescript
// Simple translation
const response = await fetch('http://localhost:3000/api/translate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    content: 'Hello world',
    targetLocale: 'es'
  })
});

const result = await response.json();
console.log(result.data.translatedContent); // "Hola mundo"
```

### Python

```python
import requests

# Batch translation
response = requests.post(
    'http://localhost:3000/api/translate/batch',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key'
    },
    json={
        'content': '# Hello\n\nWelcome!',
        'targetLocales': ['es', 'fr'],
        'format': 'md'
    }
)

result = response.json()
for locale, translation in result['data']['translations'].items():
    print(f"{locale}: {translation['content']}")
```

## Deployment

### Docker

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install
EXPOSE 3000
CMD ["bun", "run", "src/api/index.ts"]
```

### Railway/Render/Fly.io

The API works with any platform that supports Bun/Node.js. Set your environment variables and deploy!

## Contributing

See the main [Idioma repository](https://github.com/ryanwaits/idioma) for contribution guidelines.

## License

MIT
