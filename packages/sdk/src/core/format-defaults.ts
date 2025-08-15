/**
 * Convention-over-configuration defaults for all supported formats
 * These defaults are based on common patterns and best practices
 */

export interface FormatDefaults {
  // What attributes/fields to skip (everything else gets translated)
  skipAttributes?: {
    jsx?: string[];
    frontmatter?: string[];
  };
  // What tags/elements to skip entirely
  skipTags: string[];
  // Additional format-specific defaults
  [key: string]: any;
}

/**
 * Smart defaults for MDX files
 * Based on common documentation patterns
 */
export const MDX_DEFAULTS: FormatDefaults = {
  // Attributes to skip (everything else gets translated)
  skipAttributes: {
    jsx: [
      // Technical/structural attributes
      'className',
      'id',
      'key',
      'ref',
      'style',
      // URLs and paths
      'href',
      'src',
      'action',
      'formAction',
      'poster',
      // Form attributes
      'name',
      'type',
      'method',
      'encType',
      'target',
      // Data attributes (usually technical)
      'data-testid',
      'data-id',
      'data-key',
      'data-index',
      // Component/framework attributes
      'component',
      'as',
      'variant',
      'size',
      'color',
      // Event handlers
      'onClick',
      'onChange',
      'onSubmit',
      'onFocus',
      'onBlur',
      // Boolean/enum values
      'disabled',
      'hidden',
      'required',
      'autoFocus',
      'readOnly',
    ],
    frontmatter: [
      // Technical metadata
      'layout',
      'template',
      'permalink',
      'slug',
      'path',
      // Publishing metadata
      'published',
      'draft',
      'date',
      'updated',
      'modified',
      // Author/source info
      'author',
      'authors',
      'source',
      'originalUrl',
      // Technical settings
      'type',
      'component',
      'sidebar_position',
      'sidebar_class_name',
      // SEO technical fields
      'canonical',
      'robots',
      'index',
      'sitemap',
      // Development flags
      'llm',
      'hide_table_of_contents',
      'hide_title',
    ],
  },

  // Skip code-related components
  skipTags: ['code', 'Code', 'CodeBlock', 'pre', 'Pre', 'Mermaid', 'Math', 'Latex', 'GraphQL'],
};

/**
 * Smart defaults for JSON files
 * Based on i18n/config file patterns
 */
export const JSON_DEFAULTS: FormatDefaults = {
  skipTags: [],

  // Common non-translatable JSON keys
  skipKeys: [
    'id',
    'key',
    'uuid',
    'guid',
    'slug',
    'ref',
    'href',
    'url',
    'uri',
    'path',
    'route',
    'endpoint',
    'type',
    'kind',
    'category',
    'status',
    'state',
    'version',
    'timestamp',
    'date',
    'time',
    'datetime',
    'count',
    'total',
    'index',
    'offset',
    'limit',
    'width',
    'height',
    'size',
    'length',
    'duration',
    'lat',
    'lng',
    'latitude',
    'longitude',
    'coordinates',
    'email',
    'phone',
    'username',
    'password',
    'token',
    'api_key',
    'secret',
    'hash',
    'checksum',
    'mime_type',
    'content_type',
    'encoding',
    'charset',
  ],

  // Skip empty strings by default
  skipEmptyStrings: true,
};

/**
 * Smart defaults for YAML files
 * Similar to JSON but with YAML-specific considerations
 */
export const YAML_DEFAULTS: FormatDefaults = {
  ...JSON_DEFAULTS,
  preserveComments: true,
  preserveAnchors: true,
};

/**
 * Smart defaults for HTML files
 * Based on common web patterns
 */
export const HTML_DEFAULTS: FormatDefaults = {
  skipAttributes: [
    // Technical/structural attributes
    'class',
    'className',
    'id',
    'style',
    'data-*',
    // URLs and paths
    'href',
    'src',
    'action',
    'poster',
    'srcset',
    // Form attributes
    'name',
    'type',
    'method',
    'enctype',
    'target',
    // Boolean attributes
    'disabled',
    'hidden',
    'required',
    'readonly',
    'checked',
    // Event handlers
    'onclick',
    'onload',
    'onchange',
    'onsubmit',
  ],

  // Skip non-content elements
  skipTags: [
    'script',
    'style',
    'code',
    'pre',
    'kbd',
    'samp',
    'var',
    'svg',
    'math',
    'object',
    'embed',
    'iframe',
    'noscript',
    'template',
  ],

  // Preserve formatting
  preserveWhitespace: false,
  preserveEntities: true,
};

/**
 * Smart defaults for XML files
 * Based on common data/config patterns
 */
export const XML_DEFAULTS: FormatDefaults = {
  skipAttributes: [
    // Technical attributes
    'id',
    'key',
    'ref',
    'type',
    'class',
    'namespace',
    // URLs and paths
    'href',
    'src',
    'url',
    'path',
    // Schema/validation
    'xmlns',
    'xsi:type',
    'schemaLocation',
  ],

  skipTags: [
    'script',
    'style',
    'code',
    // Common technical XML elements
    'id',
    'key',
    'ref',
    'type',
    'class',
    'namespace',
  ],

  preserveCDATA: true,
  preserveComments: false,
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
        skipTags: [],
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
