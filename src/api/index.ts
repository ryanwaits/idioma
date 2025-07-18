import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { z } from 'zod';
import { OpenLocale } from '../../sdk/src/OpenLocale';
import type { OpenLocaleConfig } from '../../sdk/src/types';
import { unkeyAuth, type AuthContext } from './middleware/auth';
import { standardRateLimit, strictRateLimit } from './middleware/rate-limit';

// Type for Hono context with auth
type Variables = {
  auth: AuthContext;
};

// Environment variables
const PORT = parseInt(process.env.PORT || '3000');

// Request/Response schemas
const TranslateRequestSchema = z.object({
  content: z.string().min(1).max(50000), // Max 50k chars
  sourceLocale: z.string().default('en'),
  targetLocale: z.string(),
  format: z.enum(['string', 'md', 'mdx']).default('string'),
});

const BatchTranslateRequestSchema = z.object({
  content: z.string().min(1).max(50000),
  sourceLocale: z.string().default('en'),
  targetLocales: z.array(z.string()).min(1).max(10), // Max 10 target languages
  format: z.enum(['string', 'md', 'mdx']).default('string'),
});

// Create Hono app with typed variables
const app = new Hono<{ Variables: Variables }>();

// Global middleware
app.use('*', logger());

// CORS for API routes
app.use('/api/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
}));

// Public endpoints
app.get('/', (c) => {
  return c.json({
    name: 'OpenLocale API',
    version: '1.0.0',
    status: 'healthy',
    documentation: 'https://github.com/openlocale/openlocale',
    endpoints: {
      translate: {
        method: 'POST',
        path: '/api/translate',
        description: 'Translate content to a single target language',
      },
      batchTranslate: {
        method: 'POST',
        path: '/api/translate/batch',
        description: 'Translate content to multiple target languages',
      },
      health: {
        method: 'GET',
        path: '/api/health',
        description: 'Health check endpoint',
      },
    },
  });
});

app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    providers: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
  });
});

// Protected endpoints - require Unkey authentication and rate limiting
app.use('/api/translate/*', unkeyAuth);
app.use('/api/translate', unkeyAuth);
app.use('/api/translate', standardRateLimit);
app.use('/api/translate/batch', strictRateLimit);

// Single translation endpoint
app.post('/api/translate', async (c) => {
  try {
    const auth = c.get('auth');
    const body = await c.req.json();
    const params = TranslateRequestSchema.parse(body);

    // Get provider preference from API key metadata or use default
    const provider = (auth.meta?.provider as string) || process.env.TRANSLATION_PROVIDER || 'anthropic';
    const model = auth.meta?.model as string;

    // Initialize OpenLocale SDK
    const config: OpenLocaleConfig = {
      provider: provider as any,
      model,
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    };

    const openlocale = await OpenLocale.create(config);

    // Perform translation
    const startTime = Date.now();
    const result = await openlocale.translateContent({
      content: params.content,
      format: params.format,
      sourceLocale: params.sourceLocale,
      targetLocale: params.targetLocale,
      trackCosts: true,
    });

    const duration = Date.now() - startTime;

    // Log usage to Unkey (optional)
    if (result.usage && process.env.UNKEY_NAMESPACE_ID) {
      // Could log usage metrics to Unkey analytics here
    }

    // Return successful response
    return c.json({
      success: true,
      data: {
        translatedContent: result.translatedContent,
        sourceLocale: params.sourceLocale,
        targetLocale: params.targetLocale,
        format: params.format,
        usage: result.usage,
        cost: result.cost,
        duration: `${duration}ms`,
      },
      ratelimit: auth.ratelimit,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        400
      );
    }

    console.error('Translation error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500
    );
  }
});

// Batch translation endpoint
app.post('/api/translate/batch', async (c) => {
  try {
    const auth = c.get('auth');
    const body = await c.req.json();
    const params = BatchTranslateRequestSchema.parse(body);

    const provider = (auth.meta?.provider as string) || process.env.TRANSLATION_PROVIDER || 'anthropic';
    const model = auth.meta?.model as string;

    const config: OpenLocaleConfig = {
      provider: provider as any,
      model,
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    };

    const openlocale = await OpenLocale.create(config);

    // Translate to all target languages
    const startTime = Date.now();
    const translations: Record<string, any> = {};
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let totalCost = 0;

    for (const targetLocale of params.targetLocales) {
      const result = await openlocale.translateContent({
        content: params.content,
        format: params.format,
        sourceLocale: params.sourceLocale,
        targetLocale: targetLocale,
        trackCosts: true,
      });

      translations[targetLocale] = {
        content: result.translatedContent,
        usage: result.usage,
        cost: result.cost,
      };

      if (result.usage) {
        totalUsage.promptTokens += result.usage.promptTokens;
        totalUsage.completionTokens += result.usage.completionTokens;
        totalUsage.totalTokens += result.usage.totalTokens;
      }

      if (result.cost) {
        totalCost += result.cost.totalCost;
      }
    }

    const duration = Date.now() - startTime;

    return c.json({
      success: true,
      data: {
        translations,
        sourceLocale: params.sourceLocale,
        format: params.format,
        totalUsage,
        totalCost: {
          amount: totalCost,
          formatted: `$${totalCost.toFixed(2)}`,
        },
        duration: `${duration}ms`,
      },
      ratelimit: auth.ratelimit,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        400
      );
    }

    console.error('Batch translation error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500
    );
  }
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Endpoint not found',
      path: c.req.path,
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
});

// Export for Bun.serve
export default {
  port: PORT,
  fetch: app.fetch,
};

// Start server message if running directly
if (import.meta.main) {
  console.log(`🚀 OpenLocale API running on http://localhost:${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/`);
  console.log('\n⚙️  Configuration:');
  console.log(`   - Unkey API: ${process.env.UNKEY_API_ID ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`   - Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✓ Available' : '✗ Not available'}`);
  console.log(`   - OpenAI: ${process.env.OPENAI_API_KEY ? '✓ Available' : '✗ Not available'}`);
}