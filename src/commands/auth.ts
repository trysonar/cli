import { Command } from 'commander';
import chalk from 'chalk';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { loadConfig, saveConfig, clearConfig, getConfigPath } from '../config.js';
import { createClient } from '../client.js';
import type { ApiResponse, App } from '../types.js';

export function registerAuthCommand(program: Command): void {
  const auth = program
    .command('auth')
    .description('Manage authentication');

  auth
    .command('login')
    .description('Authenticate with your API key')
    .option('--base-url <url>', 'API base URL')
    .action(async (opts) => {
      const rl = createInterface({ input: stdin, output: stdout });

      try {
        console.log(chalk.bold('Sonar CLI Login\n'));
        console.log('Enter your API key. You can find it at:');
        console.log(chalk.dim('  https://trysonar.app/developers\n'));

        const apiKey = await rl.question('API Key: ');

        if (!apiKey.trim()) {
          console.error(chalk.red('Error: API key cannot be empty.'));
          process.exit(1);
        }

        const baseUrl = opts.baseUrl || program.opts().baseUrl || 'https://trysonar.app';

        // Validate the key by making a test request
        console.log(chalk.dim('\nValidating API key...'));
        const client = createClient({ apiKey: apiKey.trim(), baseUrl });

        try {
          await client.get<ApiResponse<App[]>>('/api/v1/apps');
        } catch (err) {
          console.error(chalk.red(`\nAuthentication failed: ${(err as Error).message}`));
          process.exit(1);
        }

        saveConfig({ apiKey: apiKey.trim(), baseUrl });
        console.log(chalk.green('\nAuthenticated successfully!'));
        console.log(chalk.dim(`Config saved to ${getConfigPath()}`));
      } finally {
        rl.close();
      }
    });

  auth
    .command('logout')
    .description('Remove saved credentials')
    .action(() => {
      clearConfig();
      console.log(chalk.green('Logged out. Config file removed.'));
    });

  auth
    .command('status')
    .description('Show current authentication status')
    .action(async () => {
      const config = loadConfig();

      if (!config) {
        console.log(chalk.yellow('Not authenticated.'));
        console.log(chalk.dim('Run `sonar auth login` to authenticate.'));
        return;
      }

      const masked = config.apiKey.slice(0, 8) + '...' + config.apiKey.slice(-4);
      console.log(chalk.bold('Authentication Status\n'));
      console.log(`  ${chalk.dim('API Key:')}    ${masked}`);
      console.log(`  ${chalk.dim('Base URL:')}   ${config.baseUrl}`);
      console.log(`  ${chalk.dim('Config:')}     ${getConfigPath()}`);

      // Try to fetch quota info
      try {
        const response = await fetch(`${config.baseUrl}/api/v1/apps`, {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            Accept: 'application/json',
          },
        });

        const rateLimit = response.headers.get('x-ratelimit-limit');
        const rateRemaining = response.headers.get('x-ratelimit-remaining');

        if (rateLimit && rateRemaining) {
          console.log(`  ${chalk.dim('Quota:')}      ${rateRemaining}/${rateLimit} requests remaining today`);
        }

        if (response.ok) {
          console.log(`\n  ${chalk.green('API key is valid.')}`);
        } else {
          console.log(`\n  ${chalk.red('API key may be invalid or expired.')}`);
        }
      } catch {
        console.log(chalk.dim('\n  Could not reach API to verify key.'));
      }
    });
}
