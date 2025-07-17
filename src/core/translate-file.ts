import fs from 'fs/promises';
import path from 'path';
import ora from 'ora';
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
  let spinner: any;
  // Read file content
  const content = await fs.readFile(filePath, 'utf-8');
  const currentHash = generateHash(content);

  // Check if file has changed or if translation doesn't exist for target locale
  const fileEntry = lock.files[filePath];
  const fileChanged = fileEntry && fileEntry.content !== currentHash;
  
  // If source file changed, clear all translation flags
  if (fileChanged && fileEntry.translations) {
    fileEntry.translations = {};
  }
  
  const hasTranslation = fileEntry?.translations?.[target];
  
  if (fileEntry && fileEntry.content === currentHash && hasTranslation) {
    console.log(`Skipped (unchanged): ${filePath} -> ${target}`);
    return { usage: undefined };
  }
  
  // Create spinner for active translation
  spinner = ora(`Translating ${path.basename(filePath)} -> ${target}`).start();

  try {
    // Create AI client based on config
    const provider = config.translation?.provider || 'anthropic';
    const model = config.translation?.model;
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
      aiClient,
      model,
      provider
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
      aiClient,
      model,
      provider
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
      aiClient,
      model,
      provider
    );
    usages.push(result.usage);
    translatedContent = result.content;
    }

    // Generate output path and write translated content
    const outputPath = generateOutputPath(filePath, source, target);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, translatedContent);

    // Update lock file with translation status
    if (!lock.files[filePath]) {
      lock.files[filePath] = { content: currentHash, translations: {} };
    } else {
      lock.files[filePath].content = currentHash;
      if (!lock.files[filePath].translations) {
        lock.files[filePath].translations = {};
      }
    }
    lock.files[filePath].translations![target] = true;
    
    // Calculate total usage and cost
    const totalUsage = aggregateUsage(usages);
    
    // Stop spinner and show success
    if (options.showCosts && totalUsage.totalTokens > 0) {
      const cost = calculateCost(totalUsage, provider, model);
      spinner.succeed(`${path.basename(filePath)} -> ${target} [${cost.formattedCost}]`);
    } else {
      spinner.succeed(`${path.basename(filePath)} -> ${target}`);
    }
    
    return { usage: totalUsage };
  } catch (error) {
    // Stop spinner with error
    spinner.fail(`Failed: ${path.basename(filePath)} -> ${target}`);
    throw error;
  }
}