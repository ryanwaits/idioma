#!/usr/bin/env node
import { loadConfig, loadLock, saveLock } from 'idioma-sdk';
import { glob } from 'glob';
import { updateStatus, getTranslationStatus } from './background';
import { translateFile } from 'idioma-sdk';

// Worker process that runs the actual translation
async function runTranslation() {
  try {
    // Update status to running
    await updateStatus({
      status: 'running',
      startTime: new Date().toISOString(),
    });

    // Parse command line arguments
    const args = process.argv.slice(2);
    const showCosts = args.includes('--costs');
    
    // Load config and lock
    const config = await loadConfig();
    const lock = await loadLock();
    
    // Calculate actual files to be processed
    const sourceLocale = config.locale.source;
    const targetLocales = config.locale.targets;
    const includePatterns = Array.isArray(config.files) ? config.files : (config.files?.include || []);
    
    // Get all source files
    let allSourceFiles: string[] = [];
    for (const pattern of includePatterns) {
      const sourcePattern = pattern.replace(/\[locale\]/g, sourceLocale);
      const files = await glob(sourcePattern);
      allSourceFiles = [...allSourceFiles, ...files];
    }
    
    // Calculate total translation tasks (files × target locales)
    const totalFiles = allSourceFiles.length * targetLocales.length;
    let processedFiles = 0;
    
    await updateStatus({
      totalFiles,
      processedFiles: 0,
    });

    // Process files with progress tracking
    for (const sourceFile of allSourceFiles) {
      for (const targetLocale of targetLocales) {
        try {
          // Update current file being processed
          const fileName = sourceFile.replace(/.*\//, ''); // Get just filename
          await updateStatus({
            currentFile: `${fileName} -> ${targetLocale}`,
            processedFiles,
          });
          
          // Add delay to avoid rate limits
          if (processedFiles > 0) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
          
          // Translate the file
          const result = await translateFile(sourceFile, sourceLocale, targetLocale, lock, config, {
            showCosts,
          });
          
          processedFiles++;
          
          // Update progress
          await updateStatus({
            processedFiles,
          });
          
          // Save lock file periodically
          if (processedFiles % 1 === 0) { // Save after each file for safety
            await saveLock(lock);
          }
          
        } catch (error) {
          console.error(`Error translating ${sourceFile} to ${targetLocale}:`, error);
          processedFiles++;
          
          // Update progress even on error
          await updateStatus({
            processedFiles,
            errors: [`${sourceFile} -> ${targetLocale}: ${error}`],
          });
        }
      }
    }
    
    // Save final lock file
    await saveLock(lock);

    // Update status to completed
    await updateStatus({
      status: 'completed',
      endTime: new Date().toISOString(),
      currentFile: undefined,
      processedFiles: totalFiles,
    });

    console.log('✅ Translation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Translation failed:', error);
    
    await updateStatus({
      status: 'failed',
      endTime: new Date().toISOString(),
      currentFile: undefined,
      errors: [`Fatal error: ${error}`],
    });
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  await updateStatus({
    status: 'failed',
    endTime: new Date().toISOString(),
    errors: ['Process terminated by user'],
  });
  
  process.exit(0);
});

// Run the translation
runTranslation();