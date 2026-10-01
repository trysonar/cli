import { Command } from 'commander';
import { formatPortfolio } from '../formatters/table.js';
import { runCommand } from './helpers.js';
import type { ApiResponse, PortfolioResult } from '../types.js';

export function registerPortfolioCommand(program: Command): void {
  program
    .command('portfolio')
    .description('Portfolio rollup across all your apps (Agency plan): per-app KPIs, movers, attention list, opportunities')
    .action(async () => {
      await runCommand(
        program,
        { loading: 'Building portfolio rollup...', failed: 'Failed to fetch portfolio' },
        (client) => client.get<ApiResponse<PortfolioResult>>('/api/v1/portfolio'),
        (result) => formatPortfolio(result.data),
      );
    });
}
