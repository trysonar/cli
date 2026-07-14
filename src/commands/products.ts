import { Command } from 'commander';
import chalk from 'chalk';
import {
  formatProductCreated,
  formatAppLinked,
  formatProductsTable,
} from '../formatters/table.js';
import { runCommand, validateStore, confirmDestructive } from './helpers.js';
import type {
  ApiResponse,
  CreateProductResult,
  TrackAppResult,
  TrackCompetitorResult,
  ProductSummary,
  DeleteProductResult,
  RemoveCompetitorResult,
} from '../types.js';

export function registerProductsCommand(program: Command): void {
  const products = program
    .command('products')
    .description('Create products and link apps (requires a write-scope API key)');

  products
    .command('list')
    .description('List all products and their linked apps')
    .action(async () => {
      await runCommand(
        program,
        { loading: 'Fetching products...', failed: 'Failed to fetch products' },
        (client) => client.get<ApiResponse<ProductSummary[]>>('/api/v1/products'),
        (result) => formatProductsTable(result.data),
      );
    });

  products
    .command('create')
    .description('Create a product and start tracking its app(s)')
    .option('--ios <track-id>', 'iOS app numeric track ID')
    .option('--android <package>', 'Android package name')
    .option('--name <name>', 'Product name (defaults to the first app\'s name)')
    .option('--country <cc>', 'Country code for tracking')
    .action(async (opts) => {
      if (!opts.ios && !opts.android) {
        console.error(chalk.red('Pass at least one of --ios <track-id> or --android <package>.'));
        process.exit(1);
      }

      const apps: Record<string, unknown>[] = [];
      if (opts.ios) {
        apps.push({ store: 'ios', store_id: opts.ios, ...(opts.country ? { country: opts.country } : {}) });
      }
      if (opts.android) {
        apps.push({ store: 'android', store_id: opts.android, ...(opts.country ? { country: opts.country } : {}) });
      }

      await runCommand(
        program,
        { loading: 'Creating product...', failed: 'Failed to create product' },
        (client) =>
          client.post<ApiResponse<CreateProductResult>>('/api/v1/products', {
            apps,
            ...(opts.name ? { name: opts.name } : {}),
          }),
        (result) => formatProductCreated(result.data),
      );
    });

  products
    .command('add-app')
    .description('Link the second-store version of a product (e.g. add the Android app to an iOS product)')
    .argument('<product-id>', 'Product ID')
    .requiredOption('--store <store>', 'App store (ios or android)')
    .requiredOption('--id <store-id>', 'iOS numeric track ID or Android package name')
    .option('--country <cc>', 'Country code for tracking')
    .action(async (productId: string, opts) => {
      validateStore(opts.store);
      await runCommand(
        program,
        { loading: 'Linking app...', failed: 'Failed to link app' },
        (client) =>
          client.post<ApiResponse<TrackAppResult>>(
            `/api/v1/products/${encodeURIComponent(productId)}/apps`,
            {
              store: opts.store,
              store_id: opts.id,
              ...(opts.country ? { country: opts.country } : {}),
            },
          ),
        (result) => formatAppLinked('App linked', result.data.product_id, result.data.app),
      );
    });

  products
    .command('add-competitor')
    .description('Track a competitor app under a product')
    .argument('<product-id>', 'Product ID')
    .requiredOption('--store <store>', 'App store (ios or android)')
    .requiredOption('--id <store-id>', 'Competitor\'s iOS numeric track ID or Android package name')
    .option('--country <cc>', 'Country code for tracking')
    .action(async (productId: string, opts) => {
      validateStore(opts.store);
      await runCommand(
        program,
        { loading: 'Adding competitor...', failed: 'Failed to add competitor' },
        (client) =>
          client.post<ApiResponse<TrackCompetitorResult>>(
            `/api/v1/products/${encodeURIComponent(productId)}/competitors`,
            {
              store: opts.store,
              store_id: opts.id,
              ...(opts.country ? { country: opts.country } : {}),
            },
          ),
        (result) =>
          formatAppLinked('Competitor added', result.data.product_id, result.data.competitor),
      );
    });

  products
    .command('delete')
    .description('Delete a product and untrack its apps (requires a write-scope API key)')
    .argument('<product-id>', 'Product ID')
    .option('-f, --force', 'Skip the confirmation prompt')
    .action(async (productId: string, opts) => {
      await confirmDestructive(
        `This will delete product ${productId} and untrack all its apps. This cannot be undone.`,
        opts.force,
      );

      await runCommand(
        program,
        { loading: 'Deleting product...', failed: 'Failed to delete product' },
        (client) =>
          client.delete<ApiResponse<DeleteProductResult>>(
            `/api/v1/products/${encodeURIComponent(productId)}`,
          ),
        (result) =>
          result.data.deleted
            ? `${chalk.green('✓')} Product deleted (${result.data.id}) — ${result.data.untracked_apps} app${result.data.untracked_apps === 1 ? '' : 's'} untracked`
            : chalk.dim('Nothing to delete.'),
      );
    });

  products
    .command('remove-competitor')
    .description('Stop tracking a competitor under a product (requires a write-scope API key)')
    .argument('<product-id>', 'Product ID')
    .argument('<competitor-app-id>', 'Competitor app ID')
    .option('-f, --force', 'Skip the confirmation prompt')
    .action(async (productId: string, competitorAppId: string, opts) => {
      await confirmDestructive(
        `This will stop tracking competitor ${competitorAppId} under product ${productId}.`,
        opts.force,
      );

      await runCommand(
        program,
        { loading: 'Removing competitor...', failed: 'Failed to remove competitor' },
        (client) =>
          client.delete<ApiResponse<RemoveCompetitorResult>>(
            `/api/v1/products/${encodeURIComponent(productId)}/competitors/${encodeURIComponent(competitorAppId)}`,
          ),
        (result) =>
          result.data.deleted
            ? `${chalk.green('✓')} Competitor removed (${result.data.edges_removed} link${result.data.edges_removed === 1 ? '' : 's'} removed)`
            : chalk.dim('Nothing to remove.'),
      );
    });
}
