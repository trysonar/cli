import Table from 'cli-table3';
import chalk from 'chalk';
import type {
  AlertRule,
  App,
  AppChange,
  AppLookup,
  AsoScoreResult,
  CompetitorKeyword,
  CreateProductResult,
  ExtractKeywordsResult,
  KeywordResult,
  LinkedApp,
  ProductSummary,
  RankingEntry,
  Review,
  Revenue,
  ScanCompetitorResult,
  Suggestion,
  TrackedKeyword,
  TrackKeywordsResult,
} from '../types.js';

/** Format a number with commas (en-US locale) for consistent output */
function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Popularity cell. When a proxy estimate is present (Apple censored the real
 * SP to its floor of 5), append it in brackets — "5 (58)" — mirroring the
 * dashboard. The server only sets popularity_proxy when it disambiguates a
 * floored value, so a non-null proxy always means the bracket is meaningful.
 */
function fmtPopularity(popularity: number | null, proxy?: number | null): string {
  if (popularity == null) return chalk.dim('-');
  if (proxy != null) return `${popularity} ${chalk.dim(`(${proxy})`)}`;
  return String(popularity);
}

export function formatAppsTable(apps: App[]): string {
  if (apps.length === 0) {
    return chalk.dim('No apps found.');
  }

  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('Name'),
      chalk.bold('Store'),
      chalk.bold('Developer'),
      chalk.bold('Rating'),
      chalk.bold('Reviews'),
      chalk.bold('Own'),
    ],
    style: { head: [] },
  });

  for (const app of apps) {
    const snap = app.latest_snapshot;
    table.push([
      chalk.dim(app.id.slice(0, 8)),
      app.name,
      app.store === 'ios' ? chalk.cyan('iOS') : chalk.green('Android'),
      app.developer || chalk.dim('-'),
      snap?.rating != null ? snap.rating.toFixed(1) : chalk.dim('-'),
      snap?.review_count != null ? snap.review_count.toLocaleString('en-US') : chalk.dim('-'),
      app.is_own ? chalk.green('Yes') : chalk.dim('No'),
    ]);
  }

  return table.toString();
}

export function formatAppDetail(app: App): string {
  const snap = app.latest_snapshot;
  const lines = [
    `${chalk.bold(app.name)}`,
    '',
    `  ${chalk.dim('ID:')}          ${app.id}`,
    `  ${chalk.dim('Store:')}       ${app.store === 'ios' ? 'iOS App Store' : 'Google Play'}`,
    `  ${chalk.dim('Store ID:')}    ${app.store_id}`,
    `  ${chalk.dim('Developer:')}   ${app.developer || '-'}`,
    `  ${chalk.dim('Category:')}    ${app.category || '-'}`,
    `  ${chalk.dim('Own app:')}     ${app.is_own ? 'Yes' : 'No'}`,
    `  ${chalk.dim('Added:')}       ${app.added_at ? new Date(app.added_at).toLocaleDateString() : '-'}`,
  ];

  if (snap) {
    lines.push('');
    lines.push(`  ${chalk.bold('Latest Snapshot')} ${chalk.dim(`(${snap.measured_at})`)}`);
    if (snap.rating != null) lines.push(`  ${chalk.dim('Rating:')}      ${snap.rating.toFixed(1)}`);
    if (snap.review_count != null) lines.push(`  ${chalk.dim('Reviews:')}     ${snap.review_count.toLocaleString('en-US')}`);
    if (snap.version != null) lines.push(`  ${chalk.dim('Version:')}     ${snap.version}`);
    if (snap.installs != null) lines.push(`  ${chalk.dim('Installs:')}    ${snap.installs.toLocaleString('en-US')}`);
  }

  return lines.join('\n');
}

export function formatKeywordsTable(keywords: (KeywordResult | TrackedKeyword)[]): string {
  if (keywords.length === 0) {
    return chalk.dim('No keywords found.');
  }

  const table = new Table({
    head: [
      chalk.bold('Keyword'),
      chalk.bold('Store'),
      chalk.bold('Country'),
      chalk.bold('Difficulty'),
      chalk.bold('Popularity'),
      chalk.bold('Results'),
    ],
    style: { head: [] },
  });

  for (const kw of keywords) {
    const starred = 'starred_at' in kw && kw.starred_at != null;
    table.push([
      starred ? `${chalk.yellow('★')} ${kw.keyword}` : kw.keyword,
      kw.store === 'ios' ? chalk.cyan('iOS') : chalk.green('Android'),
      kw.country,
      colorDifficulty(kw.difficulty),
      fmtPopularity(kw.popularity, kw.popularity_proxy),
      kw.results_count != null ? kw.results_count.toLocaleString('en-US') : chalk.dim('-'),
    ]);
  }

  return table.toString();
}

export function formatRankingsTable(rankings: RankingEntry[]): string {
  if (rankings.length === 0) {
    return chalk.dim('No ranking data found.');
  }

  const table = new Table({
    head: [
      chalk.bold('Keyword'),
      chalk.bold('Current Rank'),
      chalk.bold('Best Rank'),
      chalk.bold('Worst Rank'),
      chalk.bold('Data Points'),
    ],
    style: { head: [] },
  });

  for (const entry of rankings) {
    const ranks = entry.history.map((h) => h.rank);
    const current = ranks.length > 0 ? ranks[ranks.length - 1] : null;
    const best = ranks.length > 0 ? Math.min(...ranks) : null;
    const worst = ranks.length > 0 ? Math.max(...ranks) : null;

    table.push([
      entry.keyword,
      current != null ? colorRank(current) : chalk.dim('-'),
      best != null ? chalk.green(String(best)) : chalk.dim('-'),
      worst != null ? String(worst) : chalk.dim('-'),
      String(ranks.length),
    ]);
  }

  return table.toString();
}

export function formatSuggestionsTable(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) {
    return chalk.dim('No suggestions found.');
  }

  const table = new Table({
    head: [
      chalk.bold('Term'),
      chalk.bold('Priority'),
    ],
    style: { head: [] },
  });

  for (const s of suggestions) {
    table.push([
      s.term,
      colorPriority(s.priority),
    ]);
  }

  return table.toString();
}

export function formatCompetitorKeywordsTable(keywords: CompetitorKeyword[]): string {
  if (keywords.length === 0) {
    return chalk.dim('No competitor keywords found.');
  }

  const table = new Table({
    head: [
      chalk.bold('Keyword'),
      chalk.bold('Store'),
      chalk.bold('Competitor Rank'),
      chalk.bold('Own Rank'),
      chalk.bold('Gap'),
      chalk.bold('Difficulty'),
      chalk.bold('Popularity'),
    ],
    style: { head: [] },
  });

  for (const kw of keywords) {
    table.push([
      kw.keyword || chalk.dim('-'),
      kw.store === 'ios' ? chalk.cyan('iOS') : kw.store === 'android' ? chalk.green('Android') : chalk.dim('-'),
      colorRank(kw.competitor_rank),
      kw.own_rank != null ? colorRank(kw.own_rank) : chalk.dim('Not ranked'),
      kw.gap || chalk.dim('-'),
      kw.difficulty != null ? colorDifficulty(kw.difficulty) : chalk.dim('-'),
      fmtPopularity(kw.popularity, kw.popularity_proxy),
    ]);
  }

  return table.toString();
}


function formatConfidence(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return chalk.green('high');
    case 'medium':
      return chalk.yellow('medium');
    default:
      return chalk.red('low');
  }
}

export function formatRevenue(r: Revenue): string {
  const lines = [
    `${chalk.bold(r.app.name)}`,
    '',
    `  ${chalk.dim('Store:')}        ${r.app.store === 'ios' ? 'iOS App Store' : 'Google Play'}`,
    `  ${chalk.dim('Store ID:')}     ${r.app.store_id}`,
    '',
    `  ${chalk.bold('Monthly revenue')}  ${chalk.green(r.revenue.monthly_formatted)} ${chalk.dim(`(~$${fmt(Math.round(r.revenue.monthly))})`)}`,
    `  ${chalk.dim('Model:')}        ${r.revenue.model}`,
    `  ${chalk.dim('Confidence:')}   ${formatConfidence(r.revenue.confidence)}`,
    '',
    `  ${chalk.dim(r.revenue.methodology)}`,
    ...(r.revenue.confidence_factors?.length
      ? ['', ...r.revenue.confidence_factors.map((f) => `  ${chalk.dim(`- ${f}`)}`)]
      : []),
  ];

  return lines.join('\n');
}

export function formatAppLookup(app: AppLookup): string {
  const lines = [
    `${chalk.bold(app.name)}`,
    '',
    `  ${chalk.dim('Store:')}       ${app.store === 'ios' ? 'iOS App Store' : 'Google Play'}`,
    `  ${chalk.dim('Store ID:')}    ${app.storeId}`,
    `  ${chalk.dim('Developer:')}   ${app.developer || '-'}`,
    `  ${chalk.dim('Category:')}    ${app.category || '-'}`,
  ];
  if (app.rating != null) lines.push(`  ${chalk.dim('Rating:')}      ${app.rating.toFixed(1)}`);
  if (app.reviews != null) lines.push(`  ${chalk.dim('Reviews:')}     ${fmt(app.reviews)}`);
  if (app.installs != null) lines.push(`  ${chalk.dim('Installs:')}    ${fmt(app.installs)}`);
  if (app.price != null) lines.push(`  ${chalk.dim('Price:')}       ${app.price === 0 ? 'Free' : `$${app.price}`}`);
  return lines.join('\n');
}

export function formatAppSearchTable(apps: AppLookup[]): string {
  if (apps.length === 0) {
    return chalk.dim('No apps found.');
  }

  const table = new Table({
    head: [
      chalk.bold('#'),
      chalk.bold('Name'),
      chalk.bold('Store ID'),
      chalk.bold('Developer'),
      chalk.bold('Rating'),
      chalk.bold('Reviews'),
    ],
    style: { head: [] },
  });

  apps.forEach((app, i) => {
    table.push([
      String(i + 1),
      app.name,
      app.storeId,
      app.developer || chalk.dim('-'),
      app.rating != null ? app.rating.toFixed(1) : chalk.dim('-'),
      app.reviews != null ? fmt(app.reviews) : chalk.dim('-'),
    ]);
  });

  return table.toString();
}

export function formatAsoScore(result: AsoScoreResult): string {
  const lines = [
    `${chalk.bold(result.app.name)}  ${chalk.dim('ASO score')} ${colorScore(result.score)}${chalk.dim('/100')}`,
    '',
  ];

  const table = new Table({
    head: [chalk.bold('Check'), chalk.bold('Score'), chalk.bold('Weight'), chalk.bold('Detail')],
    style: { head: [] },
    colWidths: [28, 8, 8, 50],
    wordWrap: true,
  });
  for (const check of result.checks) {
    table.push([
      check.label,
      colorScore(check.score),
      String(check.weight),
      check.detail || chalk.dim('-'),
    ]);
  }
  lines.push(table.toString());

  return lines.join('\n');
}

export function formatExtractedKeywords(result: ExtractKeywordsResult): string {
  if (result.keywords.length === 0) {
    return chalk.dim('No keywords extracted.');
  }

  const table = new Table({
    head: [chalk.bold('Keyword'), chalk.bold('Score')],
    style: { head: [] },
  });
  for (const kw of result.keywords) {
    table.push([kw.term, String(kw.score)]);
  }

  return `${chalk.bold(result.app.name)}\n${table.toString()}`;
}

export function formatReviewsTable(reviews: Review[]): string {
  if (reviews.length === 0) {
    return chalk.dim('No reviews found.');
  }

  const table = new Table({
    head: [
      chalk.bold('Rating'),
      chalk.bold('Date'),
      chalk.bold('Version'),
      chalk.bold('Title'),
      chalk.bold('Review'),
    ],
    style: { head: [] },
    colWidths: [8, 12, 10, 24, 60],
    wordWrap: true,
  });

  for (const r of reviews) {
    table.push([
      colorRating(r.score),
      r.date ? r.date.slice(0, 10) : chalk.dim('-'),
      r.version || chalk.dim('-'),
      r.title || chalk.dim('-'),
      r.body,
    ]);
  }

  return table.toString();
}

export function formatChangesTable(changes: AppChange[]): string {
  if (changes.length === 0) {
    return chalk.dim('No changes detected.');
  }

  const table = new Table({
    head: [chalk.bold('Detected'), chalk.bold('Type'), chalk.bold('Data')],
    style: { head: [] },
    colWidths: [22, 14, 70],
    wordWrap: true,
  });

  for (const c of changes) {
    table.push([
      new Date(c.detected_at).toLocaleString(),
      colorChangeType(c.change_type),
      c.data != null ? JSON.stringify(c.data) : chalk.dim('-'),
    ]);
  }

  return table.toString();
}

function formatLinkedApp(app: LinkedApp, indent = '  '): string {
  return [
    `${indent}${chalk.bold(app.name)} ${app.store === 'ios' ? chalk.cyan('iOS') : chalk.green('Android')}`,
    `${indent}${chalk.dim('App ID:')}    ${app.id}`,
    `${indent}${chalk.dim('Store ID:')}  ${app.store_id}`,
  ].join('\n');
}

export function formatProductCreated(product: CreateProductResult): string {
  const lines = [
    `${chalk.green('✓')} Product created: ${chalk.bold(product.name)}`,
    `  ${chalk.dim('Product ID:')} ${product.id}`,
    `  ${chalk.dim('Country:')}    ${product.country}`,
  ];
  for (const app of product.apps) {
    lines.push('');
    lines.push(formatLinkedApp(app));
  }
  return lines.join('\n');
}

export function formatAppLinked(label: string, productId: string, app: LinkedApp): string {
  return [
    `${chalk.green('✓')} ${label} ${chalk.dim(`(product ${productId})`)}`,
    formatLinkedApp(app),
  ].join('\n');
}

export function formatTrackKeywordsResult(result: TrackKeywordsResult): string {
  const lines = [
    `${chalk.green('✓')} ${result.added} added, ${result.already_tracked} already tracked, ${result.failed.length} failed`,
  ];

  if (result.results.length > 0) {
    const table = new Table({
      head: [chalk.bold('Keyword'), chalk.bold('Status'), chalk.bold('Tracked Keyword ID')],
      style: { head: [] },
    });
    for (const r of result.results) {
      table.push([
        r.term,
        r.status === 'created'
          ? chalk.green(r.status)
          : r.status === 'failed'
            ? chalk.red(`${r.status}${r.error ? `: ${r.error}` : ''}`)
            : chalk.dim(r.status),
        r.trackedKeywordId || chalk.dim('-'),
      ]);
    }
    lines.push(table.toString());
  }

  return lines.join('\n');
}

export function formatProductsTable(products: ProductSummary[]): string {
  if (products.length === 0) {
    return chalk.dim('No products found.');
  }

  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('Name'),
      chalk.bold('Country'),
      chalk.bold('# Apps'),
      chalk.bold('# Competitors'),
    ],
    style: { head: [] },
  });

  for (const p of products) {
    table.push([
      chalk.dim(p.id.slice(0, 8)),
      p.name,
      p.country,
      String(p.apps.length),
      String(p.competitor_count),
    ]);
  }

  return table.toString();
}

export function formatAlertsTable(rules: AlertRule[]): string {
  if (rules.length === 0) {
    return chalk.dim('No alert rules configured.');
  }

  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('Type'),
      chalk.bold('Scope'),
      chalk.bold('Threshold'),
      chalk.bold('Enabled'),
    ],
    style: { head: [] },
  });

  for (const r of rules) {
    table.push([
      chalk.dim(r.id.slice(0, 8)),
      r.type,
      r.scope_app_id ? chalk.dim(r.scope_app_id.slice(0, 8)) : chalk.cyan('all'),
      r.effective_threshold != null ? String(r.effective_threshold) : chalk.dim('-'),
      r.enabled ? chalk.green('Yes') : chalk.dim('No'),
    ]);
  }

  return table.toString();
}

export function formatScanResult(result: ScanCompetitorResult): string {
  return [
    `${chalk.green('✓')} Competitor scan complete`,
    `  ${chalk.dim('Keywords discovered:')} ${result.discovered}`,
    `  ${chalk.dim('Ranks recorded:')}      ${result.ranked}`,
    '',
    chalk.dim(`View results: sonar competitors keywords ${result.competitor_app_id} --app ${result.own_app_id}`),
  ].join('\n');
}

function colorScore(s: number): string {
  if (s >= 70) return chalk.green(String(s));
  if (s >= 40) return chalk.yellow(String(s));
  return chalk.red(String(s));
}

function colorRating(r: number): string {
  const stars = `${r}★`;
  if (r >= 4) return chalk.green(stars);
  if (r >= 3) return chalk.yellow(stars);
  return chalk.red(stars);
}

function colorChangeType(t: string): string {
  switch (t) {
    case 'release':
      return chalk.cyan(t);
    case 'price':
      return chalk.yellow(t);
    default:
      return t;
  }
}

function colorDifficulty(d: number | null): string {
  if (d == null) return chalk.dim('-');
  if (d <= 30) return chalk.green(String(d));
  if (d <= 60) return chalk.yellow(String(d));
  return chalk.red(String(d));
}

function colorRank(r: number): string {
  if (r <= 10) return chalk.green(String(r));
  if (r <= 50) return chalk.yellow(String(r));
  return chalk.dim(String(r));
}

function colorPriority(p: number): string {
  if (p >= 7000) return chalk.green(String(p));
  if (p >= 3000) return chalk.yellow(String(p));
  return chalk.dim(String(p));
}
