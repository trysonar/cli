import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export interface CliConfig {
  apiKey: string;
  baseUrl: string;
}

function resolveConfigPath(): string {
  return process.env.SONAR_CONFIG_PATH ?? join(homedir(), ".config", "sonar", "config.json");
}

export function loadConfig(): CliConfig | null {
  const envKey = process.env.SONAR_API_KEY;
  const envUrl = process.env.SONAR_API_URL;
  const configFile = resolveConfigPath();

  let fileConfig: Partial<CliConfig> = {};

  if (existsSync(configFile)) {
    try {
      const raw = readFileSync(configFile, "utf-8");
      fileConfig = JSON.parse(raw);
    } catch {
      // Ignore malformed config
    }
  }

  const apiKey = envKey || fileConfig.apiKey;
  // api.trysonar.app hits the dedicated API box directly (Aug 2026);
  // trysonar.app still works and proxies to the same backend.
  const baseUrl = envUrl || fileConfig.baseUrl || "https://api.trysonar.app";

  if (!apiKey) {
    return null;
  }

  return { apiKey, baseUrl };
}

export function saveConfig(config: CliConfig): void {
  const configFile = resolveConfigPath();
  mkdirSync(dirname(configFile), { recursive: true, mode: 0o700 });
  writeFileSync(configFile, JSON.stringify(config, null, 2) + "\n", "utf-8");
  chmodSync(configFile, 0o600); // Owner read/write only — file contains API key
}

export function clearConfig(): void {
  const configFile = resolveConfigPath();
  if (existsSync(configFile)) {
    unlinkSync(configFile);
  }
}

export function getConfigPath(): string {
  return resolveConfigPath();
}
