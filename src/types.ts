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

export interface KeywordResult {
  keyword: string;
  store: string;
  country: string;
  difficulty: number;
  popularity: number | null;
  /** Proxy estimate shown in brackets when Apple censors the SP to its floor (5). */
  popularity_proxy?: number | null;
  results_count: number | null;
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
  discovered: number;
  ranked: number;
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
  | 'competitor_change';

export interface AlertRule {
  id: string;
  type: string;
  scope_app_id: string | null;
  threshold: number | null;
  effective_threshold: number | null;
  enabled: boolean;
  created_at: string;
}

export interface DeleteAlertResult {
  id: string;
  deleted: boolean;
}
