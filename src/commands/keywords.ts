import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config.js';
import { createClient } from '../client.js';
import { formatKeywordsTable, formatSuggestionsTable, formatTrackKeywordsResult } from '../formatters/table.js';
import { formatJson } from '../formatters/json.js';
import { runCommand, confirmDestructive } from './helpers.js';
import type {
  ApiResponse,
  PaginatedResponse,
  KeywordResult,
  TrackedKeyword,
  Suggestion,
  TrackKeywordsResult,
  UpdateKeywordNoteResult,
  UntrackKeywordResult,
  UntrackKeywordsResult,
} from '../types.js';

function requireConfig() {
  const config = loadConfig();
  if (!config) {
    console.error(chalk.red('Not authenticated. Run `sonar auth login` first.'));
    process.exit(1);
  }
  return config;
}

export function registerKeywordsCommand(program: Command): void {
  const keywords = program
    .command('keywords')
    .description('Keyword research and tracking');

  keywords
    .command('search')
    .description('Search for keyword metrics')
    .argument('<query>', 'Keyword to search')
    .requiredOption('--store <store>', 'App store (ios or android)')
    .option('--country <cc>', 'Country code', 'us')
    .action(async (query: string, opts) => {
      const config = requireConfig();
      const globalOpts = program.opts();
      const client = createClient(config, { verbose: globalOpts.verbose });

      const spinner = globalOpts.table ? ora('Searching keywords...').start() : null;

      try {
        const result = await client.get<ApiResponse<KeywordResult[]>>('/api/v1/keywords/search', {
          q: query,
          store: opts.store,
          country: opts.country,
        });

        if (spinner) spinner.stop();

        if (globalOpts.table) {
          console.log(formatKeywordsTable(result.data));
        } else {
          console.log(formatJson(result));
        }
      } catch (err) {
        if (spinner) spinner.fail('Search failed');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  keywords
    .command('list')
    .description('List tracked keywords for an app')
    .argument('<app-id>', 'App ID')
    .action(async (appId: string) => {
      const config = requireConfig();
      const globalOpts = program.opts();
      const client = createClient(config, { verbose: globalOpts.verbose });

      const spinner = globalOpts.table ? ora('Fetching keywords...').start() : null;

      try {
        // Auto-paginate to collect all keywords
        const allKeywords: TrackedKeyword[] = [];
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
          const result = await client.get<PaginatedResponse<TrackedKeyword>>(
            `/api/v1/apps/${appId}/keywords`,
            cursor ? { cursor } : undefined,
          );

          allKeywords.push(...result.data);
          hasMore = result.pagination.has_more;
          cursor = result.pagination.next_cursor ?? undefined;
        }

        if (spinner) spinner.stop();

        if (globalOpts.table) {
          console.log(formatKeywordsTable(allKeywords));
          if (allKeywords.length > 0) {
            console.log(chalk.dim(`\n${allKeywords.length} keywords total`));
          }
        } else {
          console.log(formatJson({ data: allKeywords }));
        }
      } catch (err) {
        if (spinner) spinner.fail('Failed to fetch keywords');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  keywords
    .command('metrics')
    .description('Difficulty + popularity for one or more keywords (1 credit each)')
    .argument('<keywords...>', 'Keyword(s) to fetch metrics for — pass multiple for bulk (max 25)')
    .requiredOption('--store <store>', 'App store (ios or android)')
    .option('--country <cc>', 'Country code', 'us')
    .action(async (terms: string[], opts) => {
      const config = requireConfig();
      const globalOpts = program.opts();
      const client = createClient(config, { verbose: globalOpts.verbose });

      // De-dupe + trim up front so the user sees what they're billed for.
      // Mirrors the server-side dedup in /api/v1/keywords/metrics.
      const unique = Array.from(new Set(terms.map((t) => t.trim()).filter(Boolean)));
      if (unique.length === 0) {
        console.error(chalk.red('At least one keyword is required'));
        process.exit(1);
      }
      if (unique.length > 25) {
        console.error(chalk.red(`Too many keywords: ${unique.length}. Max 25 per request.`));
        process.exit(1);
      }

      const spinner = globalOpts.table ? ora(`Fetching metrics for ${unique.length} keyword${unique.length > 1 ? 's' : ''}...`).start() : null;

      try {
        // Single vs bulk path mirrors the API: `q` returns a flat object,
        // `qs` returns an array. Always present as an array to the user
        // so the CLI output is consistent.
        let data: KeywordResult[];
        if (unique.length === 1) {
          const result = await client.get<ApiResponse<KeywordResult>>('/api/v1/keywords/metrics', {
            q: unique[0],
            store: opts.store,
            country: opts.country,
          });
          data = [result.data];
        } else {
          const result = await client.get<ApiResponse<KeywordResult[]>>('/api/v1/keywords/metrics', {
            qs: unique.join(','),
            store: opts.store,
            country: opts.country,
          });
          data = result.data;
        }

        if (spinner) spinner.stop();

        if (globalOpts.table) {
          console.log(formatKeywordsTable(data));
          console.log(chalk.dim(`\n${data.length} keyword${data.length === 1 ? '' : 's'} · ${data.length} credit${data.length === 1 ? '' : 's'} charged`));
        } else {
          console.log(formatJson({ data }));
        }
      } catch (err) {
        if (spinner) spinner.fail('Failed to fetch metrics');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  keywords
    .command('track')
    .description('Start tracking keywords for an app (requires a write-scope API key)')
    .argument('<app-id>', 'App ID')
    .argument('<keywords...>', 'Keyword(s) to track (max 200)')
    .option('--country <cc>', 'Country code (defaults to the product\'s country)')
    .action(async (appId: string, terms: string[], opts) => {
      const unique = Array.from(new Set(terms.map((t) => t.trim()).filter(Boolean)));
      if (unique.length === 0) {
        console.error(chalk.red('At least one keyword is required'));
        process.exit(1);
      }
      if (unique.length > 200) {
        console.error(chalk.red(`Too many keywords: ${unique.length}. Max 200 per request.`));
        process.exit(1);
      }

      await runCommand(
        program,
        { loading: `Tracking ${unique.length} keyword${unique.length > 1 ? 's' : ''}...`, failed: 'Failed to track keywords' },
        (client) =>
          client.post<ApiResponse<TrackKeywordsResult>>(
            `/api/v1/apps/${encodeURIComponent(appId)}/keywords`,
            {
              keywords: unique,
              ...(opts.country ? { country: opts.country } : {}),
            },
          ),
        (result) => formatTrackKeywordsResult(result.data),
      );
    });

  keywords
    .command('note')
    .description('Set or clear the note on a tracked keyword (requires a write-scope API key)')
    .argument('<tracked-keyword-id>', 'Tracked keyword ID (the `id` from `sonar keywords list`)')
    .argument('[note]', 'Note text (max 1000 chars)')
    .option('--clear', 'Clear the note')
    .action(async (trackedKeywordId: string, note: string | undefined, opts) => {
      if (!opts.clear && note === undefined) {
        console.error(chalk.red('Pass a note, or --clear to remove the existing one.'));
        process.exit(1);
      }
      if (opts.clear && note !== undefined) {
        console.error(chalk.red('Pass either a note or --clear, not both.'));
        process.exit(1);
      }

      await runCommand(
        program,
        { loading: 'Updating note...', failed: 'Failed to update note' },
        (client) =>
          client.patch<ApiResponse<UpdateKeywordNoteResult>>(
            `/api/v1/tracked-keywords/${encodeURIComponent(trackedKeywordId)}`,
            { note: opts.clear ? null : note },
          ),
        (result) =>
          result.data.note === null
            ? `${chalk.green('✓')} Note cleared`
            : `${chalk.green('✓')} Note saved: ${result.data.note}`,
      );
    });

  keywords
    .command('star')
    .description('Star a tracked keyword — mark it as a favorite/target (requires a write-scope API key)')
    .argument('<tracked-keyword-id>', 'Tracked keyword ID (the `id` from `sonar keywords list`)')
    .action(async (trackedKeywordId: string) => {
      await runCommand(
        program,
        { loading: 'Starring keyword...', failed: 'Failed to star keyword' },
        (client) =>
          client.patch<ApiResponse<UpdateKeywordNoteResult>>(
            `/api/v1/tracked-keywords/${encodeURIComponent(trackedKeywordId)}`,
            { starred: true },
          ),
        (result) => `${chalk.green('✓')} Keyword starred (${result.data.id})`,
      );
    });

  keywords
    .command('unstar')
    .description('Unstar a tracked keyword (requires a write-scope API key)')
    .argument('<tracked-keyword-id>', 'Tracked keyword ID (the `id` from `sonar keywords list`)')
    .action(async (trackedKeywordId: string) => {
      await runCommand(
        program,
        { loading: 'Unstarring keyword...', failed: 'Failed to unstar keyword' },
        (client) =>
          client.patch<ApiResponse<UpdateKeywordNoteResult>>(
            `/api/v1/tracked-keywords/${encodeURIComponent(trackedKeywordId)}`,
            { starred: false },
          ),
        (result) => `${chalk.green('✓')} Keyword unstarred (${result.data.id})`,
      );
    });

  keywords
    .command('untrack')
    .description('Stop tracking a keyword (requires a write-scope API key)')
    .argument('<tracked-keyword-id>', 'Tracked keyword ID (the `id` from `sonar keywords list`)')
    .option('-f, --force', 'Skip the confirmation prompt')
    .action(async (trackedKeywordId: string, opts) => {
      await confirmDestructive(
        `This will stop tracking keyword ${trackedKeywordId}.`,
        opts.force,
      );

      await runCommand(
        program,
        { loading: 'Untracking keyword...', failed: 'Failed to untrack keyword' },
        (client) =>
          client.delete<ApiResponse<UntrackKeywordResult>>(
            `/api/v1/tracked-keywords/${encodeURIComponent(trackedKeywordId)}`,
          ),
        (result) =>
          result.data.deleted
            ? `${chalk.green('✓')} Keyword untracked (${result.data.id})`
            : chalk.dim('Nothing to untrack.'),
      );
    });

  keywords
    .command('untrack-all')
    .description('Stop tracking multiple (or all) keywords for an app (requires a write-scope API key)')
    .argument('<app-id>', 'App ID')
    .option('--ids <list>', 'Comma-separated tracked-keyword IDs to untrack')
    .option('--all', 'Untrack ALL keywords for the app')
    .option('-f, --force', 'Skip the confirmation prompt')
    .action(async (appId: string, opts) => {
      if (!opts.ids && !opts.all) {
        console.error(chalk.red('Pass either --ids <list> or --all.'));
        process.exit(1);
      }
      if (opts.ids && opts.all) {
        console.error(chalk.red('Pass either --ids or --all, not both.'));
        process.exit(1);
      }

      let ids: string[] = [];
      if (opts.ids) {
        ids = Array.from(new Set(String(opts.ids).split(',').map((s) => s.trim()).filter(Boolean)));
        if (ids.length === 0) {
          console.error(chalk.red('--ids must contain at least one tracked-keyword ID.'));
          process.exit(1);
        }
      }

      await confirmDestructive(
        opts.all
          ? `This will remove ALL tracked keywords for app ${appId}. This cannot be undone.`
          : `This will untrack ${ids.length} keyword${ids.length === 1 ? '' : 's'} for app ${appId}.`,
        opts.force,
      );

      await runCommand(
        program,
        { loading: 'Untracking keywords...', failed: 'Failed to untrack keywords' },
        (client) =>
          client.delete<ApiResponse<UntrackKeywordsResult>>(
            `/api/v1/apps/${encodeURIComponent(appId)}/keywords`,
            opts.all ? { all: 'true' } : { ids: ids.join(',') },
          ),
        (result) =>
          `${chalk.green('✓')} ${result.data.deleted} of ${result.data.requested} keyword${result.data.requested === 1 ? '' : 's'} untracked`,
      );
    });

  keywords
    .command('suggestions')
    .description('Get keyword suggestions')
    .argument('<seed>', 'Seed keyword for suggestions')
    .requiredOption('--store <store>', 'App store (ios or android)')
    .option('--country <cc>', 'Country code', 'us')
    .action(async (seed: string, opts) => {
      const config = requireConfig();
      const globalOpts = program.opts();
      const client = createClient(config, { verbose: globalOpts.verbose });

      const spinner = globalOpts.table ? ora('Fetching suggestions...').start() : null;

      try {
        const result = await client.get<ApiResponse<Suggestion[]>>('/api/v1/keywords/suggestions', {
          q: seed,
          store: opts.store,
          country: opts.country,
        });

        if (spinner) spinner.stop();

        if (globalOpts.table) {
          console.log(formatSuggestionsTable(result.data));
        } else {
          console.log(formatJson(result));
        }
      } catch (err) {
        if (spinner) spinner.fail('Failed to fetch suggestions');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}
