import * as path from 'node:path';

/**
 * Detect file format from file extension
 */
export function detectFormat(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.mdx':
    case '.md':
      return 'mdx';
    case '.json':
      return 'json';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.html':
    case '.htm':
      return 'html';
    case '.xml':
      return 'xml';
    case '.ts':
    case '.tsx':
    case '.js':
    case '.jsx':
      return 'javascript';
    case '.csv':
      return 'csv';
    default:
      return null;
  }
}

/**
 * Group files by their detected format
 */
export function groupFilesByFormat(filePaths: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const filePath of filePaths) {
    const format = detectFormat(filePath);
    if (format) {
      if (!grouped[format]) {
        grouped[format] = [];
      }
      grouped[format].push(filePath);
    }
  }

  return grouped;
}

/**
 * Expand a files config into format-specific configs
 * Handles both flat include array and format-specific configs
 */
export function expandFilesConfig(filesConfig: any): Record<string, any> {
  // If it's already in the format-specific structure, return as-is
  if (!filesConfig.include || typeof filesConfig.include[0] !== 'string') {
    return filesConfig;
  }

  // It's a flat include array - expand it by format
  const expanded: Record<string, any> = {};
  const byFormat = groupFilesByFormat(filesConfig.include);

  for (const [format, patterns] of Object.entries(byFormat)) {
    expanded[format] = {
      include: patterns,
      exclude: filesConfig.exclude,
    };
  }

  return expanded;
}
