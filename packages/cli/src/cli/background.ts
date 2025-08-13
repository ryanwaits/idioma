import { spawn as nodeSpawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const STATUS_DIR = path.join(os.tmpdir(), 'idioma-translations');
const STATUS_FILE = path.join(STATUS_DIR, 'status.json');
const PID_FILE = path.join(STATUS_DIR, 'process.pid');

export interface TranslationStatus {
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  errors: string[];
  pid?: number;
}

export async function startBackgroundTranslation(args: string[]): Promise<void> {
  // Ensure status directory exists
  await fs.mkdir(STATUS_DIR, { recursive: true });

  // Check if translation is already running
  const isRunning = await isTranslationRunning();
  if (isRunning) {
    console.log('❌ A translation is already running in the background.');
    console.log('Run "idioma status" to check progress or "idioma stop" to cancel it.');
    return;
  }

  // Prepare the command - detect runtime
  const isBun = typeof Bun !== 'undefined';
  const runtime = isBun ? 'bun' : 'node';
  const scriptPath = path.join(__dirname, 'worker.js'); // Use .js for compatibility
  
  // Spawn the background process using Node's child_process
  const proc = nodeSpawn(runtime, [scriptPath, ...args], {
    cwd: process.cwd(),
    env: process.env,
    detached: true,
    stdio: 'ignore',
  });

  // Detach the process so it runs independently
  proc.unref();

  // Save the PID
  await fs.writeFile(PID_FILE, proc.pid.toString());

  // Initialize status file
  const initialStatus: TranslationStatus = {
    status: 'running',
    startTime: new Date().toISOString(),
    totalFiles: 0,
    processedFiles: 0,
    errors: [],
    pid: proc.pid,
  };
  await fs.writeFile(STATUS_FILE, JSON.stringify(initialStatus, null, 2));

  console.log('✅ Translation started in background (PID: ' + proc.pid + ')');
  console.log('Run "idioma status" to check progress.');
}

export async function getTranslationStatus(): Promise<TranslationStatus | null> {
  try {
    const statusData = await fs.readFile(STATUS_FILE, 'utf-8');
    return JSON.parse(statusData);
  } catch {
    return null;
  }
}

export async function stopBackgroundTranslation(): Promise<boolean> {
  try {
    const pidData = await fs.readFile(PID_FILE, 'utf-8');
    const pid = parseInt(pidData, 10);
    
    // Kill the process
    process.kill(pid, 'SIGTERM');
    
    // Clean up files
    await fs.unlink(PID_FILE).catch(() => {});
    await fs.unlink(STATUS_FILE).catch(() => {});
    
    console.log('✅ Background translation stopped.');
    return true;
  } catch (error) {
    console.log('❌ No background translation running.');
    return false;
  }
}

export async function isTranslationRunning(): Promise<boolean> {
  try {
    const pidData = await fs.readFile(PID_FILE, 'utf-8');
    const pid = parseInt(pidData, 10);
    
    // Check if process is still running
    try {
      process.kill(pid, 0); // Signal 0 checks if process exists
      return true;
    } catch {
      // Process doesn't exist, clean up stale files
      await fs.unlink(PID_FILE).catch(() => {});
      return false;
    }
  } catch {
    return false;
  }
}

export async function updateStatus(updates: Partial<TranslationStatus>): Promise<void> {
  const current = await getTranslationStatus() || {
    status: 'running',
    startTime: new Date().toISOString(),
    totalFiles: 0,
    processedFiles: 0,
    errors: [],
  };
  
  const updated = { ...current, ...updates };
  await fs.writeFile(STATUS_FILE, JSON.stringify(updated, null, 2));
}