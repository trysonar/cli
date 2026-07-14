import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config.js';
import { createClient } from '../client.js';
import {
  formatAppsTable,
  formatAppDetail,
  formatAppLookup,
  formatAppSearchTable,
  formatAsoScore,
  formatExtractedKeywords,
  formatReviewsTable,
  formatChangesTable,
} from '../formatters/table.js';
import { formatJson } from '../formatters/json.js';
import { runCommand, validateStore, confirmDestructive } from './helpers.js';
import type {
  ApiResponse,
  App,
  AppChange,
  AppLookup,
  AsoScoreResult,
  ExtractKeywordsResult,
  Review,
  UntrackAppResult,
} from '../types.js';

function requireConfig() {
  const config = loadConfig();
  if (!config) {
    console.error(chalk.red('Not authenticated. Run `sonar auth login` first.'));
    process.exit(1);
  }
  return config;
}

export function registerAppsCommand(program: Command): void {
  const apps = program
    .command('apps')
    .description('Manage tracked apps');

  apps
    .command('list')
    .description('List all tracked apps')
    .action(async () => {
      const config = requireConfig();
      const globalOpts = program.opts();
      const client = createClient(config, { verbose: globalOpts.verbose });

      const spinner = globalOpts.table ? ora('Fetching apps...').start() : null;

      try {
        const result = await client.get<ApiResponse<App[]>>('/api/v1/apps');

        if (spinner) spinner.stop();

        if (globalOpts.table) {
          console.log(formatAppsTable(result.data));
        } else {
          console.log(formatJson(result));
        }
      } catch (err) {
        if (spinner) spinner.fail('Failed to fetch apps');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  apps
    .command('get')
    .description('Get details for a specific app')
    .argument('<id>', 'App ID')
    .action(async (id: string) => {
      const config = requireConfig();
      const globalOpts = program.opts();
      const client = createClient(config, { verbose: globalOpts.verbose });

      const spinner = globalOpts.table ? ora('Fetching app...').start() : null;

      try {
        const result = await client.get<ApiResponse<App>>(`/api/v1/apps/${id}`);

        if (spinner) spinner.stop();

        if (globalOpts.table) {
          console.log(formatAppDetail(result.data));
        } else {
          console.log(formatJson(result));
        }
      } catch (err) {
        if (spinner) spinner.fail('Failed to fetch app');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
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
            min_rating: opts.minRating,
            max_rating: opts.maxRating,
            limit: opts.limit,
          }),
        (result) => formatReviewsTable(result.data),
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
