import { glob } from 'glob';
import { minimatch } from 'minimatch';
import * as path from 'path';
import {
  aggregateUsage,
  type Config,
  calculateCost,
  formatTokenCount,
  type LockFile,
  type TokenUsage,
} from '../utils';
import { detectFormat } from '../utils/format-detector';
import { type TranslateFileOptions, translateFile } from './translate-file';

export interface ProcessFilesResult {
  lock: LockFile;
  totalUsage?: TokenUsage;
}

/**
 * Filter files based on exclude patterns using minimatch
 */
async function filterExcludedFiles(
  files: string[],
  excludePatterns: string[],
  sourceLocale: string
): Promise<string[]> {
  return files.filter((file) => {
    for (const excludePattern of excludePatterns) {
      const excludeGlob = excludePattern.replace(/\[locale\]/g, sourceLocale);
      if (minimatch(file, excludeGlob)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Format syntax errors for XML/HTML files with helpful suggestions
 */
function formatSyntaxError(file: string, error: Error): string {
  const fileName = path.basename(file);
  const fileExt = path.extname(file).toLowerCase();

  // Extract line and column information from error message
  const lineMatch = error.message.match(/[Ll]ine:\s*(\d+)/);
  const columnMatch = error.message.match(/[Cc]olumn:\s*(\d+)/);
  const charMatch = error.message.match(/[Cc]har:\s*(.)/);

  let errorMsg = `\n✖ Failed: ${fileName}\n`;
  errorMsg += `  Syntax Error: ${error.message.split('\n')[0]}\n`;

  if (lineMatch && columnMatch) {
    errorMsg += `  Location: Line ${lineMatch[1]}, Column ${columnMatch[1]}\n`;
  }

  // Provide helpful suggestions based on error type
  if (error.message.includes('Invalid character in entity name')) {
    errorMsg += `\n  💡 Suggestion: Escape special characters in your ${fileExt} file:\n`;
    errorMsg += '     • Replace & with &amp;\n';
    errorMsg += '     • Replace < with &lt;\n';
    errorMsg += '     • Replace > with &gt;\n';
    errorMsg += '     • Replace " with &quot; (in attribute values)\n';
    errorMsg += "     • Replace ' with &apos; (in attribute values)\n";

    if (charMatch && charMatch[1] === ' ') {
      errorMsg += '\n  ⚠️  The error appears to be an unescaped "&" character.\n';
      errorMsg +=
        '     Check for phrases like "Home & Garden" and replace with "Home &amp; Garden"\n';
    }
  } else if (error.message.includes('Unclosed') || error.message.includes('unclosed')) {
    errorMsg += `\n  💡 Suggestion: Check for unclosed tags in your ${fileExt} file.\n`;
    errorMsg += '     Every opening tag needs a matching closing tag.\n';
  } else if (error.message.includes('Unexpected end') || error.message.includes('unexpected end')) {
    errorMsg += `\n  💡 Suggestion: Your ${fileExt} file appears to be incomplete.\n`;
    errorMsg += '     Check that all tags are properly closed.\n';
  } else if (error.message.includes('mismatch') || error.message.includes('Mismatch')) {
    errorMsg += "\n  💡 Suggestion: Opening and closing tags don't match.\n";
    errorMsg += '     Ensure <tagname> is closed with </tagname>\n';
  }

  if (fileExt === '.xml') {
    errorMsg += '\n  📝 You can validate your XML at: https://www.xmlvalidation.com/\n';
  } else if (fileExt === '.html' || fileExt === '.htm') {
    errorMsg += '\n  📝 You can validate your HTML at: https://validator.w3.org/\n';
  }

  return errorMsg;
}

export async function processFiles(
  config: Config,
  lock: LockFile,
  options: TranslateFileOptions = {}
): Promise<ProcessFilesResult> {
  const sourceLocale = config.locale.source;
  const targetLocales = config.locale.targets;

  if (targetLocales.length === 0) {
    throw new Error('No target locales configured. Run "idioma add <locale>" first.');
  }

  const allUsages: TokenUsage[] = [];

  // Get the include patterns (handle both array and object formats)
  const includePatterns = Array.isArray(config.files) ? config.files : config.files?.include || [];
  const excludePatterns = !Array.isArray(config.files) ? config.files?.exclude || [] : [];

  // Process files from the include patterns
  if (includePatterns.length > 0) {
    for (const pattern of includePatterns) {
      const isPatternObject = typeof pattern === 'object' && 'source' in pattern;
      const sourcePattern = isPatternObject
        ? pattern.source.replace(/\[locale\]/g, sourceLocale)
        : pattern.replace(/\[locale\]/g, sourceLocale);
      const customTarget = isPatternObject ? pattern.target : undefined;

      // Get all files matching the source pattern
      const files = await glob(sourcePattern);

      // Filter out excluded files if exclude patterns are provided
      const filteredFiles =
        excludePatterns.length > 0
          ? await filterExcludedFiles(files, excludePatterns, sourceLocale)
          : files;

      // Process each file for each target locale
      for (const file of filteredFiles) {
        // Auto-detect format from file extension
        const format = detectFormat(file);
        if (!format) continue; // Skip unsupported formats

        for (const targetLocale of targetLocales) {
          try {
            const result = await translateFile(file, sourceLocale, targetLocale, lock, config, {
              ...options,
              customTarget,
              sourcePattern: isPatternObject ? pattern.source : undefined,
            });
            if (result.usage) {
              allUsages.push(result.usage);
            }
          } catch (error) {
            // Check if it's a parsing/syntax error for XML/HTML files
            const fileExt = path.extname(file).toLowerCase();
            if (
              error instanceof Error &&
              (fileExt === '.xml' || fileExt === '.html' || fileExt === '.htm') &&
              (error.message.includes('Failed to parse') ||
                error.message.includes('Invalid') ||
                error.message.includes('Unclosed') ||
                error.message.includes('mismatch'))
            ) {
              console.error(formatSyntaxError(file, error));
            } else {
              // Default error handling for other errors
              console.error(`Error translating ${file} to ${targetLocale}:`, error);
            }
            // Continue with other files
          }
        }
      }
    }
  }

  // Aggregate total usage
  const totalUsage = allUsages.length > 0 ? aggregateUsage(allUsages) : undefined;

  // Display total cost if enabled
  if (options.showCosts && totalUsage && totalUsage.totalTokens > 0) {
    const provider = config.translation?.provider || 'anthropic';
    const model = config.translation?.model;
    const cost = calculateCost(totalUsage, provider, model);
    console.log(
      `\nTotal cost: ${cost.formattedCost} (${formatTokenCount(totalUsage.totalTokens)} tokens)`
    );
  }

  return { lock, totalUsage };
}

export async function getFilesToTranslate(config: Config, patterns?: string[]): Promise<string[]> {
  const filesToProcess: string[] = [];

  if (patterns && patterns.length > 0) {
    // Use provided patterns
    for (const pattern of patterns) {
      const files = await glob(pattern);
      filesToProcess.push(...files);
    }
  } else {
    // Use patterns from config (handle both array and object formats)
    const includePatterns = Array.isArray(config.files)
      ? config.files
      : config.files?.include || [];

    for (const pattern of includePatterns) {
      const files = await glob(pattern);
      filesToProcess.push(...files);
    }
  }

  // Remove duplicates
  return [...new Set(filesToProcess)];
}
