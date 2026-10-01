import { Command } from 'commander';
import {
  formatAnalyzeResult,
  formatCompetitorKeywordsTable,
  formatLandscape,
  formatScanResult,
} from '../formatters/table.js';
import { runCommand } from './helpers.js';
import type {
  ApiResponse,
  CompetitorInsightPayload,
  CompetitorKeyword,
  CompetitorLandscapeResult,
  ScanCompetitorResult,
} from '../types.js';

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
      await runCommand(
        program,
        { loading: 'Fetching competitor keywords...', failed: 'Failed to fetch competitor keywords' },
        (client) => {
          const params: Record<string, string | number | undefined> = {};
          if (opts.app) {
            params.app_id = opts.app;
          }

          return client.get<ApiResponse<CompetitorKeyword[]>>(
            `/api/v1/competitors/${competitorId}/keywords`,
            params,
          );
        },
        (result) => formatCompetitorKeywordsTable(result.data),
      );
    });

  competitors
    .command('landscape')
    .description('Competitive keyword landscape for one of your apps: gaps, threats, leads + latest AI insight')
    .argument('<app-id>', 'Your app ID')
    .action(async (appId: string) => {
      await runCommand(
        program,
        { loading: 'Building competitive landscape...', failed: 'Failed to fetch landscape' },
        (client) =>
          client.get<ApiResponse<CompetitorLandscapeResult>>(
            `/api/v1/apps/${encodeURIComponent(appId)}/competitor-landscape`,
          ),
        (result) => formatLandscape(result.data),
      );
    });

  competitors
    .command('analyze')
    .description('Generate a fresh AI competitive insight for one of your apps (7-day cooldown; requires a write-scope API key)')
    .argument('<app-id>', 'Your app ID')
    .action(async (appId: string) => {
      await runCommand(
        program,
        { loading: 'Analyzing competitive landscape (AI)...', failed: 'Analysis failed' },
        (client) =>
          client.post<ApiResponse<{ app_id: string; insight: CompetitorInsightPayload }>>(
            `/api/v1/apps/${encodeURIComponent(appId)}/competitor-landscape`,
            {},
          ),
        (result) => formatAnalyzeResult(result.data.insight),
      );
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
