import { Command } from 'commander';
import { registerAuthCommand } from './commands/auth.js';
import { registerAppsCommand } from './commands/apps.js';
import { registerKeywordsCommand } from './commands/keywords.js';
import { registerRankingsCommand } from './commands/rankings.js';
import { registerCompetitorsCommand } from './commands/competitors.js';
import { registerExportCommand } from './commands/export.js';

const program = new Command();

program
  .name('sonar')
  .description('Sonar — App Store Optimization from the command line')
  .version('0.1.0')
  .option('--table', 'Output as formatted table instead of JSON')
  .option('--verbose', 'Show request timing and rate limit info')
  .option('--base-url <url>', 'Override API base URL');

registerAuthCommand(program);
registerAppsCommand(program);
registerKeywordsCommand(program);
registerRankingsCommand(program);
registerCompetitorsCommand(program);
registerExportCommand(program);

program.parse();
