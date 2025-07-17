import fs from 'fs/promises';
import path from 'path';
import { Config, LockFile, generateHash, generateOutputPath, TokenUsage, aggregateUsage, calculateCost, formatCost } from '../utils';
import { createAiClient } from '../ai';
import { findStrategy, translateFrontmatter } from '../parsers';

export interface TranslateFileOptions {
  showCosts?: boolean;
}

export interface TranslateFileResult {
  usage?: TokenUsage;
}

export async function translateFile(
  filePath: string,
  source: string,
  target: string,
  lock: LockFile,
  config: Config,
  options: TranslateFileOptions = {}
): Promise<TranslateFileResult> {
  // Read file content
  const content = await fs.readFile(filePath, 'utf-8');
  const currentHash = generateHash(content);

  // Check if file has changed
  if (lock.files[filePath] && lock.files[filePath].content === currentHash) {
    console.log(`Skipped (unchanged): ${filePath} -> ${target}`);
    return { usage: undefined };
  }

  // Create AI client based on config
  const provider = config.translation?.provider || 'anthropic';
  const aiClient = createAiClient(provider);

  let translatedContent = '';
  const usages: TokenUsage[] = [];

  // Check if content has frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const mainContent = frontmatterMatch[2];
    
    // Translate frontmatter
    const frontmatterResult = await translateFrontmatter(
      frontmatter,
      source,
      target,
      config,
      aiClient
    );
    usages.push(frontmatterResult.usage);
    
    // Find appropriate strategy for the file type
    const strategy = findStrategy(filePath);
    if (!strategy) {
      throw new Error(`No translation strategy found for file: ${filePath}`);
    }
    
    // Translate main content using strategy
    const mainResult = await strategy.translate(
      mainContent,
      source,
      target,
      config,
      aiClient
    );
    usages.push(mainResult.usage);
    
    translatedContent = `---\n${frontmatterResult.content}\n---\n${mainResult.content}`;
  } else {
    // No frontmatter, translate entire content
    const strategy = findStrategy(filePath);
    if (!strategy) {
      throw new Error(`No translation strategy found for file: ${filePath}`);
    }
    
    const result = await strategy.translate(
      content,
      source,
      target,
      config,
      aiClient
    );
    usages.push(result.usage);
    translatedContent = result.content;
  }

  // Generate output path and write translated content
  const outputPath = generateOutputPath(filePath, source, target);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, translatedContent);

  // Update lock file
  lock.files[filePath] = { content: currentHash };
  
  // Calculate total usage and cost
  const totalUsage = aggregateUsage(usages);
  
  // Display translation with optional cost
  if (options.showCosts && totalUsage.totalTokens > 0) {
    const cost = calculateCost(totalUsage, provider);
    console.log(`Translated: ${filePath} -> ${outputPath} [${cost.formattedCost}]`);
  } else {
    console.log(`Translated: ${filePath} -> ${outputPath}`);
  }
  
  return { usage: totalUsage };
}