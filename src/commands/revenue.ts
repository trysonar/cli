import { Command } from 'commander';
import { formatRevenue } from '../formatters/table.js';
import { runCommand, validateStore } from './helpers.js';
import type { ApiResponse, Revenue } from '../types.js';

export function registerRevenueCommand(program: Command): void {
  program
    .command('revenue')
    .description('Estimate monthly revenue for an app')
    .requiredOption('--store <store>', 'ios or android')
    .requiredOption('--id <id>', 'App Store numeric ID or Play Store package name')
    .option('--country <country>', 'Country code (ISO 3166-1 alpha-2)', 'us')
    .action(async (opts: { store: string; id: string; country: string }) => {
      validateStore(opts.store);

      await runCommand(
        program,
        { loading: 'Estimating revenue...', failed: 'Failed to estimate revenue' },
        (client) =>
          client.get<ApiResponse<Revenue>>('/api/v1/apps/revenue', {
            store: opts.store,
            id: opts.id,
            country: opts.country,
          }),
        (result) => formatRevenue(result.data),
      );
    });
}
