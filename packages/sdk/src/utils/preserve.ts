export interface PreserveRule {
  type: 'term' | 'pattern';
  value: string | RegExp;
  original: string;
}

/**
 * Parse preserve configuration into structured rules
 */
export function parsePreserveRules(preserve: string[] = []): PreserveRule[] {
  return preserve.map((rule) => {
    // Auto-detect if it's a regex pattern
    const isRegex = rule.startsWith('/') || /[\^$.*+?()[\]{}|\\]/.test(rule);

    if (isRegex) {
      // Remove leading/trailing slashes if present
      const pattern = rule.startsWith('/') && rule.endsWith('/') ? rule.slice(1, -1) : rule;

      return {
        type: 'pattern' as const,
        value: new RegExp(pattern, 'i'), // Case insensitive by default
        original: rule,
      };
    } else {
      return {
        type: 'term' as const,
        value: rule,
        original: rule,
      };
    }
  });
}

/**
 * Check if a text node should be skipped entirely based on preserve patterns
 */
export function shouldSkipNode(text: string, rules: PreserveRule[]): boolean {
  const trimmedText = text.trim();
  if (!trimmedText) return false;

  return rules.some((rule) => {
    if (rule.type === 'pattern') {
      return (rule.value as RegExp).test(trimmedText);
    }
    // For terms, only skip if the entire text is just that term
    return trimmedText === rule.value;
  });
}

/**
 * Get list of terms that should be preserved within translated text
 * (not including patterns, which are for node skipping)
 */
export function getPreservedTerms(rules: PreserveRule[]): string[] {
  return rules.filter((rule) => rule.type === 'term').map((rule) => rule.value as string);
}

/**
 * Get pattern rules for node skipping
 */
export function getPatternRules(rules: PreserveRule[]): RegExp[] {
  return rules.filter((rule) => rule.type === 'pattern').map((rule) => rule.value as RegExp);
}

/**
 * Smart patterns that should always be preserved automatically
 * These represent common technical patterns that shouldn't be translated
 */
const SMART_PRESERVE_PATTERNS = [
  // API endpoints and HTTP methods in headers
  /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\//i, // "POST /api/translate"
  /^\/api\/[\w\-/]+$/, // "/api/anything" (full path only)
  /^\/v\d+\/[\w\-/]+$/, // "/v1/users" (full versioned path only)

  // Common technical patterns (more specific)
  /^\/[\w\-./]+$/, // Unix-style paths (full line only)
  /localhost:\d+/, // localhost:3000

  // Technical identifiers (more specific)
  /\b[A-Z][A-Z0-9_]{2,}[A-Z0-9]\b/, // CONSTANT_CASE (3+ chars)
  /process\.env\.[A-Z_]+/, // process.env.VAR (uppercase only)
  /\$\{[\w.]+\}/, // ${variable} (stricter)

  // Code-like patterns (more specific)
  /^\w+\(\)$/, // function() (full line only)
  /^\w+\[\]$/, // array[] (full line only)
  /^@[\w/-]+$/, // @imports/scoped-packages (full line only)
];

/**
 * Check if text matches any smart preserve pattern
 */
export function hasSmartPreservePattern(text: string): boolean {
  const trimmed = text.trim();
  return SMART_PRESERVE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Format preserved terms for inclusion in AI prompt
 */
export function formatPreservedTermsForPrompt(terms: string[]): string {
  if (terms.length === 0) return '';

  return `NEVER translate these terms - keep them EXACTLY as written: ${terms.join(', ')}`;
}
