import path from 'path';

export function replaceLocaleInPattern(pattern: string, oldLocale: string, newLocale: string): string {
  // Replace [locale] placeholder
  if (pattern.includes('[locale]')) {
    return pattern.replace(/\[locale\]/g, newLocale);
  }
  
  // Replace /oldLocale/ with /newLocale/ in path
  const regex = new RegExp(`/${oldLocale}/`, 'g');
  return pattern.replace(regex, `/${newLocale}/`);
}

export function generateOutputPath(sourcePath: string, sourceLocale: string, targetLocale: string): string {
  // Check if the source path has [locale] placeholder
  if (sourcePath.includes('[locale]')) {
    return sourcePath.replace(/\[locale\]/g, targetLocale);
  }

  // If source and target are the same, return the original path
  if (sourceLocale === targetLocale) {
    return sourcePath;
  }

  // Replace sourceLocale with targetLocale in the path
  const regex = new RegExp(`/${sourceLocale}/`, 'g');
  let outputPath = sourcePath.replace(regex, `/${targetLocale}/`);

  // If no replacement happened, the source locale wasn't in the path
  // In this case, we should not add a locale directory
  if (outputPath === sourcePath) {
    // For files without locale in path, we shouldn't translate to the same directory
    console.warn(`Warning: File ${sourcePath} doesn't contain source locale '${sourceLocale}' in its path`);
  }

  return outputPath;
}