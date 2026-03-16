import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config.js';
import { createClient } from '../client.js';
import { formatRankingsTable } from '../formatters/table.js';
import { formatJson } from '../formatters/json.js';
import type { ApiResponse, RankingEntry } from '../types.js';

function requireConfig() {
  const config = loadConfig();
  if (!config) {
    console.error(chalk.red('Not authenticated. Run `sonar auth login` first.'));
    process.exit(1);
  }
  return config;
}

export function registerRankingsCommand(program: Command): void {
  const rankings = program
    .command('rankings')
    .description('View rank tracking data')
    .argument('[app-id]', 'App ID')
    .option('--days <n>', 'Number of days of history', '30')
    .option('--keyword <id>', 'Filter by keyword ID')
    .action(async (appId: string | undefined, opts) => {
      if (!appId) {
        rankings.help();
        return;
      }

      const config = requireConfig();
      const globalOpts = program.opts();
      const client = createClient(config, { verbose: globalOpts.verbose });

      const spinner = globalOpts.table ? ora('Fetching rankings...').start() : null;

      try {
        const params: Record<string, string | number | undefined> = {
          days: opts.days,
        };
        if (opts.keyword) {
          params.keyword_id = opts.keyword;
        }

        const result = await client.get<ApiResponse<RankingEntry[]>>(
          `/api/v1/apps/${appId}/rankings`,
          params,
        );

        if (spinner) spinner.stop();

        if (globalOpts.table) {
          console.log(formatRankingsTable(result.data));
        } else {
          console.log(formatJson(result));
        }
      } catch (err) {
        if (spinner) spinner.fail('Failed to fetch rankings');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  rankings
    .command('keyword')
    .description('View apps ranking for a specific keyword')
    .argument('<keyword-id>', 'Keyword ID')
    .option('--days <n>', 'Number of days of history', '30')
    .action(async (keywordId: string, opts) => {
      const config = requireConfig();
      const globalOpts = program.opts();
      const client = createClient(config, { verbose: globalOpts.verbose });

      const spinner = globalOpts.table ? ora('Fetching keyword rankings...').start() : null;

      try {
        const result = await client.get<ApiResponse<RankingEntry[]>>(
          `/api/v1/keywords/${keywordId}/rankings`,
          { days: opts.days },
        );

        if (spinner) spinner.stop();

        if (globalOpts.table) {
          console.log(formatRankingsTable(result.data));
        } else {
          console.log(formatJson(result));
        }
      } catch (err) {
        if (spinner) spinner.fail('Failed to fetch keyword rankings');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}
