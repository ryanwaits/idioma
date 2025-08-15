import { BaseTranslationStrategy, type ParseResult, type ValidationResult } from './base';

export class CSVTranslationStrategy extends BaseTranslationStrategy {
  private delimiter: string = ',';
  private headers: string[] = [];
  private translatableColumns: Set<string> = new Set();
  private rows: string[][] = [];

  canHandle(filePath: string): boolean {
    return filePath.endsWith('.csv');
  }

  getName(): string {
    return 'CSV';
  }

  validate(content: string): ValidationResult {
    try {
      const trimmed = content.trim();
      if (!trimmed || trimmed.length === 0) {
        return { valid: false, errors: [{ message: 'Empty CSV file' }] };
      }

      const lines = trimmed.split('\n');
      if (lines.length === 0) {
        return { valid: false, errors: [{ message: 'Empty CSV file' }] };
      }

      // Try to parse first line to detect delimiter
      this.detectDelimiter(content);

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: `Invalid CSV format: ${error}` }],
      };
    }
  }

  protected async parse(content: string): Promise<ParseResult> {
    const translatableContent = new Map();

    // Auto-detect delimiter
    this.delimiter = this.detectDelimiter(content);

    // Parse CSV content
    const lines = content.trim().split('\n');
    if (lines.length === 0) {
      return { translatableContent, metadata: {} };
    }

    // Extract headers
    this.headers = this.parseCSVLine(lines[0]);

    // Parse rows
    this.rows = lines.slice(1).map((line) => this.parseCSVLine(line));

    // Auto-detect translatable columns based on content
    this.translatableColumns = this.detectTranslatableColumns(this.headers, this.rows);

    // Extract translatable content
    this.rows.forEach((row, rowIndex) => {
      this.headers.forEach((header, colIndex) => {
        if (this.translatableColumns.has(header)) {
          const value = row[colIndex] || '';
          if (this.isTranslatableString(value)) {
            const path = `row${rowIndex}_col${colIndex}`;
            translatableContent.set(path, { value });
          }
        }
      });
    });

    return {
      translatableContent,
      metadata: {
        delimiter: this.delimiter,
        headers: this.headers,
        translatableColumns: Array.from(this.translatableColumns),
        rows: this.rows,
      },
    };
  }

  protected async reconstruct(translations: Map<string, string>, metadata: any): Promise<string> {
    const { delimiter, headers, rows } = metadata;

    // Build CSV output
    const lines: string[] = [];

    // Add header row
    lines.push(this.formatCSVLine(headers, delimiter));

    // Add data rows with translations
    rows.forEach((row: string[], rowIndex: number) => {
      const translatedRow = row.map((value, colIndex) => {
        const path = `row${rowIndex}_col${colIndex}`;
        return translations.get(path) || value;
      });
      lines.push(this.formatCSVLine(translatedRow, delimiter));
    });

    return lines.join('\n');
  }

  private detectDelimiter(content: string): string {
    // Common delimiters to check
    const delimiters = [',', ';', '\t', '|'];
    const firstLine = content.split('\n')[0];

    if (!firstLine) return ',';

    // Count occurrences of each delimiter
    const counts = delimiters.map((delim) => ({
      delimiter: delim,
      count: (firstLine.match(new RegExp(`\\${delim}`, 'g')) || []).length,
    }));

    // Return the delimiter with the highest count
    const best = counts.reduce((prev, curr) => (curr.count > prev.count ? curr : prev));

    return best.count > 0 ? best.delimiter : ',';
  }

  private detectTranslatableColumns(headers: string[], rows: string[][]): Set<string> {
    const translatable = new Set<string>();

    headers.forEach((header, index) => {
      // Skip columns that look like IDs, codes, or technical fields
      const headerLower = header.toLowerCase();
      if (
        headerLower.includes('id') ||
        headerLower.includes('code') ||
        headerLower.includes('key') ||
        headerLower.includes('url') ||
        headerLower.includes('email') ||
        headerLower.includes('phone') ||
        headerLower.includes('date') ||
        headerLower.includes('price') ||
        headerLower.includes('amount') ||
        headerLower.includes('quantity') ||
        headerLower.includes('sku') ||
        headerLower.includes('isbn')
      ) {
        return;
      }

      // Check if column contains translatable content
      const samples = rows
        .slice(0, 10)
        .map((row) => row[index])
        .filter(Boolean);
      const hasTranslatableContent = samples.some((sample) => this.isTranslatableString(sample));

      if (hasTranslatableContent) {
        translatable.add(header);
      }
    });

    // Always include common content columns
    const contentColumns = [
      'title',
      'name',
      'description',
      'content',
      'text',
      'message',
      'label',
      'category',
      'tags',
    ];
    headers.forEach((header) => {
      if (contentColumns.some((col) => header.toLowerCase().includes(col))) {
        translatable.add(header);
      }
    });

    return translatable;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === this.delimiter && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Don't forget the last field
    result.push(current.trim());

    return result;
  }

  private formatCSVLine(values: string[], delimiter: string = this.delimiter): string {
    return values
      .map((value) => {
        // Quote values that contain delimiter, quotes, or newlines
        if (
          value.includes(delimiter) ||
          value.includes('"') ||
          value.includes('\n') ||
          value.includes('\r')
        ) {
          // Escape quotes by doubling them
          const escaped = value.replace(/"/g, '""');
          return `"${escaped}"`;
        }
        return value;
      })
      .join(delimiter);
  }
}
