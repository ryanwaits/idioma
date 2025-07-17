import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export interface LockFile {
  version: number;
  files: Record<string, { content: string }>;
}

const lockPath = path.resolve('openlocale.lock');

export async function loadLock(): Promise<LockFile> {
  try {
    const data = await fs.readFile(lockPath, 'utf-8');
    return yaml.load(data) as LockFile;
  } catch {
    return { version: 1, files: {} };
  }
}

export async function saveLock(lock: LockFile): Promise<void> {
  const yamlStr = yaml.dump(lock);
  await fs.writeFile(lockPath, yamlStr);
}