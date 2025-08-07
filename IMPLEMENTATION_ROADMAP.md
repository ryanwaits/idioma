# Idioma Implementation Roadmap

## Current State (December 2024)

### ✅ CLI Package - Production Ready
- Users provide their own API keys (Anthropic/OpenAI)
- Full GitHub Actions integration
- Cost tracking and reporting
- Smart caching with lock files
- **Use Case**: Open-source projects, documentation sites, teams wanting self-hosted translation

### 🟡 SDK Package - Functional but Limited
- Works with user-provided API keys
- No hosted service integration
- No authentication system
- **Current Use Case**: Developers who want programmatic access with their own keys

### 🟡 API Package - Basic Implementation
- REST endpoints work
- Basic Unkey authentication (demo only)
- No real user management or billing
- **Current Use Case**: Teams wanting to self-host an API server

## Recommended Path Forward

### Phase 1: Enhanced "Bring Your Own Key" Model (Current)
**No additional work needed - this is what we have now**

Perfect for:
- Open-source projects
- Documentation sites  
- Teams with existing API keys
- Cost-conscious users (~90% cheaper than SaaS)

### Phase 2: Hosted Service (If You Want SaaS)

#### 2A. Minimal SaaS (Recommended First Step)
**Implementation: 1-2 weeks**

```typescript
// What users would experience:
import { Idioma } from 'idioma';

const idioma = new Idioma({
  apiKey: 'idioma_sk_xxxx', // Your service key, not OpenAI/Anthropic
});

// You handle the AI calls on your servers
```

**Required Components:**

1. **Authentication Service**
   ```typescript
   // src/api/services/auth.ts
   class AuthService {
     async createUser(email: string)
     async createApiKey(userId: string)
     async validateApiKey(key: string)
   }
   ```

2. **Usage Tracking**
   ```typescript
   // src/api/services/usage.ts
   class UsageService {
     async trackUsage(userId: string, tokens: number)
     async getUsage(userId: string, period: 'month')
     async checkQuota(userId: string): boolean
   }
   ```

3. **Database Schema**
   ```sql
   -- users table
   CREATE TABLE users (
     id TEXT PRIMARY KEY,
     email TEXT UNIQUE,
     created_at TIMESTAMP
   );

   -- api_keys table
   CREATE TABLE api_keys (
     key TEXT PRIMARY KEY,
     user_id TEXT REFERENCES users(id),
     name TEXT,
     created_at TIMESTAMP
   );

   -- usage table
   CREATE TABLE usage (
     id TEXT PRIMARY KEY,
     user_id TEXT REFERENCES users(id),
     tokens_used INTEGER,
     cost DECIMAL,
     created_at TIMESTAMP
   );
   ```

4. **Billing Integration**
   ```typescript
   // Stripe integration
   class BillingService {
     async createCustomer(userId: string)
     async recordUsage(customerId: string, amount: number)
     async createUsageRecord(subscription, quantity, timestamp)
   }
   ```

#### 2B. Full SaaS Platform
**Implementation: 4-6 weeks**

Additional features:
- Web dashboard
- Team management
- Usage analytics
- Multiple API keys per account
- Webhook integrations
- Custom models/fine-tuning

## Pragmatic Use Cases by Package

### CLI Use Cases (Already Working)
1. **Documentation Sites**
   - MDX/Markdown translation
   - GitHub Actions automation
   - Version control integration

2. **Static Site Generators**
   - Next.js, Astro, Docusaurus
   - Build-time translation
   - Incremental updates

### SDK Use Cases (Needs Decision)

#### Option 1: Keep "Bring Your Own Key"
```typescript
// User provides their own AI API key
const idioma = new Idioma({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

**Best for:**
- Internal tools
- Prototypes
- Cost-sensitive applications

#### Option 2: Hosted Service
```typescript
// User uses your service
const idioma = new Idioma({
  apiKey: process.env.IDIOMA_API_KEY // Your service key
});
```

**Best for:**
- SaaS products
- Enterprise teams
- Users wanting simplified billing

### API Use Cases

#### Current (Self-Hosted)
- Teams run their own API server
- Use their own AI keys
- Full control over infrastructure

#### Future (Hosted)
- Multi-tenant SaaS API
- Usage-based billing
- Team collaboration features

## Decision Matrix

| Feature | BYOK (Current) | Minimal SaaS | Full SaaS |
|---------|---------------|--------------|-----------|
| Implementation Time | ✅ Done | 1-2 weeks | 4-6 weeks |
| Monthly Cost to Run | $0 | ~$50-100 | ~$200-500 |
| Revenue Potential | $0 | $500-5k/mo | $5k-50k/mo |
| Maintenance Burden | Low | Medium | High |
| User Experience | Technical | Good | Excellent |
| Market Size | Large | Medium | Small-Medium |

## Recommended Next Steps

### If you want to stay open-source focused:
1. **Keep current model** (Bring Your Own Key)
2. **Improve documentation** and examples
3. **Build community** around the tool
4. **Add more providers** (Gemini, Claude, Mistral)
5. **Add more file formats** (JSON, YAML, HTML)

### If you want to build a business:
1. **Start with Minimal SaaS** (1-2 weeks)
   - Add Supabase/Postgres for users
   - Add Stripe for usage billing
   - Keep it simple: usage-based pricing only

2. **Test market fit** (1 month)
   - Launch on Product Hunt
   - Get 10-20 paying customers
   - Iterate based on feedback

3. **Then expand** if validated:
   - Add dashboard
   - Add team features
   - Add enterprise features

## Quick Implementation Guides

### Adding Basic Auth to API (Using Supabase)

```typescript
// 1. Install Supabase
bun add @supabase/supabase-js

// 2. Update API auth middleware
// src/api/middleware/auth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function authenticateRequest(apiKey: string) {
  // Validate API key
  const { data: keyData } = await supabase
    .from('api_keys')
    .select('user_id, active')
    .eq('key', apiKey)
    .single();
    
  if (!keyData?.active) {
    throw new Error('Invalid API key');
  }
  
  // Track usage
  await supabase.from('usage').insert({
    user_id: keyData.user_id,
    endpoint: 'translate',
    timestamp: new Date().toISOString()
  });
  
  return keyData.user_id;
}
```

### Adding Stripe Billing

```typescript
// 1. Install Stripe
bun add stripe

// 2. Create billing service
// src/api/services/billing.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function reportUsage(
  userId: string, 
  tokens: number
) {
  // Get user's Stripe subscription
  const { data: user } = await supabase
    .from('users')
    .select('stripe_subscription_id')
    .eq('id', userId)
    .single();
    
  if (user?.stripe_subscription_id) {
    // Report usage to Stripe
    await stripe.subscriptionItems.createUsageRecord(
      user.stripe_subscription_id,
      {
        quantity: tokens,
        timestamp: Math.floor(Date.now() / 1000)
      }
    );
  }
}
```

## The Most Pragmatic Path

**My recommendation**: Stay with the "Bring Your Own Key" model for now.

**Why?**
1. It's already working
2. No infrastructure costs
3. No billing headaches
4. Larger addressable market
5. Can always add SaaS layer later

**Focus instead on:**
1. Making the best translation tool
2. Building community
3. Getting users
4. Learning what features they actually want

Once you have 100+ active users, then consider adding a hosted option based on what they're asking for.