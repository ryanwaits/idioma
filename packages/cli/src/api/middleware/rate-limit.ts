import { rateLimiter } from 'hono-rate-limiter';

// Create different rate limiters for different tiers
export const standardRateLimit = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100, // 100 requests per minute
  standardHeaders: 'draft-6',
  keyGenerator: (c) => {
    // Use API key from auth context if available
    const auth = c.get('auth');
    return auth?.apiKey || c.req.header('x-forwarded-for') || 'anonymous';
  },
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});

export const strictRateLimit = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 10, // 10 requests per minute for batch operations
  standardHeaders: 'draft-6',
  keyGenerator: (c) => {
    const auth = c.get('auth');
    return auth?.apiKey || c.req.header('x-forwarded-for') || 'anonymous';
  },
  message: {
    success: false,
    error: 'Rate limit exceeded for batch operations. Maximum 10 requests per minute.',
  },
});

// Helper to create custom rate limiter based on API key metadata
export function createCustomRateLimit(limit: number, windowMs: number = 60000) {
  return rateLimiter({
    windowMs,
    limit,
    standardHeaders: 'draft-6',
    keyGenerator: (c) => {
      const auth = c.get('auth');
      return auth?.apiKey || 'anonymous';
    },
    message: {
      success: false,
      error: `Rate limit exceeded. Maximum ${limit} requests per ${windowMs / 1000} seconds.`,
    },
  });
}
