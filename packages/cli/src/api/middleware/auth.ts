import { Unkey } from '@unkey/api';
import type { Context, Next } from 'hono';

// Initialize Unkey client
const rootKey = process.env.UNKEY_ROOT_KEY;
if (!rootKey) {
  throw new Error('UNKEY_ROOT_KEY environment variable is required');
}
const unkey = new Unkey({
  rootKey,
});

export interface AuthContext {
  apiKey: string;
  ownerId?: string;
  meta?: Record<string, any>;
  ratelimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

/**
 * Unkey authentication middleware
 * Validates API keys and adds auth context to request
 */
export async function unkeyAuth(c: Context, next: Next) {
  const apiKey = c.req.header('X-API-Key') || c.req.header('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return c.json(
      {
        success: false,
        error: 'Missing API key. Please provide X-API-Key header or Authorization: Bearer <key>',
      },
      401
    );
  }

  try {
    // Verify the API key with Unkey
    const { result, error } = await unkey.keys.verify({
      key: apiKey,
      apiId: process.env.UNKEY_API_ID,
    });

    if (error) {
      console.error('Unkey verification error:', error);
      return c.json(
        {
          success: false,
          error: 'API key verification failed',
        },
        500
      );
    }

    if (!result?.valid) {
      return c.json(
        {
          success: false,
          error: 'Invalid API key',
          code: result?.code, // RATE_LIMITED, KEY_EXPIRED, etc.
        },
        401
      );
    }

    // Add auth context to request
    if (!result.keyId) {
      return c.json(
        {
          success: false,
          error: 'API key verification failed - no key ID returned',
        },
        500
      );
    }

    const authContext: AuthContext = {
      apiKey: result.keyId,
      ownerId: result.ownerId,
      meta: result.meta,
    };

    // Add ratelimit info if available
    if (result.ratelimit) {
      authContext.ratelimit = {
        limit: result.ratelimit.limit,
        remaining: result.ratelimit.remaining,
        reset: result.ratelimit.reset,
      };

      // Set rate limit headers
      c.header('X-RateLimit-Limit', result.ratelimit.limit.toString());
      c.header('X-RateLimit-Remaining', result.ratelimit.remaining.toString());
      c.header('X-RateLimit-Reset', result.ratelimit.reset.toString());
    }

    // Store auth context for use in route handlers
    c.set('auth', authContext);

    await next();
  } catch (error) {
    console.error('Unkey middleware error:', error);
    return c.json(
      {
        success: false,
        error: 'Internal authentication error',
      },
      500
    );
  }
}

/**
 * Optional: Middleware to check specific permissions
 */
export function requirePermission(permission: string) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext;

    if (!auth) {
      return c.json(
        {
          success: false,
          error: 'Authentication required',
        },
        401
      );
    }

    // Check if user has required permission in meta
    const permissions = (auth.meta?.permissions as string[]) || [];
    if (!permissions.includes(permission)) {
      return c.json(
        {
          success: false,
          error: `Missing required permission: ${permission}`,
        },
        403
      );
    }

    await next();
  };
}
