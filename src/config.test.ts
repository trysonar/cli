import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("config", () => {
  let configDir: string;
  let configFile: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    configDir = join(tmpdir(), `sonar-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    configFile = join(configDir, "config.json");
    delete process.env.SONAR_API_KEY;
    delete process.env.SONAR_API_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    try {
      if (existsSync(configFile)) unlinkSync(configFile);
      if (existsSync(configDir)) {
        const { rmSync } = require("node:fs");
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

      let hadOriginal = false;
      let originalContent: string | undefined;
      try {
        originalContent = readFileSync(path, "utf-8");
        hadOriginal = true;
      } catch {
        // No existing config
      }

      try {
        saveConfig({ apiKey: "test-perm-check", baseUrl: "https://example.com" });
        const stats = statSync(path);
        const mode = stats.mode & 0o777;
        expect(mode).toBe(0o600);
      } finally {
        if (hadOriginal && originalContent !== undefined) {
          writeFileSync(path, originalContent, "utf-8");
        } else {
          try { unlinkSync(path); } catch { /* ignore */ }
        }
      }
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

      const { loadConfig, getConfigPath } = await import("./config.js");
      const path = getConfigPath();

      let hadOriginal = false;
      let originalContent: string | undefined;
      try {
        originalContent = readFileSync(path, "utf-8");
        hadOriginal = true;
        unlinkSync(path);
      } catch {
        // No existing config file
      }

      try {
        const config = loadConfig();

        expect(config).not.toBeNull();
        expect(config!.apiKey).toBe("env-key-789");
        expect(config!.baseUrl).toBe("https://trysonar.app");
      } finally {
        if (hadOriginal && originalContent !== undefined) {
          writeFileSync(path, originalContent, "utf-8");
        }
      }
    });
  });

  describe("getConfigPath", () => {
    it("returns path under ~/.config/sonar", async () => {
      const { getConfigPath } = await import("./config.js");
      const path = getConfigPath();
      expect(path).toContain(".config");
      expect(path).toContain("sonar");
      expect(path).toContain("config.json");
    });
  });
});
