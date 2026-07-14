import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { loadConfig, type CliConfig } from '../config.js';
import { createClient, type ApiClient } from '../client.js';
import { formatJson } from '../formatters/json.js';

export function requireConfig(): CliConfig {
  const config = loadConfig();
  if (!config) {
    console.error(chalk.red('Not authenticated. Run `sonar auth login` first.'));
    process.exit(1);
  }
  return config;
}

/**
 * Prompt the user to confirm a destructive action. Skipped entirely when
 * `force` is true (the --force/-f flag). Aborts the process unless the user
 * types exactly "yes".
 */
export async function confirmDestructive(message: string, force: boolean): Promise<void> {
  if (force) return;

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.error(chalk.yellow(message));
    const answer = await rl.question('Type "yes" to confirm: ');
    if (answer.trim() !== 'yes') {
      console.error(chalk.dim('Aborted.'));
      process.exit(1);
    }
  } finally {
    rl.close();
  }
}

export function validateStore(store: string): void {
  if (!['ios', 'android'].includes(store)) {
    console.error(chalk.red('Invalid --store. Use: ios or android'));
    process.exit(1);
  }
}

/**
 * Shared action boilerplate: load config, build the client, show a spinner
 * in --table mode, run the request, print table or JSON, exit 1 on failure.
 * `toTable` renders the unwrapped payload; JSON mode prints the raw result.
 */
export async function runCommand<T>(
  program: Command,
  labels: { loading: string; failed: string },
  request: (client: ApiClient) => Promise<T>,
  toTable: (result: T) => string,
): Promise<void> {
  const config = requireConfig();
  const globalOpts = program.opts();
  const client = createClient(config, { verbose: globalOpts.verbose });

  const spinner = globalOpts.table ? ora(labels.loading).start() : null;

  try {
    const result = await request(client);

    if (spinner) spinner.stop();

    if (globalOpts.table) {
      console.log(toTable(result));
    } else {
      console.log(formatJson(result));
    }
  } catch (err) {
    if (spinner) spinner.fail(labels.failed);
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }
}
