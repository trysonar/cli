import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "./client.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("createClient", () => {
  const config = {
    apiKey: "test-api-key",
    baseUrl: "https://api.example.com",
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends GET request with Authorization header", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );

    const client = createClient(config);
    await client.get("/api/v1/apps");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/v1/apps");
    expect(options.headers.Authorization).toBe("Bearer test-api-key");
    expect(options.headers.Accept).toBe("application/json");
  });

  it("appends query parameters to URL", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );

    const client = createClient(config);
    await client.get("/api/v1/keywords/search", {
      q: "fitness",
      store: "ios",
      country: "us",
    });

    const [url] = mockFetch.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.searchParams.get("q")).toBe("fitness");
    expect(parsed.searchParams.get("store")).toBe("ios");
    expect(parsed.searchParams.get("country")).toBe("us");
  });

  it("skips undefined params", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );

    const client = createClient(config);
    await client.get("/api/v1/apps", {
      cursor: undefined,
      limit: 10,
    });

    const [url] = mockFetch.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.searchParams.has("cursor")).toBe(false);
    expect(parsed.searchParams.get("limit")).toBe("10");
  });

  it("returns parsed JSON on success", async () => {
    const responseData = { data: [{ id: "1", name: "Test App" }] };
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(responseData), { status: 200 })
    );

    const client = createClient(config);
    const result = await client.get("/api/v1/apps");
    expect(result).toEqual(responseData);
  });

  it("throws friendly error on 401", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Invalid API key" } }),
        { status: 401 }
      )
    );

    const client = createClient(config);
    await expect(client.get("/api/v1/apps")).rejects.toThrow("Invalid API key");
  });

  it("throws friendly error on 403", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "forbidden", message: "Pro tier required" } }),
        { status: 403 }
      )
    );

    const client = createClient(config);
    await expect(client.get("/api/v1/apps")).rejects.toThrow("Pro tier required");
  });

  it("throws friendly error on 429", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "rate_limited", message: "Rate limit exceeded" } }),
        { status: 429 }
      )
    );

    const client = createClient(config);
    await expect(client.get("/api/v1/apps")).rejects.toThrow("Rate limit exceeded");
  });

  it("throws default message when response body is not JSON", async () => {
    mockFetch.mockResolvedValue(
      new Response("Internal Server Error", { status: 500 })
    );

    const client = createClient(config);
    await expect(client.get("/api/v1/apps")).rejects.toThrow(
      "Server error. Please try again later."
    );
  });

  it("throws default message for 404", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({}), { status: 404 })
    );

    const client = createClient(config);
    await expect(client.get("/api/v1/apps/nonexistent")).rejects.toThrow(
      "Resource not found."
    );
  });

  it("throws connection error when fetch fails", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    const client = createClient(config);
    await expect(client.get("/api/v1/apps")).rejects.toThrow(
      "Could not connect to https://api.example.com"
    );
  });

  describe("base URL validation", () => {
    it("rejects HTTP URLs (non-localhost)", () => {
      expect(() =>
        createClient({ apiKey: "test", baseUrl: "http://evil.com" })
      ).toThrow("Base URL must use HTTPS");
    });

    it("allows HTTPS URLs", () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
      expect(() =>
        createClient({ apiKey: "test", baseUrl: "https://api.example.com" })
      ).not.toThrow();
    });

    it("allows localhost over HTTP for development", () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
      expect(() =>
        createClient({ apiKey: "test", baseUrl: "http://localhost:3000" })
      ).not.toThrow();
    });

    it("allows 127.0.0.1 over HTTP for development", () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
      expect(() =>
        createClient({ apiKey: "test", baseUrl: "http://127.0.0.1:3000" })
      ).not.toThrow();
    });

    it("rejects invalid URLs", () => {
      expect(() =>
        createClient({ apiKey: "test", baseUrl: "not-a-url" })
      ).toThrow("Invalid base URL");
    });
  });

  describe("verbose mode", () => {
    it("writes request details to stderr", async () => {
      const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: {
            "x-ratelimit-limit": "1000",
            "x-ratelimit-remaining": "999",
          },
        })
      );

      const client = createClient(config, { verbose: true });
      await client.get("/api/v1/apps");

      const calls = stderrSpy.mock.calls.map((c) => c[0] as string);
      expect(calls.some((c) => c.includes("GET"))).toBe(true);
      expect(calls.some((c) => c.includes("Status: 200"))).toBe(true);
      expect(calls.some((c) => c.includes("999/1000"))).toBe(true);

      stderrSpy.mockRestore();
    });
  });
});
