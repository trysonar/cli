import { Command } from 'commander';
import chalk from 'chalk';
import {
  formatAppsTable,
  formatAppDetail,
  formatAppLookup,
  formatAppSearchTable,
  formatAsoScore,
  formatExtractedKeywords,
  formatReviewsTable,
  formatChangesTable,
  formatReviewInsight,
  formatAppOverview,
  formatAppSales,
  formatAppEngagement,
} from '../formatters/table.js';
import { runCommand, validateStore, confirmDestructive } from './helpers.js';
import type {
  ApiResponse,
  App,
  AppChange,
  AppLookup,
  AsoScoreResult,
  AppOverviewResult,
  AppEngagementResult,
  AppSalesResult,
  ExtractKeywordsResult,
  Review,
  ReviewInsightResult,
  UntrackAppResult,
} from '../types.js';

export function registerAppsCommand(program: Command): void {
  const apps = program
    .command('apps')
    .description('Manage tracked apps');

  apps
    .command('list')
    .description('List all tracked apps')
    .action(async () => {
      await runCommand(
        program,
        { loading: 'Fetching apps...', failed: 'Failed to fetch apps' },
        (client) =>
          client.get<ApiResponse<App[]>>('/api/v1/apps'),
        (result) => formatAppsTable(result.data),
      );
    });

  apps
    .command('get')
    .description('Get details for a specific app')
    .argument('<id>', 'App ID')
    .action(async (id: string) => {
      await runCommand(
        program,
        { loading: 'Fetching app...', failed: 'Failed to fetch app' },
        (client) =>
          client.get<ApiResponse<App>>(`/api/v1/apps/${id}`),
        (result) => formatAppDetail(result.data),
      );
    });

  apps
    .command('lookup')
    .description('Look up any app by its store ID (no tracking required)')
    .argument('<store-id>', 'iOS numeric track ID or Android package name')
    .requiredOption('--store <store>', 'App store (ios or android)')
    .option('--country <cc>', 'Country code', 'us')
    .action(async (storeId: string, opts) => {
      validateStore(opts.store);
      await runCommand(
        program,
        { loading: 'Looking up app...', failed: 'Lookup failed' },
        (client) =>
          client.get<ApiResponse<AppLookup>>('/api/v1/apps/lookup', {
            store: opts.store,
            id: storeId,
            country: opts.country,
          }),
        (result) => formatAppLookup(result.data),
      );
    });

  apps
    .command('search')
    .description('Search apps in a store (no tracking required)')
    .argument('<query>', 'Search query')
    .requiredOption('--store <store>', 'App store (ios or android)')
    .option('--country <cc>', 'Country code', 'us')
    .option('--num <n>', 'Number of results', parseInt)
    .action(async (query: string, opts) => {
      validateStore(opts.store);
      await runCommand(
        program,
        { loading: 'Searching apps...', failed: 'Search failed' },
        (client) =>
          client.get<ApiResponse<AppLookup[]>>('/api/v1/apps/search', {
            q: query,
            store: opts.store,
            country: opts.country,
            num: opts.num,
          }),
        (result) => formatAppSearchTable(result.data),
      );
    });

  apps
    .command('score')
    .description('ASO audit score (0-100) for any app by store ID')
    .argument('<store-id>', 'iOS numeric track ID or Android package name')
    .requiredOption('--store <store>', 'App store (ios or android)')
    .option('--country <cc>', 'Country code', 'us')
    .action(async (storeId: string, opts) => {
      validateStore(opts.store);
      await runCommand(
        program,
        { loading: 'Scoring app...', failed: 'Scoring failed' },
        (client) =>
          client.get<ApiResponse<AsoScoreResult>>('/api/v1/apps/aso-score', {
            store: opts.store,
            id: storeId,
            country: opts.country,
          }),
        (result) => formatAsoScore(result.data),
      );
    });

  apps
    .command('extract-keywords')
    .description('Extract ranked keywords from an app\'s store metadata')
    .argument('<store-id>', 'iOS numeric track ID or Android package name')
    .requiredOption('--store <store>', 'App store (ios or android)')
    .option('--country <cc>', 'Country code', 'us')
    .option('--max <n>', 'Max keywords to return', parseInt)
    .action(async (storeId: string, opts) => {
      validateStore(opts.store);
      await runCommand(
        program,
        { loading: 'Extracting keywords...', failed: 'Extraction failed' },
        (client) =>
          client.get<ApiResponse<ExtractKeywordsResult>>('/api/v1/apps/extract-keywords', {
            store: opts.store,
            id: storeId,
            country: opts.country,
            max: opts.max,
          }),
        (result) => formatExtractedKeywords(result.data),
      );
    });

  apps
    .command('reviews')
    .description('Fetch reviews for any app by store ID')
    .argument('<store-id>', 'iOS numeric track ID or Android package name')
    .requiredOption('--store <store>', 'App store (ios or android)')
    .option('--country <cc>', 'Country code', 'us')
    .option('--sort <sort>', 'Sort order (recent or helpful)')
    .option('--lang <code>', 'Android language feed; default merges market language plus en, es, fr, ar')
    .option('--min-rating <n>', 'Minimum star rating (1-5)', parseInt)
    .option('--max-rating <n>', 'Maximum star rating (1-5)', parseInt)
    .option('--limit <n>', 'Max reviews to return', parseInt)
    .action(async (storeId: string, opts) => {
      validateStore(opts.store);
      await runCommand(
        program,
        { loading: 'Fetching reviews...', failed: 'Failed to fetch reviews' },
        (client) =>
          client.get<ApiResponse<Review[]>>('/api/v1/apps/reviews', {
            store: opts.store,
            id: storeId,
            country: opts.country,
            sort: opts.sort,
            lang: opts.lang,
            min_rating: opts.minRating,
            max_rating: opts.maxRating,
            limit: opts.limit,
          }),
        (result) => formatReviewsTable(result.data),
      );
    });

  apps
    .command('overview')
    .description("The dashboard's computed scoreboard for one of your apps (visibility, movement, opportunities)")
    .argument('<app-id>', 'Sonar app ID of one of your own tracked apps')
    .option('--days <n>', 'Rank-history window in days (7-90, default 30)', parseInt)
    .action(async (appId: string, opts) => {
      await runCommand(
        program,
        { loading: 'Computing overview...', failed: 'Failed to fetch overview' },
        (client) =>
          client.get<ApiResponse<AppOverviewResult>>(
            `/api/v1/apps/${appId}/overview`,
            { days: opts.days },
          ),
        (result) => formatAppOverview(result.data),
      );
    });

  // App Store Connect data (Agency plan + an ASC connection, iOS only).
  const ascWindow = (opts: { start?: string; end?: string; days?: number; store?: string }) => {
    if (opts.store) validateStore(opts.store);
    return { start: opts.start, end: opts.end, days: opts.days, store: opts.store };
  };

  apps
    .command('sales')
    .description('App Store Connect sales for one of your iOS apps: downloads, redownloads, IAP units, approximate proceeds (Agency plan)')
    .argument('<app-id>', 'Sonar app ID (or store id) of one of your own tracked iOS apps')
    .option('--start <date>', 'First day, YYYY-MM-DD (inclusive)')
    .option('--end <date>', 'Last day, YYYY-MM-DD (inclusive, default yesterday UTC)')
    .option('--days <n>', 'Window length in days when --start is omitted (1-366, default 30)', parseInt)
    .option('--store <store>', 'Disambiguate a store id tracked in both stores (ios or android)')
    .action(async (appId: string, opts) => {
      const params = ascWindow(opts);
      await runCommand(
        program,
        { loading: 'Fetching App Store Connect sales...', failed: 'Failed to fetch sales' },
        (client) =>
          client.get<ApiResponse<AppSalesResult>>(
            `/api/v1/apps/${encodeURIComponent(appId)}/sales`,
            params,
          ),
        (result) => formatAppSales(result.data),
      );
    });

  apps
    .command('engagement')
    .description('App Store Connect engagement for one of your iOS apps: impressions, page views, downloads, sources, sessions (Agency plan)')
    .argument('<app-id>', 'Sonar app ID (or store id) of one of your own tracked iOS apps')
    .option('--start <date>', 'First day, YYYY-MM-DD (inclusive)')
    .option('--end <date>', 'Last day, YYYY-MM-DD (inclusive, default yesterday UTC)')
    .option('--days <n>', 'Window length in days when --start is omitted (1-366, default 30)', parseInt)
    .option('--store <store>', 'Disambiguate a store id tracked in both stores (ios or android)')
    .action(async (appId: string, opts) => {
      const params = ascWindow(opts);
      await runCommand(
        program,
        { loading: 'Fetching App Store Connect engagement...', failed: 'Failed to fetch engagement' },
        (client) =>
          client.get<ApiResponse<AppEngagementResult>>(
            `/api/v1/apps/${encodeURIComponent(appId)}/engagement`,
            params,
          ),
        (result) => formatAppEngagement(result.data),
      );
    });

  apps
    .command('insights')
    .description('Latest AI review insight for a tracked app (praise/complaint themes, sentiment, trends)')
    .argument('<app-id>', 'Sonar app ID of a tracked app (own or competitor)')
    .option('--country <cc>', 'Reviews market (insights are per country)', 'us')
    .action(async (appId: string, opts) => {
      await runCommand(
        program,
        { loading: 'Fetching review insight...', failed: 'Failed to fetch review insight' },
        (client) =>
          client.get<ApiResponse<ReviewInsightResult>>(
            `/api/v1/apps/${appId}/review-insights`,
            { country: opts.country },
          ),
        (result) => formatReviewInsight(result.data),
      );
    });

  apps
    .command('analyze-reviews')
    .description('Generate a fresh AI review insight for a tracked app (90-day cooldown, needs a write-scope key)')
    .argument('<app-id>', 'Sonar app ID of a tracked app (own or competitor)')
    .option('--country <cc>', 'Reviews market (insights are per country)', 'us')
    .action(async (appId: string, opts) => {
      await runCommand(
        program,
        { loading: 'Analyzing reviews (this can take ~30s)...', failed: 'Failed to generate review insight' },
        (client) =>
          client.post<ApiResponse<ReviewInsightResult>>(
            `/api/v1/apps/${appId}/review-insights?country=${encodeURIComponent(opts.country)}`,
            {},
          ),
        (result) => formatReviewInsight(result.data),
      );
    });

  apps
    .command('untrack')
    .description('Stop tracking an app (requires a write-scope API key)')
    .argument('<id>', 'App ID')
    .option('-f, --force', 'Skip the confirmation prompt')
    .action(async (id: string, opts) => {
      await confirmDestructive(
        `This will stop tracking app ${id} and remove its tracked keywords.`,
        opts.force,
      );

      await runCommand(
        program,
        { loading: 'Untracking app...', failed: 'Failed to untrack app' },
        (client) =>
          client.delete<ApiResponse<UntrackAppResult>>(`/api/v1/apps/${encodeURIComponent(id)}`),
        (result) =>
          result.data.deleted
            ? `${chalk.green('✓')} App untracked (${result.data.id})`
            : chalk.dim('Nothing to untrack.'),
      );
    });

  apps
    .command('changes')
    .description('Change history for a tracked app (releases, metadata, screenshots, price, category)')
    .argument('<id>', 'App ID')
    .option('--type <type>', 'Filter by change type (release, metadata, screenshots, price, category)')
    .option('--limit <n>', 'Max changes to return (1-200)', parseInt)
    .action(async (id: string, opts) => {
      await runCommand(
        program,
        { loading: 'Fetching changes...', failed: 'Failed to fetch changes' },
        (client) =>
          client.get<ApiResponse<AppChange[]>>(`/api/v1/apps/${id}/changes`, {
            type: opts.type,
            limit: opts.limit,
          }),
        (result) => formatChangesTable(result.data),
      );
    });
}
