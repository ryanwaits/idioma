import fs from 'fs/promises';
import path from 'path';
import { Config, LockFile, generateHash, generateOutputPath } from '../utils';
import { createAiClient } from '../ai';
import { findStrategy, translateFrontmatter } from '../parsers';

export async function translateFile(
  filePath: string,
  source: string,
  target: string,
  lock: LockFile,
  config: Config
): Promise<void> {
  // Read file content
  const content = await fs.readFile(filePath, 'utf-8');
  const currentHash = generateHash(content);

  // Check if file has changed
  if (lock.files[filePath] && lock.files[filePath].content === currentHash) {
    console.log(`Skipped (unchanged): ${filePath} -> ${target}`);
    return;
  }

  // Create AI client based on config
  const provider = config.translation?.provider || 'anthropic';
  const aiClient = createAiClient(provider);

  let translatedContent = '';

  // Check if content has frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const mainContent = frontmatterMatch[2];
    
    // Translate frontmatter
    const translatedFrontmatter = await translateFrontmatter(
      frontmatter,
      source,
      target,
      config,
      aiClient
    );
    
    // Find appropriate strategy for the file type
    const strategy = findStrategy(filePath);
    if (!strategy) {
      throw new Error(`No translation strategy found for file: ${filePath}`);
    }
    
    // Translate main content using strategy
    const translatedMain = await strategy.translate(
      mainContent,
      source,
      target,
      config,
      aiClient
    );
    
    translatedContent = `---\n${translatedFrontmatter}\n---\n${translatedMain}`;
  } else {
    // No frontmatter, translate entire content
    const strategy = findStrategy(filePath);
    if (!strategy) {
      throw new Error(`No translation strategy found for file: ${filePath}`);
    }
    
    translatedContent = await strategy.translate(
      content,
      source,
      target,
      config,
      aiClient
    );
  }

  // Generate output path and write translated content
  const outputPath = generateOutputPath(filePath, source, target);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, translatedContent);

  // Update lock file
  lock.files[filePath] = { content: currentHash };
  
  console.log(`Translated: ${filePath} -> ${outputPath}`);
}