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
  results_count: number | null;
}

export interface TrackedKeyword {
  id: string;
  keyword_id: string;
  keyword: string;
  store: string;
  country: string;
  added_at: string;
  difficulty: number | null;
  popularity: number | null;
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
}
