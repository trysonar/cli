import Table from 'cli-table3';
import chalk from 'chalk';
import type { App, KeywordResult, TrackedKeyword, RankingEntry, Suggestion, CompetitorKeyword } from '../types.js';

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
    table.push([
      kw.keyword,
      kw.store === 'ios' ? chalk.cyan('iOS') : chalk.green('Android'),
      kw.country,
      colorDifficulty(kw.difficulty),
      kw.popularity != null ? String(kw.popularity) : chalk.dim('-'),
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
      kw.popularity != null ? String(kw.popularity) : chalk.dim('-'),
    ]);
  }

  return table.toString();
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
