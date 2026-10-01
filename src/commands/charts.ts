import { Command } from 'commander';
import chalk from 'chalk';
import { formatTopChartTable } from '../formatters/table.js';
import { runCommand, validateStore } from './helpers.js';
import type { ApiResponse, TopChart } from '../types.js';

export function registerChartsCommand(program: Command): void {
  const charts = program.command('charts').description('Store top charts');

  charts
    .command('top')
    .description('Top free/paid/grossing chart with day-over-day movement')
    .requiredOption('--store <store>', 'ios or android')
    .option('--country <country>', 'Country code (ISO 3166-1 alpha-2)', 'us')
    .option('--chart <chart>', 'free, paid or grossing', 'free')
    .option('--category <category>', 'Category key (e.g. HEALTH_AND_FITNESS) or overall', 'overall')
    .option('--limit <n>', 'Entries to return (1-200)', '50')
    .action(
      async (opts: {
        store: string;
        country: string;
        chart: string;
        category: string;
        limit: string;
      }) => {
        validateStore(opts.store);

        if (!['free', 'paid', 'grossing'].includes(opts.chart)) {
          console.error(chalk.red('Invalid --chart. Use: free, paid or grossing'));
          process.exit(1);
        }

        const limit = Number.parseInt(opts.limit, 10);
        if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
          console.error(chalk.red('Invalid --limit. Use an integer between 1 and 100.'));
          process.exit(1);
        }

        await runCommand(
          program,
          { loading: 'Fetching top chart...', failed: 'Failed to fetch top chart' },
          (client) =>
            client.get<ApiResponse<TopChart>>('/api/v1/charts/top', {
              store: opts.store,
              country: opts.country,
              chart: opts.chart,
              category: opts.category,
              limit,
            }),
          (result) => formatTopChartTable(result.data),
        );
      },
    );
}
