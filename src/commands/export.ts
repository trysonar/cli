import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync } from 'node:fs';
import { createClient } from '../client.js';
import { csvCell } from '../formatters/csv.js';
import { formatJson } from '../formatters/json.js';
import { requireConfig } from './helpers.js';
import type { ApiResponse, RankingEntry } from '../types.js';

export function registerExportCommand(program: Command): void {
  const exp = program
    .command('export')
    .description('Export data to CSV or JSON');

  exp
    .command('rankings')
    .description('Export ranking data for an app')
    .argument('<app-id>', 'App ID')
    .option('--format <format>', 'Output format (csv or json)', 'csv')
    .option('--days <n>', 'Number of days of history', '30')
    .option('--output <file>', 'Output file path (defaults to stdout)')
    .action(async (appId: string, opts) => {
      const config = requireConfig();
      const globalOpts = program.opts();
      const client = createClient(config, { verbose: globalOpts.verbose });

      const spinner = opts.output ? ora('Exporting rankings...').start() : null;

      try {
        const result = await client.get<ApiResponse<RankingEntry[]>>(
          `/api/v1/apps/${appId}/rankings`,
          { days: opts.days },
        );

        let output: string;

        if (opts.format === 'json') {
          output = formatJson(result);
        } else {
          // CSV format: keyword,date,rank
          const lines = ['keyword,date,rank'];
          for (const entry of result.data) {
            for (const point of entry.history) {
              lines.push([entry.keyword, point.measured_at, point.rank].map(csvCell).join(','));
            }
          }
          output = lines.join('\n') + '\n';
        }

        if (opts.output) {
          writeFileSync(opts.output, output, 'utf-8');
          if (spinner) spinner.succeed(`Exported to ${opts.output}`);
        } else {
          if (spinner) spinner.stop();
          process.stdout.write(output);
        }
      } catch (err) {
        if (spinner) spinner.fail('Export failed');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}
