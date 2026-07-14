import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config.js';
import { createClient } from '../client.js';
import { formatCompetitorKeywordsTable, formatScanResult } from '../formatters/table.js';
import { formatJson } from '../formatters/json.js';
import { runCommand } from './helpers.js';
import type { ApiResponse, CompetitorKeyword, ScanCompetitorResult } from '../types.js';

function requireConfig() {
  const config = loadConfig();
  if (!config) {
    console.error(chalk.red('Not authenticated. Run `sonar auth login` first.'));
    process.exit(1);
  }
  return config;
}

export function registerCompetitorsCommand(program: Command): void {
  const competitors = program
    .command('competitors')
    .description('Competitor analysis');

  competitors
    .command('keywords')
    .description('View keywords a competitor ranks for')
    .argument('<competitor-id>', 'Competitor app ID')
    .option('--app <id>', 'Your app ID (for gap analysis)')
    .action(async (competitorId: string, opts) => {
      const config = requireConfig();
      const globalOpts = program.opts();
      const client = createClient(config, { verbose: globalOpts.verbose });

      const spinner = globalOpts.table ? ora('Fetching competitor keywords...').start() : null;

      try {
        const params: Record<string, string | number | undefined> = {};
        if (opts.app) {
          params.app_id = opts.app;
        }

        const result = await client.get<ApiResponse<CompetitorKeyword[]>>(
          `/api/v1/competitors/${competitorId}/keywords`,
          params,
        );

        if (spinner) spinner.stop();

        if (globalOpts.table) {
          console.log(formatCompetitorKeywordsTable(result.data));
        } else {
          console.log(formatJson(result));
        }
      } catch (err) {
        if (spinner) spinner.fail('Failed to fetch competitor keywords');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  competitors
    .command('scan')
    .description('Discover keywords a competitor ranks for and record ranks vs your app (requires a write-scope API key)')
    .argument('<competitor-id>', 'Competitor app ID')
    .requiredOption('--app <id>', 'Your app ID the scan compares against')
    .action(async (competitorId: string, opts) => {
      await runCommand(
        program,
        { loading: 'Scanning competitor (this can take a while)...', failed: 'Scan failed' },
        (client) =>
          client.post<ApiResponse<ScanCompetitorResult>>(
            `/api/v1/competitors/${encodeURIComponent(competitorId)}/scan`,
            { own_app_id: opts.app },
          ),
        (result) => formatScanResult(result.data),
      );
    });
}
