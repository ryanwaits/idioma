import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export interface LockFile {
  version: number;
  files: Record<string, { 
    content: string;
    translations?: Record<string, boolean>; // Track which locales have been translated
  }>;
}

const lockPath = path.resolve('openlocale.lock');

export async function loadLock(): Promise<LockFile> {
  try {
    const data = await fs.readFile(lockPath, 'utf-8');
    const lock = yaml.load(data) as LockFile;
    
    // Migrate old lock files that don't have translations tracking
    let needsMigration = false;
    for (const [filePath, entry] of Object.entries(lock.files)) {
      if (!entry.translations) {
        entry.translations = {};
        needsMigration = true;
      }
    }
    
    if (needsMigration) {
      await saveLock(lock);
    }
    
    return lock;
  } catch {
    return { version: 1, files: {} };
  }
}

export async function saveLock(lock: LockFile): Promise<void> {
  const yamlStr = yaml.dump(lock);
  await fs.writeFile(lockPath, yamlStr);
}

export async function getLockFile(customPath?: string): Promise<LockFile> {
  const lockFilePath = customPath || lockPath;
  try {
    const data = await fs.readFile(lockFilePath, 'utf-8');
    const lock = yaml.load(data) as LockFile;
    
    // Migrate old lock files that don't have translations tracking
    let needsMigration = false;
    for (const [filePath, entry] of Object.entries(lock.files)) {
      if (!entry.translations) {
        entry.translations = {};
        needsMigration = true;
      }
    }
    
    if (needsMigration) {
      await saveLockFile(lock, lockFilePath);
    }
    
    return lock;
  } catch {
    return { version: 1, files: {} };
  }
}

export async function saveLockFile(lock: LockFile, customPath?: string): Promise<void> {
  const lockFilePath = customPath || lockPath;
  const yamlStr = yaml.dump(lock);
  await fs.writeFile(lockFilePath, yamlStr);
}

export function shouldTranslate(lock: LockFile, filePath: string, targetLocale: string): boolean {
  const fileEntry = lock.files[filePath];
  
  // If file is not in lock, it needs translation
  if (!fileEntry) {
    return true;
  }
  
  // If file hasn't been translated to this locale yet
  if (!fileEntry.translations?.[targetLocale]) {
    return true;
  }
  
  // File has been translated to this locale
  return false;
}