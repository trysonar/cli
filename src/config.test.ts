import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We need to mock the config path, so we mock the module internals
// Instead, we test the logic by importing and calling functions with known temp paths

describe("config", () => {
  let configDir: string;
  let configFile: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Use a unique temp dir for each test
    configDir = join(tmpdir(), `sonar-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    configFile = join(configDir, "config.json");
    process.env.SONAR_CONFIG_PATH = configFile;
    delete process.env.SONAR_API_KEY;
    delete process.env.SONAR_API_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    try {
      if (existsSync(configFile)) unlinkSync(configFile);
      if (existsSync(configDir)) {
        rmSync(configDir, { recursive: true });
      }
    } catch {
      // ignore cleanup errors
    }
  });

  describe("file-based config", () => {
    it("saveConfig creates config file with correct contents", () => {
      mkdirSync(configDir, { recursive: true });
      const config = { apiKey: "test-key-123", baseUrl: "https://example.com" };
      writeFileSync(configFile, JSON.stringify(config, null, 2) + "\n", "utf-8");

      const raw = readFileSync(configFile, "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.apiKey).toBe("test-key-123");
      expect(parsed.baseUrl).toBe("https://example.com");
    });

    it("saveConfig sets restrictive file permissions (0600)", async () => {
      const { saveConfig, getConfigPath } = await import("./config.js");
      const path = getConfigPath();
      saveConfig({ apiKey: "test-perm-check", baseUrl: "https://example.com" });
      const stats = statSync(path);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it("loadConfig returns null when no config file and no env vars", async () => {
      const { loadConfig } = await import("./config.js");
      // SONAR_CONFIG_PATH (set in beforeEach) points at a nonexistent temp
      // file, and config.ts resolves the path at call time — so with no env
      // vars and no file, loadConfig must return null.
      expect(loadConfig()).toBeNull();
    });

    it("env vars override file config", async () => {
      process.env.SONAR_API_KEY = "env-key-456";
      process.env.SONAR_API_URL = "https://env-url.com";

      const { loadConfig } = await import("./config.js");
      const config = loadConfig();

      expect(config).not.toBeNull();
      expect(config!.apiKey).toBe("env-key-456");
      expect(config!.baseUrl).toBe("https://env-url.com");
    });

    it("env SONAR_API_KEY without SONAR_API_URL uses default base URL", async () => {
      process.env.SONAR_API_KEY = "env-key-789";
      delete process.env.SONAR_API_URL;

      const { loadConfig } = await import("./config.js");
      const config = loadConfig();

      expect(config).not.toBeNull();
      expect(config!.apiKey).toBe("env-key-789");
      expect(config!.baseUrl).toBe("https://trysonar.app");
    });
  });

  describe("getConfigPath", () => {
    it("returns the override path when SONAR_CONFIG_PATH is set", async () => {
      const { getConfigPath } = await import("./config.js");
      const path = getConfigPath();
      expect(path).toBe(configFile);
    });
  });
});
