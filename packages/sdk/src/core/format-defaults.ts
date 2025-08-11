/**
 * Convention-over-configuration defaults for all supported formats
 * These defaults are based on common patterns and best practices
 */

export interface FormatDefaults {
  // What attributes/fields contain translatable content
  translatableAttributes: string[];
  // What tags/elements to skip entirely
  skipTags: string[];
  // What patterns indicate non-translatable content
  skipPatterns: RegExp[];
  // Additional format-specific defaults
  [key: string]: any;
}

/**
 * Smart defaults for MDX files
 * Based on common documentation patterns
 */
export const MDX_DEFAULTS: FormatDefaults = {
  // Common translatable attributes in JSX components
  translatableAttributes: [
    // Content attributes
    'title', 'description', 'label', 'placeholder', 'alt',
    // Accessibility
    'aria-label', 'aria-description', 'aria-placeholder',
    // Common component props
    'heading', 'caption', 'tooltip', 'hint', 'help', 'message',
    'summary', 'subtitle', 'text', 'content', 'value',
    // Data attributes often used for tooltips/content
    'data-tooltip', 'data-title', 'data-description', 'data-label'
  ],
  
  // Frontmatter fields commonly containing translatable content
  frontmatterFields: [
    'title', 'description', 'sidebarTitle', 'sidebar_label',
    'keywords', 'summary', 'excerpt', 'subtitle',
    'meta_description', 'og_description', 'twitter_description'
  ],
  
  // Skip code-related components
  skipTags: [
    'code', 'Code', 'CodeBlock', 'pre', 'Pre',
    'Mermaid', 'Math', 'Latex', 'GraphQL'
  ],
  
  skipPatterns: [
    /^[A-Z_]+$/,                    // CONSTANTS
    /^[a-z]+_[a-z]+$/,              // snake_case (likely code)
    /^[A-Z][a-z]+[A-Z]/,            // PascalCase (likely components/classes)
    /^\d+$/,                        // Pure numbers
    /^#[0-9A-Fa-f]{3,8}$/,          // Hex colors
    /^(true|false|null|undefined)$/, // Literals
    /^https?:\/\//,                 // URLs
    /^[\.\/\\]/,                    // File paths
    /^npm |yarn |pnpm |bun /,       // Package manager commands
    /^[a-z]+@[\d\.]+$/,             // Package versions
  ]
};

/**
 * Smart defaults for JSON files
 * Based on i18n/config file patterns
 */
export const JSON_DEFAULTS: FormatDefaults = {
  translatableAttributes: [], // JSON uses path-based selection
  skipTags: [],
  
  // Common non-translatable JSON keys
  skipKeys: [
    'id', 'key', 'uuid', 'guid', 'slug', 'ref', 'href',
    'url', 'uri', 'path', 'route', 'endpoint',
    'type', 'kind', 'category', 'status', 'state',
    'version', 'timestamp', 'date', 'time', 'datetime',
    'count', 'total', 'index', 'offset', 'limit',
    'width', 'height', 'size', 'length', 'duration',
    'lat', 'lng', 'latitude', 'longitude', 'coordinates',
    'email', 'phone', 'username', 'password', 'token',
    'api_key', 'secret', 'hash', 'checksum',
    'mime_type', 'content_type', 'encoding', 'charset'
  ],
  
  skipPatterns: [
    /^[A-Z_]+$/,                    // CONSTANTS
    /^[0-9a-f]{8}-[0-9a-f]{4}-/,    // UUIDs
    /^[A-Z]{2,}$/,                  // Country/language codes
    /^\d+$/,                        // Pure numbers
    /^#[0-9A-Fa-f]{3,8}$/,          // Hex colors
    /^(true|false|null)$/,          // JSON literals
    /^https?:\/\//,                 // URLs
    /^[a-zA-Z0-9._%+-]+@/,          // Emails
    /^\+?\d{10,}$/,                 // Phone numbers
  ],
  
  // Skip empty strings by default
  skipEmptyStrings: true
};

/**
 * Smart defaults for YAML files
 * Similar to JSON but with YAML-specific considerations
 */
export const YAML_DEFAULTS: FormatDefaults = {
  ...JSON_DEFAULTS,
  preserveComments: true,
  preserveAnchors: true,
  
  // Additional YAML-specific skip patterns
  skipPatterns: [
    ...JSON_DEFAULTS.skipPatterns,
    /^<<\*\w+$/,                    // YAML anchors
    /^!\w+/,                        // YAML tags
  ]
};

/**
 * Smart defaults for HTML files
 * Based on common web patterns
 */
export const HTML_DEFAULTS: FormatDefaults = {
  translatableAttributes: [
    // Content attributes
    'alt', 'title', 'placeholder', 'label', 'value',
    // Accessibility
    'aria-label', 'aria-description', 'aria-placeholder', 'aria-valuetext',
    // Data attributes commonly used for content
    'data-tooltip', 'data-title', 'data-description', 'data-label',
    'data-message', 'data-text', 'data-content',
    // Meta tags
    'content' // but only for description/og/twitter metas
  ],
  
  // Skip non-content elements
  skipTags: [
    'script', 'style', 'code', 'pre', 'kbd', 'samp', 'var',
    'svg', 'math', 'object', 'embed', 'iframe',
    'noscript', 'template'
  ],
  
  // Skip technical classes/IDs
  skipClasses: [
    /^js-/,                         // JavaScript hooks
    /^is-/, /^has-/,                // State classes
    /^u-/,                          // Utility classes
    /^[a-z]+-\d+$/,                 // Generated classes
  ],
  
  skipPatterns: [
    /^\s*$/,                        // Whitespace only
    /^[0-9\s\-\(\)\+]+$/,           // Phone numbers
    /^[\w\.\-]+@[\w\.\-]+\.\w+$/,  // Emails
    /^https?:\/\//,                 // URLs
    /^#[0-9A-Fa-f]{3,8}$/,          // Hex colors
    /^\d+px$/,                      // CSS values
  ],
  
  // Preserve formatting
  preserveWhitespace: false,
  preserveEntities: true
};

/**
 * Smart defaults for XML files
 * Based on common data/config patterns
 */
export const XML_DEFAULTS: FormatDefaults = {
  translatableAttributes: [
    'label', 'title', 'description', 'tooltip', 'help',
    'message', 'text', 'display', 'caption', 'heading',
    'prompt', 'placeholder', 'value'
  ],
  
  skipTags: [
    'script', 'style', 'code',
    // Common technical XML elements
    'id', 'key', 'ref', 'type', 'class', 'namespace'
  ],
  
  skipPatterns: [
    /^[A-Z_]+$/,                    // CONSTANTS
    /^[0-9a-f-]{36}$/,              // UUIDs
    /^\d+$/,                        // Pure numbers
    /^(true|false|null)$/,          // Literals
    /^https?:\/\//,                 // URLs
    /^[A-Z]{2,3}$/,                 // Country/language codes
    /^\d{4}-\d{2}-\d{2}/,           // Dates
  ],
  
  preserveCDATA: true,
  preserveComments: false
};

/**
 * Get smart defaults for a file type
 */
export function getFormatDefaults(fileType: string): FormatDefaults {
  switch (fileType.toLowerCase()) {
    case 'mdx':
    case 'md':
      return MDX_DEFAULTS;
    case 'json':
      return JSON_DEFAULTS;
    case 'yaml':
    case 'yml':
      return YAML_DEFAULTS;
    case 'html':
    case 'htm':
      return HTML_DEFAULTS;
    case 'xml':
      return XML_DEFAULTS;
    default:
      // Return minimal defaults for unknown formats
      return {
        translatableAttributes: [],
        skipTags: [],
        skipPatterns: []
      };
  }
}

/**
 * Merge user config with smart defaults
 * User config takes precedence but defaults fill in the gaps
 */
export function mergeWithDefaults<T extends Record<string, any>>(
  userConfig: Partial<T> | undefined,
  defaults: T
): T {
  if (!userConfig) return defaults;
  
  const merged = { ...defaults };
  
  for (const [key, value] of Object.entries(userConfig)) {
    if (Array.isArray(value) && Array.isArray(defaults[key])) {
      // For arrays, combine user values with defaults (user first)
      merged[key] = [...new Set([...value, ...defaults[key]])];
    } else if (value !== undefined) {
      // For other values, user config overrides
      merged[key] = value;
    }
  }
  
  return merged;
}

/**
 * Check if a value should be translated based on smart patterns
 */
export function shouldTranslate(
  value: string,
  format: string,
  context?: { key?: string; tag?: string; attribute?: string }
): boolean {
  const defaults = getFormatDefaults(format);
  
  // Check skip patterns
  for (const pattern of defaults.skipPatterns || []) {
    if (pattern.test(value)) return false;
  }
  
  // Check skip keys for JSON/YAML
  if ((format === 'json' || format === 'yaml') && context?.key) {
    if (defaults.skipKeys?.includes(context.key)) return false;
  }
  
  // Check skip tags
  if (context?.tag && defaults.skipTags.includes(context.tag)) {
    return false;
  }
  
  // Additional smart checks
  
  // Skip if too short (likely not meaningful text)
  if (value.trim().length < 2) return false;
  
  // Skip if no letters (likely technical value)
  if (!/[a-zA-Z]/.test(value)) return false;
  
  // Skip if looks like code (has common code patterns)
  if (/^(const|let|var|function|class|import|export|return)\s/.test(value)) return false;
  if (/\(\s*\)\s*=>/.test(value)) return false; // Arrow functions
  if (/^\s*\/\/.+/.test(value)) return false; // Comments
  
  // Skip version numbers
  if (/^v?\d+\.\d+(\.\d+)?/.test(value)) return false;
  
  // Skip if mostly special characters
  const letterCount = (value.match(/[a-zA-Z]/g) || []).length;
  const specialCount = (value.match(/[^a-zA-Z0-9\s]/g) || []).length;
  if (specialCount > letterCount * 2) return false;
  
  return true;
}