import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { safeStorage } from 'electron';

export class SecureStore {
  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  getItem(key: string): string | null {
    const records = this.readAll();
    return records[key] ?? null;
  }

  setItem(key: string, value: string): void {
    const records = this.readAll();
    records[key] = value;
    this.writeAll(records);
  }

  removeItem(key: string): void {
    const records = this.readAll();
    delete records[key];
    this.writeAll(records);
  }

  clear(): void {
    rmSync(this.filePath, { force: true });
  }

  private readAll(): Record<string, string> {
    try {
      const raw = readFileSync(this.filePath);
      if (raw.length === 0) {
        return {};
      }
      const json = safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(Buffer.from(raw.toString('utf8'), 'base64'))
        : raw.toString('utf8');
      return JSON.parse(json) as Record<string, string>;
    } catch {
      return {};
    }
  }

  private writeAll(records: Record<string, string>): void {
    const json = JSON.stringify(records);
    const payload = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(json).toString('base64')
      : json;
    writeFileSync(this.filePath, payload, 'utf8');
  }
}
