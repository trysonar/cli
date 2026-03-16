import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config.js';
import { createClient } from '../client.js';
import { formatAppsTable, formatAppDetail } from '../formatters/table.js';
import { formatJson } from '../formatters/json.js';
import type { ApiResponse, App } from '../types.js';

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
}
