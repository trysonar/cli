import { Command } from 'commander';
import { formatRankingsTable } from '../formatters/table.js';
import { runCommand } from './helpers.js';
import type { ApiResponse, RankingEntry } from '../types.js';

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

      await runCommand(
        program,
        { loading: 'Fetching rankings...', failed: 'Failed to fetch rankings' },
        (client) => {
          const params: Record<string, string | number | undefined> = {
            days: opts.days,
          };
          if (opts.keyword) {
            params.keyword_id = opts.keyword;
          }

          return client.get<ApiResponse<RankingEntry[]>>(
            `/api/v1/apps/${appId}/rankings`,
            params,
          );
        },
        (result) => formatRankingsTable(result.data),
      );
    });

  rankings
    .command('keyword')
    .description('View apps ranking for a specific keyword')
    .argument('<keyword-id>', 'Keyword ID')
    .option('--days <n>', 'Number of days of history', '30')
    .action(async (keywordId: string, opts) => {
      await runCommand(
        program,
        { loading: 'Fetching keyword rankings...', failed: 'Failed to fetch keyword rankings' },
        (client) =>
          client.get<ApiResponse<RankingEntry[]>>(
            `/api/v1/keywords/${keywordId}/rankings`,
            { days: opts.days },
          ),
        (result) => formatRankingsTable(result.data),
      );
    });
}
