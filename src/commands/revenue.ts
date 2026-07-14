import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config.js';
import { createClient } from '../client.js';
import { formatRevenue } from '../formatters/table.js';
import { formatJson } from '../formatters/json.js';
import type { ApiResponse, Revenue } from '../types.js';

function requireConfig() {
  const config = loadConfig();
  if (!config) {
    console.error(chalk.red('Not authenticated. Run `sonar auth login` first.'));
    process.exit(1);
  }
  return config;
}

export function registerRevenueCommand(program: Command): void {
  program
    .command('revenue')
    .description('Estimate monthly revenue for an app')
    .requiredOption('--store <store>', 'ios or android')
    .requiredOption('--id <id>', 'App Store numeric ID or Play Store package name')
    .option('--country <country>', 'Country code (ISO 3166-1 alpha-2)', 'us')
    .action(async (opts: { store: string; id: string; country: string }) => {
      if (!['ios', 'android'].includes(opts.store)) {
        console.error(chalk.red('Invalid --store. Use: ios or android'));
        process.exit(1);
      }

      const config = requireConfig();
      const globalOpts = program.opts();
      const client = createClient(config, { verbose: globalOpts.verbose });

      const spinner = globalOpts.table ? ora('Estimating revenue...').start() : null;

      try {
        const result = await client.get<ApiResponse<Revenue>>('/api/v1/apps/revenue', {
          store: opts.store,
          id: opts.id,
          country: opts.country,
        });

        if (spinner) spinner.stop();

        if (globalOpts.table) {
          console.log(formatRevenue(result.data));
        } else {
          console.log(formatJson(result));
        }
      } catch (err) {
        if (spinner) spinner.fail('Failed to estimate revenue');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}
