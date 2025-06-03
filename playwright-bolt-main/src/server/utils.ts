import os from 'os';
import path from 'path';

export function getTempUserDataDir(): string {
  const tempDir = os.tmpdir();
  const userDataDir = path.join(tempDir, 'playwright-bolt-user-data');
  return userDataDir;
} 