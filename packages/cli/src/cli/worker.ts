#!/usr/bin/env node
import { loadConfig, loadLock, saveLock, processFiles } from 'idioma-sdk';
import { updateStatus, getTranslationStatus } from './background';

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
    
    // Estimate total files to process
    const patterns = Array.isArray(config.files) 
      ? config.files 
      : (config.files?.include || []);
    const totalFiles = patterns.length * config.locale.targets.length;
    
    await updateStatus({
      totalFiles,
      processedFiles: 0,
    });

    // TODO: Add progress tracking hooks here once the SDK supports it
    // For now, we'll just run the translation
    
    // Run the translation
    const result = await processFiles(config, lock, {
      showCosts,
    });
    
    // Save updated lock file
    await saveLock(result.lock);

    // Update status to completed
    await updateStatus({
      status: 'completed',
      endTime: new Date().toISOString(),
      currentFile: undefined,
    });

    console.log('✅ Translation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Translation failed:', error);
    
    await updateStatus({
      status: 'failed',
      endTime: new Date().toISOString(),
      currentFile: undefined,
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