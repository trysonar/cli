import { Command } from 'commander';
import { registerAuthCommand } from './commands/auth.js';
import { registerAppsCommand } from './commands/apps.js';
import { registerKeywordsCommand } from './commands/keywords.js';
import { registerRankingsCommand } from './commands/rankings.js';
import { registerCompetitorsCommand } from './commands/competitors.js';
import { registerExportCommand } from './commands/export.js';
import { registerRevenueCommand } from './commands/revenue.js';
import { registerProductsCommand } from './commands/products.js';
import { registerAlertsCommand } from './commands/alerts.js';
import { registerChartsCommand } from './commands/charts.js';
import { registerPortfolioCommand } from './commands/portfolio.js';

declare const __SONAR_CLI_VERSION__: string;
const VERSION = typeof __SONAR_CLI_VERSION__ !== 'undefined' ? __SONAR_CLI_VERSION__ : 'dev';

const program = new Command();

program
  .name('sonar')
  .description('Sonar CLI — App Store Optimization from the command line')
  .version(VERSION)
  .option('--table', 'Output as formatted table instead of JSON')
  .option('--verbose', 'Show request timing and rate limit info')
  .option('--base-url <url>', 'Override API base URL');

registerAuthCommand(program);
registerAppsCommand(program);
registerKeywordsCommand(program);
registerRankingsCommand(program);
registerCompetitorsCommand(program);
registerExportCommand(program);
registerRevenueCommand(program);
registerProductsCommand(program);
registerAlertsCommand(program);
registerChartsCommand(program);
registerPortfolioCommand(program);

program.parse();
