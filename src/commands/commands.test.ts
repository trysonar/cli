import { afterEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { createClient } from '../client.js';
import { registerAppsCommand } from './apps.js';
import { registerKeywordsCommand } from './keywords.js';
import { registerCompetitorsCommand } from './competitors.js';
import { registerRankingsCommand } from './rankings.js';
import { registerRevenueCommand } from './revenue.js';

vi.mock('../config.js', () => ({ loadConfig: vi.fn() }));
vi.mock('../client.js', () => ({ createClient: vi.fn() }));
vi.mock('ora', () => ({ default: () => ({ start: () => ({ stop: vi.fn(), fail: vi.fn() }) }) }));
afterEach(() => vi.restoreAllMocks());

function setup() {
  vi.mocked(loadConfig).mockReturnValue({ apiKey: 'aso_test', baseUrl: 'https://example.invalid' });
  const get = vi.fn().mockResolvedValue({ data: [] });
  vi.mocked(createClient).mockReturnValue({ get, post: vi.fn(), patch: vi.fn(), delete: vi.fn() });
  const output = vi.spyOn(console, 'log').mockImplementation(() => {});
  const program = new Command().option('--table').option('--verbose');
  for (const register of [registerAppsCommand, registerKeywordsCommand, registerCompetitorsCommand, registerRankingsCommand, registerRevenueCommand]) register(program);
  return { program, get, output };
}

describe('CLI read commands', () => {
  it('forwards an explicit Android review language', async () => {
    const { program, get } = setup();
    await program.parseAsync(['apps', 'reviews', 'com.test', '--store', 'android', '--country', 'ma', '--lang', 'fr'], { from: 'user' });
    expect(get).toHaveBeenCalledWith('/api/v1/apps/reviews', expect.objectContaining({ store: 'android', id: 'com.test', country: 'ma', lang: 'fr' }));
  });
  it.each([
    { args: ['apps', 'list'], path: '/api/v1/apps', params: undefined },
    { args: ['apps', 'get', 'app-1'], path: '/api/v1/apps/app-1', params: undefined },
    { args: ['keywords', 'search', 'photo', '--store', 'ios'], path: '/api/v1/keywords/search', params: { q: 'photo', store: 'ios', country: 'us' } },
    { args: ['keywords', 'suggestions', 'photo', '--store', 'android'], path: '/api/v1/keywords/suggestions', params: { q: 'photo', store: 'android', country: 'us' } },
    { args: ['competitors', 'keywords', 'rival', '--app', 'own'], path: '/api/v1/competitors/rival/keywords', params: { app_id: 'own' } },
    { args: ['rankings', 'own', '--keyword', 'kw', '--days', '7'], path: '/api/v1/apps/own/rankings', params: { days: '7', keyword_id: 'kw' } },
    { args: ['rankings', 'keyword', 'kw'], path: '/api/v1/keywords/kw/rankings', params: { days: '30' } },
    { args: ['revenue', '--id', '123', '--store', 'ios'], path: '/api/v1/apps/revenue', params: { id: '123', store: 'ios', country: 'us' } },
    { args: ['apps', 'sales', 'own', '--days', '7'], path: '/api/v1/apps/own/sales', params: { days: 7 } },
    { args: ['apps', 'sales', 'com.example.app', '--start', '2026-09-01', '--end', '2026-09-30', '--store', 'ios'], path: '/api/v1/apps/com.example.app/sales', params: { start: '2026-09-01', end: '2026-09-30', store: 'ios' } },
    { args: ['apps', 'engagement', 'own'], path: '/api/v1/apps/own/engagement', params: {} },
    { args: ['apps', 'engagement', 'own', '--end', '2026-09-30', '--days', '90'], path: '/api/v1/apps/own/engagement', params: { end: '2026-09-30', days: 90 } },
  ])('preserves request and JSON output for $args', async ({ args, path, params }) => {
    const { program, get, output } = setup();
    await program.parseAsync(args, { from: 'user' });
    expect(get.mock.calls).toEqual([params === undefined ? [path] : [path, params]]);
    expect(output).toHaveBeenCalledTimes(1);
    expect(JSON.parse(output.mock.calls[0][0])).toEqual({ data: [] });
  });

  it('renders table output when requested', async () => {
    const { program, output } = setup();
    await program.parseAsync(['--table', 'apps', 'list'], { from: 'user' });
    expect(output).toHaveBeenCalledWith(expect.stringContaining('No apps'));
  });

  it.each([['sales'], ['engagement']])('prints the status message instead of an empty %s table', async (command) => {
    const { program, get, output } = setup();
    get.mockResolvedValue({
      data: {
        app_id: 'own', app_name: 'Test App', store: 'ios', status: 'not_connected', connected: false,
        message: 'App Store Connect is not connected. Connect it at /settings/connections to get sales and engagement data.',
        apple_app_id: null, last_synced_at: null, range: { start: '2026-09-01', end: '2026-09-30' },
        reported_days: 0, totals: null, rates: null, sources: [], countries: [], days: [],
      },
    });
    await program.parseAsync(['--table', 'apps', command, 'own'], { from: 'user' });
    const text = output.mock.calls[0][0] as string;
    expect(text).toContain('App Store Connect is not connected');
    expect(text).not.toContain('Date');
  });

  it('rejects an invalid --store before calling the API', async () => {
    const { program, get } = setup();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(program.parseAsync(['apps', 'sales', 'own', '--store', 'web'], { from: 'user' })).rejects.toThrow('exit');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Invalid --store'));
    expect(exit).toHaveBeenCalledWith(1);
    expect(get).not.toHaveBeenCalled();
  });

  it('reports request failures and exits unsuccessfully', async () => {
    const { program, get } = setup();
    get.mockRejectedValue(new Error('Service unavailable'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(program.parseAsync(['apps', 'list'], { from: 'user' })).rejects.toThrow('exit');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Service unavailable'));
    expect(exit).toHaveBeenCalledWith(1);
  });
});
