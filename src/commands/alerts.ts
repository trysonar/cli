import { Command } from 'commander';
import chalk from 'chalk';
import { formatAlertsTable } from '../formatters/table.js';
import { runCommand, confirmDestructive } from './helpers.js';
import type {
  ApiResponse,
  AlertRule,
  AlertType,
  DeleteAlertResult,
} from '../types.js';

const ALERT_TYPES: AlertType[] = [
  'rank_drop',
  'rank_gain',
  'entered_top10',
  'left_top10',
  'new_ranking',
  'rating_drop',
  'review_spike',
  'competitor_change',
];

export function registerAlertsCommand(program: Command): void {
  const alerts = program
    .command('alerts')
    .description('Manage alert rules');

  alerts
    .command('list')
    .description('List all alert rules')
    .action(async () => {
      await runCommand(
        program,
        { loading: 'Fetching alert rules...', failed: 'Failed to fetch alert rules' },
        (client) => client.get<ApiResponse<AlertRule[]>>('/api/v1/alerts'),
        (result) => formatAlertsTable(result.data),
      );
    });

  alerts
    .command('set')
    .description(`Create or update an alert rule. Type is one of: ${ALERT_TYPES.join(', ')}`)
    .argument('<type>', `Alert type (${ALERT_TYPES.join(', ')})`)
    .option('--scope-app <app-id>', 'Scope to a single app (omit for org-wide)')
    .option('--threshold <n>', 'Threshold (defaults to the per-type default)', parseInt)
    .option('--disabled', 'Create the rule disabled (default: enabled)')
    .action(async (type: string, opts) => {
      if (!ALERT_TYPES.includes(type as AlertType)) {
        console.error(chalk.red(`Invalid alert type "${type}". Use one of: ${ALERT_TYPES.join(', ')}`));
        process.exit(1);
      }

      await runCommand(
        program,
        { loading: 'Saving alert rule...', failed: 'Failed to save alert rule' },
        (client) =>
          client.post<ApiResponse<AlertRule>>('/api/v1/alerts', {
            type,
            ...(opts.scopeApp ? { scope_app_id: opts.scopeApp } : {}),
            ...(opts.threshold !== undefined ? { threshold: opts.threshold } : {}),
            enabled: !opts.disabled,
          }),
        (result) =>
          `${chalk.green('✓')} Alert rule saved: ${result.data.type} ` +
          `${chalk.dim(`(${result.data.scope_app_id ? `app ${result.data.scope_app_id}` : 'all apps'}, ` +
            `threshold ${result.data.effective_threshold ?? '-'}, ` +
            `${result.data.enabled ? 'enabled' : 'disabled'})`)} ` +
          chalk.dim(result.data.id),
      );
    });

  alerts
    .command('delete')
    .description('Delete an alert rule')
    .argument('<id>', 'Alert rule ID')
    .option('-f, --force', 'Skip the confirmation prompt')
    .action(async (id: string, opts) => {
      await confirmDestructive(`This will delete alert rule ${id}.`, opts.force);

      await runCommand(
        program,
        { loading: 'Deleting alert rule...', failed: 'Failed to delete alert rule' },
        (client) =>
          client.delete<ApiResponse<DeleteAlertResult>>(`/api/v1/alerts/${encodeURIComponent(id)}`),
        (result) =>
          result.data.deleted
            ? `${chalk.green('✓')} Alert rule deleted (${result.data.id})`
            : chalk.dim('Nothing to delete.'),
      );
    });
}
