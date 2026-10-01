import Table from 'cli-table3';
import chalk from 'chalk';
import type {
  AlertEvent,
  AlertRule,
  App,
  AppChange,
  AppOverviewMover,
  AppOverviewResult,
  AppEngagementResult,
  AppSalesResult,
  AscMetricsBase,
  DiscoveredKeywordsResult,
  PortfolioResult,
  ReviewInsightResult,
  ReviewInsightTheme,
  AppLookup,
  AsoScoreResult,
  CompetitorInsightPayload,
  CompetitorKeyword,
  CompetitorLandscapeResult,
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
  TopChart,
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

/** One-line reason for a keyword the API couldn't serve, with the retry hint. */
export function formatKeywordError(error: {
  code: string;
  message: string;
  retry_after_seconds?: number;
}): string {
  const label =
    error.code === 'rate_limited'
      ? 'rate limited'
      : error.code === 'unavailable'
        ? 'store unavailable'
        : error.code === 'pending'
          ? 'queued on the scrape fleet — request again'
          : error.message;
  const retry = error.retry_after_seconds
    ? ` — retry in ${error.retry_after_seconds}s`
    : '';
  return `${label}${retry} (not charged)`;
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
    // A term the API couldn't serve carries an `error` instead of metrics.
    // Rendering its zeros as data would read as "difficulty 0, easiest" — the
    // exact opposite of the truth — so say what happened instead.
    const failed = 'error' in kw ? kw.error : undefined;
    if (failed) {
      table.push([
        kw.keyword,
        kw.store === 'ios' ? chalk.cyan('iOS') : chalk.green('Android'),
        kw.country,
        {
          colSpan: 3,
          content: chalk.yellow(formatKeywordError(failed)),
        },
      ]);
      continue;
    }
    const starred = 'starred_at' in kw && kw.starred_at != null;
    const beatable =
      'difficulty_breakdown' in kw && kw.difficulty_breakdown?.beatable
        ? ` ${chalk.green('beatable')}`
        : '';
    // A stored row served past its warm window (or because the store was
    // unreachable) is real data, just older — say so rather than hide it.
    const stale = 'stale' in kw && kw.stale === true ? ` ${chalk.dim('(stale)')}` : '';
    table.push([
      (starred ? `${chalk.yellow('★')} ${kw.keyword}` : kw.keyword) + stale,
      kw.store === 'ios' ? chalk.cyan('iOS') : chalk.green('Android'),
      kw.country,
      colorDifficulty(kw.difficulty) + beatable,
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
    const latest = [...(entry.observations ?? [])].sort((a, b) => b.measured_at.localeCompare(a.measured_at))[0];
    const lastRank = [...entry.history].sort((a, b) => b.measured_at.localeCompare(a.measured_at))[0];
    const current = latest ? latest.rank : (lastRank?.rank ?? null);
    const best = ranks.length > 0 ? Math.min(...ranks) : null;
    const worst = ranks.length > 0 ? Math.max(...ranks) : null;

    table.push([
      entry.keyword,
      current != null ? colorRank(current) : chalk.dim(latest?.status === 'not_found' ? 'Not found' : latest?.status === 'not_observed' ? 'No observation' : '-'),
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
      (r.scope_app_id ? chalk.dim(r.scope_app_id.slice(0, 8)) : chalk.cyan('all')) +
        (r.countries?.length ? chalk.dim(` (${r.countries.join(',')})`) : ''),
      r.effective_threshold != null ? String(r.effective_threshold) : chalk.dim('-'),
      r.enabled ? chalk.green('Yes') : chalk.dim('No'),
    ]);
  }

  return table.toString();
}

export function formatScanResult(result: ScanCompetitorResult): string {
  return [
    `${chalk.green('✓')} Competitor scan started`,
    `  ${chalk.dim('Terms generated:')}  ${result.generated}`,
    `  ${chalk.dim('Queued to verify:')} ${result.queued}`,
    `  ${chalk.dim('Verified so far:')}  ${result.verified_now}`,
    '',
    chalk.dim('Remaining candidates verify in the background over the next hours.'),
    chalk.dim(`View results: sonar competitors keywords ${result.competitor_app_id} --app ${result.own_app_id}`),
  ].join('\n');
}

function formatInsightBody(insight: CompetitorInsightPayload): string {
  const lines: string[] = [];
  lines.push(
    `${chalk.bold('AI insight')} ${chalk.dim(`(${insight.posture}, generated ${insight.generated_at.slice(0, 10)})`)}`
  );
  lines.push(insight.overview);
  if (insight.changes_since_last) {
    lines.push(`${chalk.dim('Since last analysis:')} ${insight.changes_since_last}`);
  }
  for (const cluster of insight.opportunities) {
    lines.push('');
    lines.push(
      `${chalk.green('◆')} ${chalk.bold(cluster.title)} ${chalk.dim(`[${cluster.priority} priority, ${cluster.keywords.length} keywords]`)}`
    );
    if (cluster.detail) lines.push(`  ${cluster.detail}`);
    const table = new Table({
      head: [
        chalk.bold('Keyword'),
        chalk.bold('Best competitor'),
        chalk.bold('Theirs'),
        chalk.bold('Yours'),
        chalk.bold('Pop'),
        chalk.bold('Diff'),
        chalk.bold('Opp'),
      ],
      style: { head: [] },
    });
    for (const k of cluster.keywords) {
      table.push([
        k.keyword,
        k.best_competitor?.name ?? chalk.dim('-'),
        k.best_competitor ? `#${k.best_competitor.rank}` : chalk.dim('-'),
        k.own_rank != null ? `#${k.own_rank}` : chalk.dim('-'),
        fmtPopularity(k.popularity, k.popularity_proxy),
        colorDifficulty(k.difficulty),
        k.opportunity != null ? String(k.opportunity) : chalk.dim('-'),
      ]);
    }
    lines.push(table.toString());
  }
  for (const threat of insight.threats) {
    lines.push('');
    lines.push(`${chalk.red('▲')} ${chalk.bold(threat.headline)}`);
    if (threat.detail) lines.push(`  ${chalk.dim(threat.detail)}`);
  }
  if (insight.strengths.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Where you lead:'));
    for (const s of insight.strengths) lines.push(`  ${chalk.green('✓')} ${s}`);
  }
  return lines.join('\n');
}

export function formatLandscape(result: CompetitorLandscapeResult): string {
  const { stats } = result;
  const lines: string[] = [];
  lines.push(
    [
      `${chalk.bold(String(stats.gaps))} keyword gaps`,
      `${chalk.green(String(stats.winnable))} winnable`,
      `${stats.threats > 0 ? chalk.red(String(stats.threats)) : '0'} threats`,
      `${chalk.bold(String(stats.leads))} you lead`,
      chalk.dim(`(${stats.competitors} competitors, ${stats.keywords_compared} keywords compared)`),
    ].join('  ·  ')
  );

  if (result.gaps.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Top gaps (they rank, you don\'t):'));
    const table = new Table({
      head: [
        chalk.bold('Keyword'),
        chalk.bold('Best competitor'),
        chalk.bold('Theirs'),
        chalk.bold('Pop'),
        chalk.bold('Diff'),
        chalk.bold('Opp'),
      ],
      style: { head: [] },
    });
    for (const k of result.gaps.slice(0, 15)) {
      table.push([
        k.keyword,
        k.best_competitor?.name ?? chalk.dim('-'),
        k.best_competitor ? `#${k.best_competitor.rank}` : chalk.dim('-'),
        fmtPopularity(k.popularity, k.popularity_proxy),
        colorDifficulty(k.difficulty),
        k.opportunity != null ? String(k.opportunity) : chalk.dim('-'),
      ]);
    }
    lines.push(table.toString());
  }

  for (const t of result.threats) {
    lines.push(
      `${chalk.red('▲')} ${t.competitor_name} on "${t.keyword}": ${t.from_rank != null ? `#${t.from_rank} → #${t.to_rank}` : `new at #${t.to_rank}`}${t.own_rank != null ? chalk.dim(` (you: #${t.own_rank})`) : ''}`
    );
  }

  if (result.insight) {
    lines.push('');
    lines.push(formatInsightBody(result.insight));
  } else {
    lines.push('');
    lines.push(
      chalk.dim(
        'No AI insight yet — run `sonar competitors analyze <app-id>` to generate one.'
      )
    );
  }
  return lines.join('\n');
}

export function formatAnalyzeResult(insight: CompetitorInsightPayload): string {
  return `${chalk.green('✓')} Competitive analysis generated\n\n${formatInsightBody(insight)}`;
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

/**
 * Top chart list. The header line reports the whole chart (summary is
 * unaffected by --limit) so a truncated table still shows real totals.
 */
export function formatTopChartTable(chart: TopChart): string {
  const lines: string[] = [];
  const label = `${chart.store === 'ios' ? 'iOS' : 'Android'} · top ${chart.chart} · ${chart.category} · ${chart.country.toUpperCase()}`;
  lines.push(chalk.bold(label));

  const movement = chart.previousMeasuredAt
    ? `movement vs ${chart.previousMeasuredAt}`
    : chalk.dim('no previous snapshot yet');
  lines.push(chalk.dim(`${chart.measuredAt} · ${movement}${chart.stale ? ' · stale' : ''}`));
  lines.push(
    chalk.dim(
      `${fmt(chart.summary.total)} apps · ${fmt(chart.summary.newToday)} new today · ${fmt(chart.summary.dropped)} dropped out`,
    ),
  );

  if (chart.entries.length === 0) {
    lines.push(chalk.dim('No chart entries found.'));
    return lines.join('\n');
  }

  const table = new Table({
    head: [
      chalk.bold('#'),
      chalk.bold('Δ'),
      chalk.bold('App'),
      chalk.bold('Developer'),
      chalk.bold('Rating'),
    ],
    style: { head: [] },
  });

  for (const entry of chart.entries) {
    table.push([
      colorRank(entry.rank),
      formatChartDelta(entry.delta, entry.isNew),
      entry.name,
      entry.developer ?? chalk.dim('-'),
      entry.rating != null ? entry.rating.toFixed(1) : chalk.dim('-'),
    ]);
  }

  lines.push(table.toString());
  return lines.join('\n');
}

/** ▲n / ▼n / = , or NEW for an app that wasn't in the previous snapshot. */
function formatChartDelta(delta: number | null, isNew: boolean): string {
  if (isNew) return chalk.green('NEW');
  if (delta == null) return chalk.dim('-');
  if (delta > 0) return chalk.green(`\u25B2${delta}`);
  if (delta < 0) return chalk.red(`\u25BC${Math.abs(delta)}`);
  return chalk.dim('=');
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

export function formatDiscoveredKeywordsTable(result: DiscoveredKeywordsResult): string {
  if (result.keywords.length === 0) {
    return chalk.dim('No discovered keywords. Discovery runs after tracking an app — check back later.');
  }

  const table = new Table({
    head: [
      chalk.bold('Keyword'),
      chalk.bold('Market'),
      chalk.bold('Bucket'),
      chalk.bold('Source'),
      chalk.bold('Rank'),
      chalk.bold('Popularity'),
      chalk.bold('Difficulty'),
      chalk.bold('Relevance'),
      chalk.bold('Opportunity'),
    ],
    style: { head: [] },
  });

  for (const kw of result.keywords) {
    table.push([
      kw.keyword,
      `${kw.store === 'ios' ? chalk.cyan('iOS') : chalk.green('Android')} ${kw.country}`,
      kw.bucket === 'ranked'
        ? chalk.green('ranked')
        : kw.bucket === 'gap'
          ? chalk.yellow('gap')
          : kw.bucket === 'idea'
            ? chalk.dim('idea')
            : chalk.dim('-'),
      kw.source,
      kw.rank != null ? colorRank(kw.rank) : chalk.dim('-'),
      fmtPopularity(kw.popularity, kw.popularity_proxy),
      colorDifficulty(kw.difficulty),
      kw.ai_relevance != null ? String(kw.ai_relevance) : chalk.dim('-'),
      kw.opportunity != null ? chalk.bold(String(kw.opportunity)) : chalk.dim('-'),
    ]);
  }

  const shown = result.keywords.length;
  const suffix =
    result.total > shown ? chalk.dim(`\nShowing ${shown} of ${result.total} (raise --limit for more).`) : '';
  return table.toString() + suffix;
}

export function formatAlertEventsTable(events: AlertEvent[]): string {
  if (events.length === 0) {
    return chalk.dim('No alert events yet. Enable rules with `sonar alerts set` — detection runs daily.');
  }

  const table = new Table({
    head: [chalk.bold('When'), chalk.bold('Type'), chalk.bold('Details')],
    style: { head: [] },
    colWidths: [12, 20, 60],
    wordWrap: true,
  });

  for (const e of events) {
    const p = e.payload as Record<string, unknown>;
    const bits: string[] = [];
    for (const key of ['app_name', 'appName', 'keyword', 'country']) {
      const v = p[key];
      if (typeof v === 'string' && v) bits.push(v);
    }
    const from = p['from'] ?? p['old_rank'] ?? p['oldRank'];
    const to = p['to'] ?? p['new_rank'] ?? p['newRank'];
    if (e.type === 'top_chart') {
      const where = p['category'] && p['category'] !== 'overall' ? ` · ${p['categoryLabel'] ?? p['category']}` : '';
      bits.push(`${p['direction']} top ${p['cutoff'] ?? 200} ${p['chart']}${where}`);
      bits.push(`${from != null ? `#${from}` : 'out'} -> ${to != null ? `#${to}` : 'out'}`);
    } else if (from != null && to != null) bits.push(`${from} -> ${to}`);
    table.push([
      e.measured_at,
      e.type,
      bits.length > 0 ? bits.join(' | ') : chalk.dim(JSON.stringify(p).slice(0, 56)),
    ]);
  }

  return table.toString();
}

export function formatReviewInsight(result: ReviewInsightResult): string {
  const cooldown = result.cooldown.in_cooldown
    ? chalk.dim(`\nNext analysis available ${result.cooldown.next_available_at ?? 'later'}.`)
    : '';

  const insight = result.insight;
  if (!insight) {
    return (
      chalk.dim(`No review insight generated yet for ${result.country}. Run \`sonar apps analyze-reviews\`.`) +
      cooldown
    );
  }

  const lines: string[] = [];
  lines.push(
    `${chalk.bold('Review insight')} ${chalk.dim(
      `(${result.country}, ${insight.reviews_analyzed} reviews, avg ${insight.avg_score?.toFixed(1) ?? '-'}, generated ${insight.generated_at.slice(0, 10)})`
    )}`
  );
  lines.push('');
  lines.push(`${chalk.bold('Sentiment:')} ${insight.sentiment}`);
  lines.push(insight.overview);

  const theme = (t: ReviewInsightTheme) =>
    `  - ${chalk.bold(t.theme)} ${chalk.dim(`(${t.frequency}, ${t.trend})`)} — ${t.detail}`;

  if (insight.praises.length > 0) {
    lines.push('');
    lines.push(chalk.green.bold('What people like'));
    for (const t of insight.praises) lines.push(theme(t));
  }
  if (insight.complaints.length > 0) {
    lines.push('');
    lines.push(chalk.red.bold('What people complain about'));
    for (const t of insight.complaints) lines.push(theme(t));
  }
  if (insight.feature_requests.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Feature requests: ') + insight.feature_requests.join(', '));
  }
  if (insight.changes_since_last) {
    lines.push('');
    lines.push(chalk.bold('Since last analysis: ') + insight.changes_since_last);
  }

  return lines.join('\n') + cooldown;
}

export function formatAppOverview(o: AppOverviewResult): string {
  const delta = (n: number | null, suffix = '') =>
    n == null ? '' : n > 0 ? chalk.green(` (+${n}${suffix})`) : n < 0 ? chalk.red(` (${n}${suffix})`) : chalk.dim(' (±0)');

  const lines: string[] = [];
  lines.push(
    `${chalk.bold(o.app_name)} ${chalk.dim(`(${o.store === 'ios' ? 'App Store' : 'Google Play'}, last ${o.days}d)`)}`
  );
  lines.push('');
  lines.push(`${chalk.bold('Visibility:')} ${o.visibility.score}${delta(o.visibility.delta_7d, ' 7d')}`);
  if (o.visibility.share_of_voice != null) {
    lines.push(
      `${chalk.bold('Share of voice:')} ${(o.visibility.share_of_voice * 100).toFixed(1)}%` +
        (o.visibility.branded_excluded > 0
          ? chalk.dim(` (${o.visibility.branded_excluded} brand terms excluded)`)
          : '')
    );
  }
  lines.push(
    `${chalk.bold('Keywords:')} ${o.keywords.tracked} tracked, ${o.keywords.ranked} ranked${delta(o.keywords.ranked_delta_7d, ' 7d')}, ${o.keywords.top_10} in top 10`
  );
  if (o.keywords.best_rank) {
    lines.push(`${chalk.bold('Best rank:')} #${o.keywords.best_rank.rank} ${chalk.dim(`(${o.keywords.best_rank.keyword})`)}`);
  }
  lines.push(`${chalk.bold('Competitors tracked:')} ${o.competitors}`);
  lines.push(
    `${chalk.bold('7d movement:')} ${chalk.green(`${o.movement.improved_7d} up`)} / ${chalk.red(`${o.movement.dropped_7d} down`)}`
  );

  const moverLine = (m: AppOverviewMover) =>
    `  ${m.keyword} ${chalk.dim(m.country)} #${m.rank ?? '-'} ${
      m.change_7d != null && m.change_7d > 0 ? chalk.green(`+${m.change_7d}`) : chalk.red(String(m.change_7d))
    }`;
  if (o.movement.top_improvements.length > 0) {
    lines.push('');
    lines.push(chalk.green.bold('Top improvements (7d)'));
    for (const m of o.movement.top_improvements) lines.push(moverLine(m));
  }
  if (o.movement.top_drops.length > 0) {
    lines.push('');
    lines.push(chalk.red.bold('Biggest drops (7d)'));
    for (const m of o.movement.top_drops) lines.push(moverLine(m));
  }

  if (o.opportunities.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Opportunities'));
    for (const op of o.opportunities) {
      lines.push(
        `  ${op.keyword} ${chalk.dim(op.country)} — ${op.kind.replace(/_/g, ' ')}` +
          chalk.dim(` (rank ${op.rank ?? '-'}, pop ${op.popularity ?? '-'}, diff ${op.difficulty ?? '-'})`)
      );
    }
  }

  return lines.join('\n');
}

export function formatPortfolio(p: PortfolioResult): string {
  const k = p.kpis;
  const delta = (n: number | null) =>
    n == null ? '' : n > 0 ? chalk.green(` (+${n} 7d)`) : n < 0 ? chalk.red(` (${n} 7d)`) : chalk.dim(' (±0 7d)');

  const lines: string[] = [];
  lines.push(
    `${chalk.bold('Portfolio')} ${chalk.dim(
      `— ${k.apps} apps, ${fmt(k.keywords_tracked)} keywords tracked, ${fmt(k.keywords_ranked)} ranked, ${k.top_10} top-10`
    )}`
  );
  lines.push(
    `${chalk.bold('Visibility:')} ${k.visibility}${delta(k.visibility_delta_7d)}   ` +
      `${chalk.bold('Movement:')} ${chalk.green(`${k.up_7d} up`)} / ${chalk.red(`${k.down_7d} down`)}   ` +
      `${chalk.bold('Avg rating:')} ${k.avg_rating?.toFixed(2) ?? chalk.dim('-')}   ` +
      `${chalk.bold('Alerts (7d):')} ${k.alerts_this_week}`
  );
  lines.push('');

  const table = new Table({
    head: [
      chalk.bold('App'),
      chalk.bold('Store'),
      chalk.bold('Visibility'),
      chalk.bold('Δ7d'),
      chalk.bold('Tracked'),
      chalk.bold('Ranked'),
      chalk.bold('Top 10'),
      chalk.bold('Best'),
      chalk.bold('↑/↓ 7d'),
      chalk.bold('Rating'),
    ],
    style: { head: [] },
  });
  for (const a of p.apps) {
    table.push([
      a.app_name,
      a.store === 'ios' ? chalk.cyan('iOS') : chalk.green('Android'),
      String(a.visibility),
      a.visibility_delta_7d == null
        ? chalk.dim('-')
        : a.visibility_delta_7d > 0
          ? chalk.green(`+${a.visibility_delta_7d}`)
          : a.visibility_delta_7d < 0
            ? chalk.red(String(a.visibility_delta_7d))
            : chalk.dim('0'),
      String(a.keywords_tracked),
      String(a.keywords_ranked),
      String(a.top_10),
      a.best_rank != null ? colorRank(a.best_rank) : chalk.dim('-'),
      `${chalk.green(String(a.up_7d))}/${chalk.red(String(a.down_7d))}`,
      a.rating != null ? a.rating.toFixed(1) : chalk.dim('-'),
    ]);
  }
  lines.push(table.toString());

  if (p.attention.length > 0) {
    lines.push('');
    lines.push(chalk.yellow.bold('Needs attention'));
    for (const a of p.attention) {
      const sig = a.signals
        .map((s) =>
          s.type === 'visibility_drop'
            ? `visibility ${s.from} -> ${s.to}`
            : s.type === 'rating_drop'
              ? `rating ${s.from} -> ${s.to}`
              : 'not ranked'
        )
        .join(', ');
      lines.push(`  ${a.app_name} ${chalk.dim(`— ${sig}`)}`);
    }
  }

  return lines.join('\n');
}

/** Header line + not-ready message shared by the App Store Connect commands. */
function ascHeader(r: AscMetricsBase): string[] {
  const lines = [
    `${chalk.bold(r.app_name)} ${chalk.dim(
      `(${r.store === 'ios' ? 'App Store' : 'Google Play'}, ${r.range.start} to ${r.range.end})`
    )}`,
  ];
  if (r.status === 'ready') {
    lines.push(
      chalk.dim(
        `App Store Connect app ${r.apple_app_id ?? '-'}, last synced ${
          r.last_synced_at ? r.last_synced_at.slice(0, 16).replace('T', ' ') + ' UTC' : 'never'
        }`
      )
    );
  }
  return lines;
}

function ascNotReady(r: AscMetricsBase): string {
  return [...ascHeader(r), '', chalk.yellow(r.message ?? `No data (${r.status}).`)].join('\n');
}

function fmtUsdApprox(n: number | null): string {
  if (n == null) return chalk.dim('-');
  return `≈ $${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtRate(n: number | null): string {
  return n == null ? chalk.dim('-') : `${(n * 100).toFixed(1)}%`;
}

function fmtCount(n: number | null): string {
  return n == null ? chalk.dim('-') : fmt(n);
}

export function formatAppSales(r: AppSalesResult): string {
  if (r.status !== 'ready') return ascNotReady(r);

  const lines = ascHeader(r);
  lines.push('');
  if (!r.totals || r.reported_days === 0) {
    lines.push(chalk.dim('Apple has not reported any sales days in this window yet.'));
    return lines.join('\n');
  }
  const t = r.totals;
  lines.push(
    `${chalk.bold('Downloads:')} ${fmt(t.downloads)}   ` +
      `${chalk.bold('Redownloads:')} ${fmt(t.redownloads)}   ` +
      `${chalk.bold('IAP units:')} ${fmt(t.iap_units)}   ` +
      `${chalk.bold('Proceeds:')} ${fmtUsdApprox(t.proceeds_usd_approx)}`
  );
  lines.push(chalk.dim(`${r.reported_days} of ${r.days.length} days reported. Proceeds are approximate (static FX).`));
  lines.push('');

  const daily = new Table({
    head: [
      chalk.bold('Date'),
      chalk.bold('Downloads'),
      chalk.bold('Redownloads'),
      chalk.bold('IAP units'),
      chalk.bold('Proceeds'),
    ],
    style: { head: [] },
  });
  for (const d of r.days) {
    daily.push(
      d.reported
        ? [d.date, fmtCount(d.downloads), fmtCount(d.redownloads), fmtCount(d.iap_units), fmtUsdApprox(d.proceeds_usd_approx)]
        : [chalk.dim(d.date), { colSpan: 4, content: chalk.dim('not reported yet') }]
    );
  }
  lines.push(daily.toString());

  if (r.countries.length > 0) {
    lines.push('');
    lines.push(chalk.bold(`Top countries${r.countries.length > 10 ? ` (10 of ${r.countries.length})` : ''}`));
    const countries = new Table({
      head: [
        chalk.bold('Country'),
        chalk.bold('Downloads'),
        chalk.bold('Redownloads'),
        chalk.bold('IAP units'),
        chalk.bold('Proceeds'),
      ],
      style: { head: [] },
    });
    for (const c of r.countries.slice(0, 10)) {
      countries.push([
        c.country.toUpperCase(),
        fmt(c.downloads),
        fmt(c.redownloads),
        fmt(c.iap_units),
        fmtUsdApprox(c.proceeds_usd_approx),
      ]);
    }
    lines.push(countries.toString());
  }

  return lines.join('\n');
}

export function formatAppEngagement(r: AppEngagementResult): string {
  if (r.status !== 'ready') return ascNotReady(r);

  const lines = ascHeader(r);
  lines.push('');
  if (!r.totals || r.reported_days === 0) {
    lines.push(chalk.dim('Apple has not reported any analytics days in this window yet.'));
    return lines.join('\n');
  }
  const t = r.totals;
  const rates = r.rates;
  lines.push(
    `${chalk.bold('Impressions:')} ${fmt(t.impressions)} -> ` +
      `${chalk.bold('Page views:')} ${fmt(t.product_page_views)} ${chalk.dim(`(${fmtRate(rates?.page_view_rate ?? null)})`)} -> ` +
      `${chalk.bold('Downloads:')} ${fmt(t.downloads)} ${chalk.dim(`(${fmtRate(rates?.download_rate ?? null)})`)}`
  );
  lines.push(
    `${chalk.bold('Search share:')} ${fmtRate(rates?.search_share ?? null)}   ` +
      `${chalk.bold('Installs:')} ${fmt(t.installs)}   ` +
      `${chalk.bold('Deletions:')} ${fmt(t.deletions)}   ` +
      `${chalk.bold('Sessions:')} ${fmt(t.sessions)}`
  );
  lines.push(
    chalk.dim(
      `${r.reported_days} of ${r.days.length} days reported. Impressions include product page views (App Store Connect's definition).`
    )
  );

  if (r.sources.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Impressions by source'));
    const sources = new Table({
      head: [chalk.bold('Source'), chalk.bold('Impressions'), chalk.bold('Share'), chalk.bold('Page views')],
      style: { head: [] },
    });
    for (const s of r.sources) {
      sources.push([s.source_type, fmt(s.impressions), fmtRate(s.share_of_impressions), fmt(s.product_page_views)]);
    }
    lines.push(sources.toString());
  }

  lines.push('');
  const daily = new Table({
    head: [
      chalk.bold('Date'),
      chalk.bold('Impressions'),
      chalk.bold('Page views'),
      chalk.bold('Downloads'),
      chalk.bold('Installs'),
      chalk.bold('Deletions'),
      chalk.bold('Sessions'),
    ],
    style: { head: [] },
  });
  for (const d of r.days) {
    daily.push([
      d.reported ? d.date : chalk.dim(d.date),
      fmtCount(d.impressions),
      fmtCount(d.product_page_views),
      fmtCount(d.downloads),
      fmtCount(d.installs),
      fmtCount(d.deletions),
      fmtCount(d.sessions),
    ]);
  }
  lines.push(daily.toString());

  return lines.join('\n');
}
