import type { CliConfig } from './config.js';
import type { ApiError } from './types.js';

export interface ClientOptions {
  verbose?: boolean;
}

export interface ApiClient {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
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

      if (verbose) {
        const startTime = performance.now();
        process.stderr.write(`GET ${url.toString()}\n`);

        const response = await doFetch(url, apiKey);
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

      const response = await doFetch(url, apiKey);
      return handleResponse<T>(response);
    },
  };
}

async function doFetch(url: URL, apiKey: string): Promise<Response> {
  try {
    return await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
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
      throw new Error(message || 'Access denied. This feature may require a paid subscription.');
    case 404:
      throw new Error(message || 'Resource not found.');
    case 429:
      throw new Error(message || 'Rate limit exceeded. Please wait before making more requests.');
    case 500:
    case 502:
    case 503:
      throw new Error(message || 'Server error. Please try again later.');
    default:
      throw new Error(message || `Request failed with status ${response.status}.`);
  }
}
