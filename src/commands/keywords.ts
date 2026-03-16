import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config.js';
import { createClient } from '../client.js';
import { formatKeywordsTable, formatSuggestionsTable } from '../formatters/table.js';
import { formatJson } from '../formatters/json.js';
import type { ApiResponse, PaginatedResponse, KeywordResult, TrackedKeyword, Suggestion } from '../types.js';

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
