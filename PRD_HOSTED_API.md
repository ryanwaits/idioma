# Product Requirements Document: Idioma Hosted API Service

## Executive Summary

Build a minimal, sustainable hosted API service for Idioma that remains fully open source while providing a managed option for users who need API access without infrastructure overhead. Revenue through Polar.sh subscriptions covers infrastructure costs while keeping the project sustainable.

## Goals & Objectives

### Primary Goals
- Enable SDK/API usage without requiring users to manage infrastructure
- Create sustainable revenue stream through Polar.sh
- Maintain 100% open source codebase
- Keep implementation simple and maintainable

### Success Metrics
- 100+ active API keys within 3 months
- 20+ paid subscribers via Polar.sh
- <100ms API response time (p95)
- 99.9% uptime
- Zero external database dependencies

## User Personas

### 1. Serverless Developer
- **Needs**: Translation API for Vercel/Cloudflare functions
- **Pain Points**: Can't run CLI in serverless environment
- **Value Prop**: Simple API calls with no infrastructure

### 2. SaaS Builder
- **Needs**: Translate user-generated content dynamically
- **Pain Points**: Managing AI API keys for customers
- **Value Prop**: Single API key with usage-based billing

### 3. Open Source Maintainer
- **Needs**: Free tier for documentation translation
- **Pain Points**: Limited budget for tools
- **Value Prop**: Generous free tier with community support

## Technical Architecture

### Core Components

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client SDK    │────▶│  API Gateway │────▶│  Translation│
│                 │     │   (Hono)     │     │   Service   │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │                      │
                        ┌──────▼──────┐      ┌───────▼──────┐
                        │   SQLite    │      │  AI Provider │
                        │   Database  │      │   (Claude)   │
                        └─────────────┘      └──────────────┘
                               │
                        ┌──────▼──────┐
                        │  Polar.sh   │
                        │  Webhooks   │
                        └─────────────┘
```

### Database Schema (SQLite)

```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(8))),
    email TEXT UNIQUE NOT NULL,
    polar_user_id TEXT UNIQUE,
    tier TEXT DEFAULT 'free', -- free, supporter, pro
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API Keys table
CREATE TABLE api_keys (
    key TEXT PRIMARY KEY, -- idioma_sk_<random>
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT,
    active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    UNIQUE(user_id, name)
);

-- Usage tracking table
CREATE TABLE usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key TEXT NOT NULL REFERENCES api_keys(key),
    endpoint TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    model TEXT NOT NULL,
    cost_usd DECIMAL(10, 6),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Aggregated usage (for performance)
CREATE TABLE usage_monthly (
    user_id TEXT NOT NULL REFERENCES users(id),
    month TEXT NOT NULL, -- YYYY-MM format
    total_tokens INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10, 6) DEFAULT 0,
    request_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, month)
);

-- Rate limit tracking
CREATE TABLE rate_limits (
    api_key TEXT PRIMARY KEY REFERENCES api_keys(key),
    minute_count INTEGER DEFAULT 0,
    minute_reset DATETIME,
    day_count INTEGER DEFAULT 0,
    day_reset DATETIME
);
```

## Feature Specifications

### Phase 1: Core API Infrastructure (Week 1)

#### 1.1 API Key Management

**Implementation**:
```typescript
// src/api/services/auth/keys.ts
export class ApiKeyService {
  generateKey(): string {
    // Format: idioma_sk_<32 random chars>
    return `idioma_sk_${generateSecureRandom(32)}`;
  }

  async createKey(userId: string, name?: string): Promise<ApiKey> {
    const key = this.generateKey();
    // Hash key for storage, return plain key once
    const hashedKey = await hashApiKey(key);
    await db.insert('api_keys', { 
      key: hashedKey, 
      user_id: userId,
      name 
    });
    return { key, name }; // Return unhashed key only on creation
  }

  async validateKey(key: string): Promise<User | null> {
    const hashedKey = await hashApiKey(key);
    const result = await db.query(`
      SELECT u.* FROM users u
      JOIN api_keys ak ON ak.user_id = u.id
      WHERE ak.key = ? AND ak.active = true
    `, [hashedKey]);
    
    if (result) {
      await this.updateLastUsed(hashedKey);
    }
    
    return result;
  }
}
```

#### 1.2 Rate Limiting

**Tier Specifications**:
| Tier | Requests/min | Tokens/month | Price |
|------|--------------|--------------|--------|
| Free | 10 | 10,000 | $0 |
| Supporter | 30 | 100,000 | $10/mo |
| Pro | 100 | 1,000,000 | $50/mo |
| Enterprise | Unlimited | Unlimited | Custom |

**Implementation**:
```typescript
// src/api/middleware/rate-limit.ts
export async function rateLimitMiddleware(c: Context, next: Next) {
  const apiKey = c.get('apiKey');
  const tier = c.get('userTier');
  
  const limits = {
    free: { rpm: 10, monthly: 10000 },
    supporter: { rpm: 30, monthly: 100000 },
    pro: { rpm: 100, monthly: 1000000 }
  };
  
  const limit = limits[tier] || limits.free;
  
  // Check minute rate limit
  const minuteCount = await getRateCount(apiKey, 'minute');
  if (minuteCount >= limit.rpm) {
    return c.json({ 
      error: 'Rate limit exceeded',
      retryAfter: getRetryAfter(apiKey, 'minute')
    }, 429);
  }
  
  // Check monthly token limit
  const monthlyUsage = await getMonthlyUsage(c.get('userId'));
  if (monthlyUsage.total_tokens >= limit.monthly) {
    return c.json({ 
      error: 'Monthly token limit exceeded',
      limit: limit.monthly,
      used: monthlyUsage.total_tokens,
      upgradeUrl: 'https://polar.sh/idioma'
    }, 429);
  }
  
  await incrementRateCount(apiKey, 'minute');
  await next();
}
```

#### 1.3 Usage Tracking

**Implementation**:
```typescript
// src/api/services/usage.ts
export class UsageService {
  async trackUsage(params: {
    apiKey: string;
    endpoint: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
  }) {
    const cost = calculateCost(params);
    
    // Log individual request
    await db.insert('usage_logs', {
      api_key: params.apiKey,
      endpoint: params.endpoint,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      model: params.model,
      cost_usd: cost
    });
    
    // Update monthly aggregate
    const month = new Date().toISOString().slice(0, 7);
    await db.run(`
      INSERT INTO usage_monthly (user_id, month, total_tokens, total_cost_usd, request_count)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(user_id, month) DO UPDATE SET
        total_tokens = total_tokens + ?,
        total_cost_usd = total_cost_usd + ?,
        request_count = request_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, month, totalTokens, cost, totalTokens, cost]);
  }
  
  async getUsageStats(userId: string, month?: string): Promise<UsageStats> {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return await db.get(`
      SELECT * FROM usage_monthly 
      WHERE user_id = ? AND month = ?
    `, [userId, targetMonth]);
  }
}
```

### Phase 2: Polar.sh Integration (Week 2)

#### 2.1 Webhook Handler

**Implementation**:
```typescript
// src/api/routes/webhooks/polar.ts
export const polarWebhook = new Hono();

polarWebhook.post('/polar/webhook', async (c) => {
  const signature = c.req.header('Polar-Signature');
  const payload = await c.req.json();
  
  // Verify webhook signature
  if (!verifyPolarSignature(signature, payload)) {
    return c.json({ error: 'Invalid signature' }, 401);
  }
  
  switch (payload.event) {
    case 'subscription.created':
      await handleSubscriptionCreated(payload);
      break;
    case 'subscription.updated':
      await handleSubscriptionUpdated(payload);
      break;
    case 'subscription.cancelled':
      await handleSubscriptionCancelled(payload);
      break;
  }
  
  return c.json({ received: true });
});

async function handleSubscriptionCreated(payload: PolarWebhook) {
  const { user_email, product_id } = payload.data;
  
  // Map Polar products to tiers
  const tierMap = {
    'prod_supporter': 'supporter',
    'prod_pro': 'pro'
  };
  
  const tier = tierMap[product_id] || 'free';
  
  // Create or update user
  const user = await db.run(`
    INSERT INTO users (email, polar_user_id, tier)
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      polar_user_id = ?,
      tier = ?,
      updated_at = CURRENT_TIMESTAMP
  `, [user_email, payload.user_id, tier, payload.user_id, tier]);
  
  // Send welcome email with API key
  if (user.changes > 0) {
    const apiKey = await createApiKey(user.lastID, 'Default');
    await sendWelcomeEmail(user_email, apiKey.key);
  }
}
```

#### 2.2 Billing Dashboard

**Simple Web UI**:
```typescript
// src/api/routes/dashboard.ts
export const dashboard = new Hono();

dashboard.get('/dashboard', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = await validateApiKey(apiKey);
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const usage = await getUsageStats(user.id);
  const keys = await getUserApiKeys(user.id);
  
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Idioma Dashboard</title>
        <style>
          body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 2rem; }
          .stat { background: #f5f5f5; padding: 1rem; margin: 1rem 0; border-radius: 8px; }
          .progress { background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; }
          .progress-bar { background: #4CAF50; height: 100%; transition: width 0.3s; }
        </style>
      </head>
      <body>
        <h1>Idioma API Dashboard</h1>
        
        <div class="stat">
          <h3>Usage This Month</h3>
          <p>${usage.total_tokens.toLocaleString()} / ${getLimitForTier(user.tier).toLocaleString()} tokens</p>
          <div class="progress">
            <div class="progress-bar" style="width: ${usage.percentage}%"></div>
          </div>
          <p>Cost: $${usage.total_cost_usd.toFixed(4)}</p>
        </div>
        
        <div class="stat">
          <h3>API Keys</h3>
          <ul>
            ${keys.map(k => `
              <li>
                ${k.name || 'Unnamed'} - 
                Created: ${k.created_at} - 
                Last used: ${k.last_used_at || 'Never'}
              </li>
            `).join('')}
          </ul>
          <button onclick="createNewKey()">Generate New Key</button>
        </div>
        
        <div class="stat">
          <h3>Subscription</h3>
          <p>Current tier: <strong>${user.tier}</strong></p>
          ${user.tier === 'free' ? `
            <p><a href="https://polar.sh/idioma">Upgrade for more tokens</a></p>
          ` : `
            <p><a href="https://polar.sh/idioma/subscriptions">Manage subscription</a></p>
          `}
        </div>
        
        <script>
          async function createNewKey() {
            const name = prompt('Enter a name for this API key:');
            if (!name) return;
            
            const response = await fetch('/api/keys', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ${apiKey}',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name })
            });
            
            const data = await response.json();
            if (data.key) {
              alert('New API key created: ' + data.key + '\\n\\nSave this key - it won\\'t be shown again!');
              location.reload();
            }
          }
        </script>
      </body>
    </html>
  `);
});
```

### Phase 3: SDK Integration (Week 3)

#### 3.1 Dual Mode SDK

**Implementation**:
```typescript
// sdk/src/Idioma.ts
export class Idioma {
  private mode: 'hosted' | 'byok';
  private apiKey?: string;
  private provider?: string;
  private baseUrl: string;

  constructor(config: IdiomaConfig) {
    if (config.apiKey?.startsWith('idioma_sk_')) {
      // Hosted mode - use Idioma API
      this.mode = 'hosted';
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl || 'https://api.idioma.dev';
    } else {
      // BYOK mode - use AI provider directly
      this.mode = 'byok';
      this.provider = config.provider || 'anthropic';
      this.apiKey = config.apiKey;
    }
  }

  async translateContent(params: TranslateParams): Promise<TranslateResult> {
    if (this.mode === 'hosted') {
      // Use Idioma API
      const response = await fetch(`${this.baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          throw new RateLimitError(error.message, error.retryAfter);
        }
        throw new ApiError(error.message);
      }
      
      return await response.json();
    } else {
      // Direct AI provider call (existing logic)
      return await this.translateWithProvider(params);
    }
  }
  
  // New method for hosted mode features
  async getUsageStats(): Promise<UsageStats | null> {
    if (this.mode !== 'hosted') {
      return null; // Not available in BYOK mode
    }
    
    const response = await fetch(`${this.baseUrl}/api/usage`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    return await response.json();
  }
}
```

#### 3.2 Migration Guide

**Documentation**:
```markdown
# Migrating to Hosted Mode

## Quick Start

1. Sign up at [polar.sh/idioma](https://polar.sh/idioma)
2. Get your API key from the dashboard
3. Update your code:

### Before (BYOK):
\`\`\`typescript
const idioma = new Idioma({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
});
\`\`\`

### After (Hosted):
\`\`\`typescript
const idioma = new Idioma({
  apiKey: process.env.IDIOMA_API_KEY // idioma_sk_xxx
});
\`\`\`

## Benefits
- No AI provider API keys needed
- Built-in rate limiting
- Usage tracking and analytics
- Single bill through Polar.sh
- Same API, zero code changes

## Keeping BYOK
You can always use your own keys - just keep using the old format!
```

### Phase 4: Deployment & Monitoring (Week 4)

#### 4.1 Infrastructure

**Deployment Architecture**:
```yaml
# fly.toml
app = "idioma-api"
primary_region = "sjc"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  max_machines_running = 3

[mounts]
  source = "idioma_data"
  destination = "/data"  # SQLite storage

[[services]]
  protocol = "tcp"
  internal_port = 3000
  
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
    
  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true
```

#### 4.2 Monitoring

**Health Checks**:
```typescript
// src/api/routes/health.ts
export const health = new Hono();

health.get('/health', async (c) => {
  const checks = {
    database: await checkDatabase(),
    polar: await checkPolarWebhook(),
    providers: await checkAiProviders()
  };
  
  const healthy = Object.values(checks).every(v => v);
  
  return c.json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    uptime: process.uptime(),
    version: pkg.version
  }, healthy ? 200 : 503);
});

health.get('/metrics', async (c) => {
  const metrics = await getMetrics();
  
  return c.text(`
# HELP idioma_requests_total Total number of requests
# TYPE idioma_requests_total counter
idioma_requests_total ${metrics.requests}

# HELP idioma_tokens_total Total tokens processed
# TYPE idioma_tokens_total counter
idioma_tokens_total ${metrics.tokens}

# HELP idioma_active_users Number of active users
# TYPE idioma_active_users gauge
idioma_active_users ${metrics.activeUsers}
  `);
});
```

## API Endpoints

### Public Endpoints

#### `POST /api/translate`
Translate content to target language.

**Request**:
```json
{
  "content": "Hello world",
  "sourceLocale": "en",
  "targetLocale": "es",
  "format": "string"
}
```

**Response**:
```json
{
  "translatedContent": "Hola mundo",
  "usage": {
    "inputTokens": 10,
    "outputTokens": 8,
    "totalTokens": 18
  },
  "remainingQuota": 9982,
  "cost": 0.000054
}
```

#### `GET /api/usage`
Get current usage statistics.

**Response**:
```json
{
  "month": "2024-12",
  "tokensUsed": 5420,
  "tokensLimit": 10000,
  "requestCount": 156,
  "totalCost": 0.01626,
  "tier": "free"
}
```

#### `POST /api/keys`
Create new API key.

**Request**:
```json
{
  "name": "Production Key"
}
```

**Response**:
```json
{
  "key": "idioma_sk_abc123...",
  "name": "Production Key",
  "createdAt": "2024-12-07T10:00:00Z"
}
```

## Security Considerations

### API Key Security
- Keys hashed with bcrypt before storage
- Rate limiting by IP and key
- Automatic suspension on abuse detection

### Data Privacy
- No translation content stored
- Only metadata logged (tokens, costs)
- GDPR compliant data deletion

### Infrastructure Security
- HTTPS only
- Webhook signature verification
- SQL injection prevention via prepared statements

## Success Metrics

### Technical Metrics
- API response time < 100ms (p95)
- 99.9% uptime
- Zero security incidents
- < 1% error rate

### Business Metrics
- 100+ active API keys in 3 months
- 20+ paid subscribers
- 50% month-over-month growth
- < $100/month infrastructure costs

### User Satisfaction
- NPS > 50
- < 24hr support response time
- 90% user retention rate

## Launch Plan

### Week 1: Core Development
- [ ] Implement API key management
- [ ] Build rate limiting system
- [ ] Create usage tracking
- [ ] Set up SQLite database

### Week 2: Integrations
- [ ] Polar.sh webhook handler
- [ ] Usage dashboard
- [ ] Email notifications
- [ ] Cost calculations

### Week 3: SDK & Documentation
- [ ] Update SDK for dual mode
- [ ] Write migration guide
- [ ] API documentation
- [ ] Example projects

### Week 4: Launch Preparation
- [ ] Deploy to Fly.io
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation review

### Launch Day
- [ ] ProductHunt launch
- [ ] Twitter/X announcement
- [ ] Dev.to article
- [ ] Reddit posts (r/programming, r/webdev)

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI provider outage | Medium | High | Multi-provider fallback |
| Abuse/spam | High | Medium | Strict rate limits, monitoring |
| Over capacity | Low | High | Auto-scaling, queue system |
| Payment issues | Low | Medium | Polar.sh handles billing |
| Data loss | Low | High | Daily SQLite backups |

## Future Enhancements

### Phase 5 (Month 2-3)
- Team accounts with shared billing
- Webhook endpoints for async translation
- Batch translation API
- Translation memory/glossaries

### Phase 6 (Month 4-6)
- Self-serve dashboard improvements
- Advanced analytics
- Custom model fine-tuning
- Enterprise SSO

## Conclusion

This minimal hosted API service provides a sustainable path for Idioma while maintaining its open-source ethos. By leveraging Polar.sh for billing and SQLite for simplicity, we can launch quickly with minimal operational overhead while providing real value to users who need API access.