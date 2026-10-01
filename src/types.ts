export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

export interface App {
  id: string;
  store: string;
  store_id: string;
  name: string;
  developer: string | null;
  category: string | null;
  icon_url: string | null;
  is_own: boolean;
  added_at: string;
  latest_snapshot: {
    rating: number | null;
    review_count: number | null;
    version: string | null;
    installs: number | null;
    measured_at: string;
  } | null;
}

/**
 * Explainable ingredients behind the difficulty score. `beatable: true` means
 * a top-3 slot looks winnable (a weak app holds it, or the term is
 * under-targeted in titles).
 */
export interface DifficultyBreakdown {
  titleMatches: number;
  appsAnalyzed: number;
  /** Ratings count (iOS) / installs (Android) of the top 3 apps, rank order. */
  top3Strength: number[];
  medianStrength: number;
  weakSpotRank: number | null;
  beatable: boolean;
}

export interface KeywordResult {
  keyword: string;
  store: string;
  country: string;
  difficulty: number;
  popularity: number | null;
  /** Proxy estimate shown in brackets when Apple censors the SP to its floor (5). */
  popularity_proxy?: number | null;
  /** Est. downloads/day for the #1 app (iOS only, rough order of magnitude). */
  est_downloads_at_1?: number | null;
  difficulty_breakdown?: DifficultyBreakdown | null;
  results_count: number | null;
  /**
   * True when the API served a stored row past its 7-day warm window (up to
   * 30 days, refreshed in the background) or fell back to an older
   * measurement because the store could not be reached. Real data, billed
   * like a cache hit.
   */
  stale?: boolean;
  /**
   * Set instead of real metrics when a bulk request couldn't serve this term
   * (scraper queue shed it, or the store was unavailable). Such terms are NOT
   * charged — the API refunds their share of the reservation.
   */
  error?: {
    code: string;
    message: string;
    /** Seconds to wait before retrying this keyword (shed terms only). */
    retry_after_seconds?: number;
  };
}

export interface TrackedKeyword {
  id: string;
  keyword_id: string;
  keyword: string;
  store: string;
  country: string;
  added_at: string;
  note: string | null;
  starred_at: string | null;
  difficulty: number | null;
  popularity: number | null;
  /** Proxy estimate shown in brackets when Apple censors the SP to its floor (5). */
  popularity_proxy?: number | null;
  results_count: number | null;
}

export interface RankingEntry {
  keyword_id: string;
  keyword: string;
  history: {
    rank: number;
    measured_at: string;
  }[];
  /** Completed checks and unknown gaps; history remains positive ranks for compatibility. */
  observations?: Array<{
    measured_at: string;
    rank: number | null;
    status: "ranked" | "not_found" | "not_observed";
    results_count: number | null;
  }>;
}

export interface Suggestion {
  term: string;
  priority: number;
}

export interface CompetitorKeyword {
  keyword_id: string;
  keyword: string | null;
  store: string | null;
  country: string | null;
  competitor_rank: number;
  own_rank: number | null;
  gap: string | null;
  difficulty: number | null;
  popularity: number | null;
  /** Proxy estimate shown in brackets when Apple censors the SP to its floor (5). */
  popularity_proxy?: number | null;
}

export interface Revenue {
  app: {
    store: string;
    store_id: string;
    name: string;
    icon_url: string | null;
  };
  revenue: {
    monthly: number;
    monthly_formatted: string;
    model: string;
    methodology: string;
    confidence: 'high' | 'medium' | 'low';
    confidence_factors: string[];
  };
}

// ── Stateless endpoints ──────────────────────────────────────────────────────

export interface AppLookup {
  store: string;
  storeId: string;
  name: string;
  description: string;
  developer: string | null;
  category: string | null;
  iconUrl: string | null;
  rating?: number | null;
  reviews?: number | null;
  installs?: number | null;
  price?: number | null;
}

export interface AsoScoreResult {
  app: { store: string; store_id: string; name: string; icon_url: string | null };
  score: number;
  checks: {
    id: string;
    label: string;
    score: number;
    weight: number;
    detail?: string;
  }[];
}

export interface ExtractKeywordsResult {
  app: { store: string; store_id: string; name: string; icon_url: string | null };
  keywords: { term: string; score: number }[];
}

export interface Review {
  id: string;
  author: string | null;
  title: string | null;
  body: string;
  score: number;
  version: string | null;
  date: string;
}

// ── Org-scoped endpoints ─────────────────────────────────────────────────────

export interface AppChange {
  id: string;
  change_type: string;
  detected_at: string;
  data: unknown;
}

// ── Write endpoints ──────────────────────────────────────────────────────────

export interface LinkedApp {
  id: string;
  store: string;
  store_id: string;
  name: string;
  developer: string | null;
  category: string | null;
  icon_url: string | null;
}

export interface CreateProductResult {
  id: string;
  name: string;
  icon_url: string | null;
  country: string;
  apps: LinkedApp[];
}

export interface TrackAppResult {
  product_id: string;
  app: LinkedApp;
}

export interface TrackCompetitorResult {
  product_id: string;
  parent_app_id: string;
  competitor: LinkedApp;
}

export interface TrackKeywordsResult {
  added: number;
  already_tracked: number;
  failed: { term: string; error: string }[];
  results: {
    term: string;
    status: 'created' | 'already_tracked' | 'failed';
    trackedKeywordId?: string;
    error?: string;
  }[];
}

export interface UpdateKeywordNoteResult {
  id: string;
  keyword_id: string;
  app_id: string;
  note: string | null;
  starred_at: string | null;
}

export interface ScanCompetitorResult {
  competitor_app_id: string;
  own_app_id: string;
  /** Candidate terms generated from the competitor's listing. */
  generated: number;
  /** Candidates queued for background SERP verification. */
  queued: number;
  /** Candidates verified inline before the response returned. */
  verified_now: number;
}

export interface LandscapeKeyword {
  keyword_id: string;
  keyword: string;
  country: string;
  own_rank: number | null;
  best_competitor: { app_id?: string; name: string; rank: number } | null;
  popularity: number | null;
  popularity_proxy?: number | null;
  difficulty: number | null;
  opportunity: number | null;
  tracked?: boolean;
}

export interface CompetitorInsightPayload {
  generated_at: string;
  keywords_compared: number;
  competitors_analyzed: number;
  gaps_found: number;
  model: string | null;
  posture: 'leader' | 'challenger' | 'niche' | 'behind';
  overview: string;
  opportunities: {
    title: string;
    detail: string;
    priority: 'high' | 'medium' | 'low';
    keywords: LandscapeKeyword[];
  }[];
  threats: { competitor_name: string; headline: string; detail: string }[];
  strengths: string[];
  changes_since_last: string | null;
}

export interface CompetitorLandscapeResult {
  app_id: string;
  stats: {
    competitors: number;
    keywords_compared: number;
    gaps: number;
    winnable: number;
    threats: number;
    leads: number;
  };
  gaps: LandscapeKeyword[];
  threats: {
    competitor_app_id: string;
    competitor_name: string;
    keyword_id: string;
    keyword: string;
    country: string;
    from_rank: number | null;
    to_rank: number;
    own_rank: number | null;
  }[];
  leads: LandscapeKeyword[];
  competitors: { app_id: string; name: string }[];
  insight: CompetitorInsightPayload | null;
  insight_cooldown: { in_cooldown: boolean; next_available_at: string | null };
}

// ── Delete endpoints ─────────────────────────────────────────────────────────

export interface UntrackKeywordResult {
  id: string;
  keyword_id: string;
  app_id: string;
  deleted: boolean;
}

export interface UntrackKeywordsResult {
  deleted: number;
  requested: number;
}

export interface UntrackAppResult {
  id: string;
  deleted: boolean;
}

export interface DeleteProductResult {
  id: string;
  deleted: boolean;
  untracked_apps: number;
}

export interface RemoveCompetitorResult {
  product_id: string;
  competitor_app_id: string;
  deleted: boolean;
  edges_removed: number;
}

// ── Products list ────────────────────────────────────────────────────────────

export interface ProductSummary {
  id: string;
  name: string;
  icon_url: string | null;
  country: string;
  created_at: string;
  competitor_count: number;
  apps: {
    id: string;
    store: string;
    store_id: string;
    name: string;
    icon_url: string | null;
  }[];
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export type AlertType =
  | 'rank_drop'
  | 'rank_gain'
  | 'entered_top10'
  | 'left_top10'
  | 'new_ranking'
  | 'rating_drop'
  | 'review_spike'
  | 'competitor_change'
  | 'top_chart';

export interface AlertRule {
  id: string;
  type: string;
  scope_app_id: string | null;
  threshold: number | null;
  effective_threshold: number | null;
  /** top_chart only; null = the countries the org tracks keywords in. */
  countries: string[] | null;
  enabled: boolean;
  created_at: string;
}

export interface DeleteAlertResult {
  id: string;
  deleted: boolean;
}

// ── Top Charts ───────────────────────────────────────────────────────────────

/** Chart payloads are camelCase — they mirror the service layer's view type. */
export interface TopChartEntry {
  rank: number;
  storeId: string;
  /** iOS only — numeric Apple id (storeId is the bundle id). */
  numericId: number | null;
  name: string;
  iconUrl: string | null;
  developer: string | null;
  rating: number | null;
  delta: number | null;
  isNew: boolean;
}

export interface TopChart {
  store: string;
  country: string;
  chart: string;
  category: string;
  measuredAt: string;
  previousMeasuredAt: string | null;
  stale: boolean;
  /** Always describes the whole top 100, even when `limit` truncated entries. */
  summary: { total: number; newToday: number; dropped: number };
  entries: TopChartEntry[];
  movers: { storeId: string; name: string; iconUrl: string | null; rank: number; delta: number }[];
  droppedApps: { storeId: string; name: string; iconUrl: string | null; previousRank: number }[];
}

// ── Discovered keywords ──────────────────────────────────────────────────────

export interface DiscoveredKeyword {
  id: string;
  keyword_id: string;
  keyword: string;
  store: string;
  country: string;
  rank: number | null;
  source: string;
  status: string;
  bucket: 'ranked' | 'gap' | 'idea' | null;
  popularity: number | null;
  popularity_proxy: number | null;
  popularity_source: 'apple' | 'proxy' | null;
  difficulty: number | null;
  ai_relevance: number | null;
  opportunity: number | null;
  discovered_at: string;
  ranks_checked_at: string | null;
}

export interface DiscoveredKeywordsResult {
  app_id: string;
  total: number;
  keywords: DiscoveredKeyword[];
}

// ── Alert events ─────────────────────────────────────────────────────────────

export interface AlertEvent {
  id: string;
  type: AlertType;
  app_id: string | null;
  keyword_id: string | null;
  measured_at: string;
  payload: Record<string, unknown>;
  emailed_at: string | null;
  created_at: string;
}

// ── Review insights ──────────────────────────────────────────────────────────

export interface ReviewInsightTheme {
  theme: string;
  detail: string;
  frequency: string;
  quotes: string[];
  trend: string;
}

export interface ReviewInsightResult {
  app_id: string;
  country: string;
  insight: {
    generated_at: string;
    reviews_analyzed: number;
    avg_score: number | null;
    window_start: string | null;
    window_end: string | null;
    model: string | null;
    overview: string;
    sentiment: string;
    praises: ReviewInsightTheme[];
    complaints: ReviewInsightTheme[];
    feature_requests: string[];
    changes_since_last: string | null;
  } | null;
  cooldown: {
    in_cooldown: boolean;
    next_available_at: string | null;
  };
}

// ── App overview ─────────────────────────────────────────────────────────────

export interface AppOverviewMover {
  keyword_id: string;
  keyword: string;
  country: string;
  rank: number | null;
  change_7d: number | null;
  popularity: number | null;
  difficulty: number | null;
}

export interface AppOverviewResult {
  app_id: string;
  app_name: string;
  store: string;
  days: number;
  keywords: {
    tracked: number;
    ranked: number;
    ranked_delta_7d: number | null;
    top_10: number;
    best_rank: { rank: number; keyword: string } | null;
  };
  competitors: number;
  visibility: {
    score: number;
    delta_7d: number | null;
    share_of_voice: number | null;
    share_delta_7d: number | null;
    branded_excluded: number;
    spark: { date: string; value: number; share: number | null }[];
  };
  movement: {
    improved_7d: number;
    dropped_7d: number;
    top_improvements: AppOverviewMover[];
    top_drops: AppOverviewMover[];
  };
  rank_distribution: Array<{ date: string; total: number } & Record<string, number | string>>;
  opportunities: Array<{
    keyword_id: string;
    keyword: string;
    country: string;
    kind: string;
    rank: number | null;
    popularity: number | null;
    difficulty: number | null;
  }>;
}

// ── Portfolio ────────────────────────────────────────────────────────────────

export interface PortfolioMoverEntry {
  app_id: string;
  app_name: string;
  store: string;
  keyword: string;
  country: string;
  from: number;
  to: number;
  popularity: number | null;
  impact: number;
}

export interface PortfolioAppEntry {
  app_id: string;
  app_name: string;
  icon_url: string | null;
  store: string;
  keywords_tracked: number;
  keywords_ranked: number;
  top_10: number;
  best_rank: number | null;
  up_7d: number;
  down_7d: number;
  net_delta_7d: number;
  visibility: number;
  visibility_prev_7d: number | null;
  visibility_delta_7d: number | null;
  spark: { date: string; value: number }[];
  rating: number | null;
  rating_prev_7d: number | null;
  review_count: number | null;
}

export interface PortfolioResult {
  kpis: {
    apps: number;
    keywords_tracked: number;
    keywords_ranked: number;
    top_10: number;
    up_7d: number;
    down_7d: number;
    visibility: number;
    visibility_prev_7d: number | null;
    visibility_delta_7d: number | null;
    avg_rating: number | null;
    alerts_this_week: number;
  };
  apps: PortfolioAppEntry[];
  movers_up: PortfolioMoverEntry[];
  movers_down: PortfolioMoverEntry[];
  attention: Array<{
    app_id: string;
    app_name: string;
    store: string;
    severity: number;
    signals: Array<Record<string, unknown> & { type: string }>;
  }>;
  opportunities: Array<{
    keyword_id: string;
    keyword: string;
    country: string;
    app_id: string;
    app_name: string;
    store: string;
    popularity: number | null;
    difficulty: number | null;
    rank: number | null;
    opportunity: number;
  }>;
}

/** Why an App Store Connect endpoint has (or lacks) data. */
export type AscMetricsStatus =
  | 'ready'
  | 'not_connected'
  | 'not_ios'
  | 'app_not_in_account'
  | 'pending'
  | 'key_lacks_analytics';

/** Envelope fields shared by /apps/:id/sales and /apps/:id/engagement. */
export interface AscMetricsBase {
  app_id: string;
  app_name: string;
  store: string;
  status: AscMetricsStatus;
  connected: boolean;
  /** Human-readable reason when status !== 'ready', else null. */
  message: string | null;
  apple_app_id: string | null;
  last_synced_at: string | null;
  range: { start: string; end: string };
  reported_days: number;
}

export interface AppSalesMetrics {
  downloads: number;
  redownloads: number;
  iap_units: number;
  proceeds_usd_approx: number;
}

export interface AppSalesDay {
  date: string;
  reported: boolean;
  downloads: number | null;
  redownloads: number | null;
  iap_units: number | null;
  proceeds_usd_approx: number | null;
}

export interface AppSalesResult extends AscMetricsBase {
  totals: AppSalesMetrics | null;
  days: AppSalesDay[];
  countries: Array<{ country: string } & AppSalesMetrics>;
}

export interface AppEngagementResult extends AscMetricsBase {
  totals: {
    impressions: number;
    product_page_views: number;
    downloads: number;
    installs: number;
    deletions: number;
    sessions: number;
  } | null;
  rates: {
    page_view_rate: number | null;
    download_rate: number | null;
    search_share: number | null;
  } | null;
  sources: Array<{
    source_type: string;
    impressions: number;
    product_page_views: number;
    share_of_impressions: number | null;
  }>;
  days: Array<{
    date: string;
    reported: boolean;
    impressions: number | null;
    product_page_views: number | null;
    installs: number | null;
    deletions: number | null;
    sessions: number | null;
    downloads: number | null;
  }>;
}
