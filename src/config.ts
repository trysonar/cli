import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

export interface CliConfig {
  apiKey: string;
  baseUrl: string;
}

const CONFIG_DIR = join(homedir(), '.config', 'sonar');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function loadConfig(): CliConfig | null {
  const envKey = process.env.SONAR_API_KEY;
  const envUrl = process.env.SONAR_API_URL;

  let fileConfig: Partial<CliConfig> = {};

  if (existsSync(CONFIG_FILE)) {
    try {
      const raw = readFileSync(CONFIG_FILE, 'utf-8');
      fileConfig = JSON.parse(raw);
    } catch {
      // Ignore malformed config
    }
  }

  const apiKey = envKey || fileConfig.apiKey;
  const baseUrl = envUrl || fileConfig.baseUrl || 'https://trysonar.app';

  if (!apiKey) {
    return null;
  }

  return { apiKey, baseUrl };
}

export function saveConfig(config: CliConfig): void {
  mkdirSync(dirname(CONFIG_FILE), { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  chmodSync(CONFIG_FILE, 0o600); // Owner read/write only — file contains API key
}

export function clearConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    unlinkSync(CONFIG_FILE);
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
