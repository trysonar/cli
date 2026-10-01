import type { CliConfig } from './config.js';
import type { ApiError } from './types.js';

declare const __SONAR_CLI_VERSION__: string;
const CLI_VERSION = typeof __SONAR_CLI_VERSION__ !== 'undefined' ? __SONAR_CLI_VERSION__ : 'dev';

export interface ClientOptions {
  verbose?: boolean;
}

export interface ApiClient {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body: Record<string, unknown>): Promise<T>;
  patch<T>(path: string, body: Record<string, unknown>): Promise<T>;
  delete<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
}

export function createClient(config: CliConfig, options: ClientOptions = {}): ApiClient {
  const { apiKey, baseUrl } = config;
  const { verbose } = options;

  // Validate base URL to prevent sending API key to arbitrary servers
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'https:' && !parsed.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
      throw new Error(
        `Base URL must use HTTPS (got ${parsed.protocol}). ` +
        'Only localhost is allowed over HTTP.'
      );
    }
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(`Invalid base URL: "${baseUrl}". Must be a valid URL.`);
    }
    throw err;
  }

  async function send<T>(method: string, url: URL, body?: Record<string, unknown>): Promise<T> {
    if (verbose) {
      const startTime = performance.now();
      process.stderr.write(`${method} ${url.toString()}\n`);

      const response = await doFetch(method, url, apiKey, body);
      const elapsed = (performance.now() - startTime).toFixed(0);

      const rateLimit = response.headers.get('x-ratelimit-limit');
      const rateRemaining = response.headers.get('x-ratelimit-remaining');
      const rateReset = response.headers.get('x-ratelimit-reset');

      process.stderr.write(`  Status: ${response.status} (${elapsed}ms)\n`);
      if (rateLimit) {
        process.stderr.write(`  Rate limit: ${rateRemaining}/${rateLimit} remaining`);
        if (rateReset) {
          process.stderr.write(` (resets ${rateReset})`);
        }
        process.stderr.write('\n');
      }

      return handleResponse<T>(response);
    }

    const response = await doFetch(method, url, apiKey, body);
    return handleResponse<T>(response);
  }

  return {
    async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
      const url = new URL(path, baseUrl);

      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
          }
        }
      }

      return send<T>('GET', url);
    },

    async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
      return send<T>('POST', new URL(path, baseUrl), body);
    },

    async patch<T>(path: string, body: Record<string, unknown>): Promise<T> {
      return send<T>('PATCH', new URL(path, baseUrl), body);
    },

    async delete<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
      const url = new URL(path, baseUrl);

      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
          }
        }
      }

      return send<T>('DELETE', url);
    },
  };
}

async function doFetch(
  method: string,
  url: URL,
  apiKey: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  try {
    return await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        // Self-identify so the API's usage stats can attribute CLI traffic.
        'User-Agent': `sonar-cli/${CLI_VERSION}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    if (err instanceof TypeError && (err as Error).message.includes('fetch')) {
      throw new Error(`Could not connect to ${url.origin}. Check your network connection and base URL.`);
    }
    throw err;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  let errorBody: ApiError | null = null;
  try {
    errorBody = (await response.json()) as ApiError;
  } catch {
    // Response body is not JSON
  }

  const message = errorBody?.error?.message;

  switch (response.status) {
    case 401:
      throw new Error(message || 'Authentication failed. Run `sonar auth login` to set your API key.');
    case 403:
      throw new Error(message || 'Access denied. This feature may require an Indie plan subscription or a write-scope API key.');
    case 404:
      throw new Error(message || 'Resource not found.');
    case 429:
      // The API sizes Retry-After to the real scraper-queue depth — surface it
      // so users (and scripts wrapping the CLI) back off at the drain rate
      // instead of retrying into a saturated queue.
      throw new Error(
        withRetryAfter(
          message || 'Rate limit exceeded. Please wait before making more requests.',
          response
        )
      );
    case 500:
    case 502:
      throw new Error(message || 'Server error. Please try again later.');
    case 503:
      throw new Error(
        withRetryAfter(message || 'Server error. Please try again later.', response)
      );
    default:
      throw new Error(message || `Request failed with status ${response.status}.`);
  }
}

/** Append the server's Retry-After hint (seconds) to a throttle message. */
function withRetryAfter(message: string, response: Response): string {
  const seconds = Number(response.headers.get('Retry-After'));
  if (!Number.isFinite(seconds) || seconds <= 0) return message;
  if (/retry-after|retry in \d|retry after \d/i.test(message)) return message;
  return `${message} Retry after ${seconds}s.`;
}
