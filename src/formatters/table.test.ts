import { describe, it, expect } from "vitest";
import {
  formatAppsTable,
  formatAppDetail,
  formatKeywordsTable,
  formatRankingsTable,
  formatSuggestionsTable,
  formatCompetitorKeywordsTable,
  formatRevenue,
  formatTopChartTable,
} from "./table.js";
import type { App, KeywordResult, RankingEntry, Suggestion, CompetitorKeyword, Revenue, TopChart } from "../types.js";

describe("formatAppsTable", () => {
  it("returns dim message for empty array", () => {
    const result = formatAppsTable([]);
    expect(result).toContain("No apps found");
  });

  it("renders table with app data", () => {
    const apps: App[] = [
      {
        id: "abc12345-6789-0000-0000-000000000000",
        store: "ios",
        store_id: "123456789",
        name: "Test App",
        developer: "Test Dev",
        category: "Utilities",
        icon_url: null,
        is_own: true,
        added_at: "2026-01-01",
        latest_snapshot: {
          rating: 4.5,
          review_count: 1000,
          version: "1.0.0",
          installs: null,
          measured_at: "2026-01-15",
        },
      },
    ];

    const result = formatAppsTable(apps);
    expect(result).toContain("Test App");
    expect(result).toContain("Test Dev");
    expect(result).toContain("4.5");
    expect(result).toContain("1,000");
    expect(result).toContain("abc12345");
  });

  it("handles apps without snapshots", () => {
    const apps: App[] = [
      {
        id: "abc12345-6789-0000-0000-000000000000",
        store: "android",
        store_id: "com.test.app",
        name: "Android App",
        developer: null,
        category: null,
        icon_url: null,
        is_own: false,
        added_at: "2026-02-01",
        latest_snapshot: null,
      },
    ];

    const result = formatAppsTable(apps);
    expect(result).toContain("Android App");
  });
});

describe("formatAppDetail", () => {
  it("renders app detail with snapshot", () => {
    const app: App = {
      id: "abc12345",
      store: "ios",
      store_id: "123456789",
      name: "My App",
      developer: "Me",
      category: "Games",
      icon_url: null,
      is_own: true,
      added_at: "2026-01-01",
      latest_snapshot: {
        rating: 4.8,
        review_count: 5000,
        version: "2.0.0",
        installs: 100000,
        measured_at: "2026-02-10",
      },
    };

    const result = formatAppDetail(app);
    expect(result).toContain("My App");
    expect(result).toContain("abc12345");
    expect(result).toContain("iOS App Store");
    expect(result).toContain("Games");
    expect(result).toContain("4.8");
    expect(result).toContain("5,000");
    expect(result).toContain("2.0.0");
    expect(result).toContain("100,000");
  });

  it("renders app detail without snapshot", () => {
    const app: App = {
      id: "def67890",
      store: "android",
      store_id: "com.test",
      name: "Simple App",
      developer: null,
      category: null,
      icon_url: null,
      is_own: false,
      added_at: "2026-01-01",
      latest_snapshot: null,
    };

    const result = formatAppDetail(app);
    expect(result).toContain("Simple App");
    expect(result).toContain("Google Play");
    expect(result).not.toContain("Latest Snapshot");
  });
});

describe("formatKeywordsTable", () => {
  it("returns dim message for empty array", () => {
    const result = formatKeywordsTable([]);
    expect(result).toContain("No keywords found");
  });

  it("renders keyword data in table", () => {
    const keywords: KeywordResult[] = [
      {
        keyword: "fitness tracker",
        store: "ios",
        country: "us",
        difficulty: 45,
        popularity: 72,
        results_count: 250,
      },
      {
        keyword: "workout app",
        store: "android",
        country: "us",
        difficulty: 80,
        popularity: null,
        results_count: null,
      },
    ];

    const result = formatKeywordsTable(keywords);
    expect(result).toContain("fitness tracker");
    expect(result).toContain("workout app");
    expect(result).toContain("72");
    expect(result).toContain("250");
  });

  it("renders shed keywords as rate limited, never as difficulty 0", () => {
    const keywords: KeywordResult[] = [
      {
        keyword: "sleep sounds",
        store: "ios",
        country: "us",
        // The API fills unserved terms with zeros; printing them as data reads
        // as "easiest possible keyword", the opposite of the truth.
        difficulty: 0,
        popularity: null,
        results_count: 0,
        error: {
          code: "rate_limited",
          message: "Scraper queue is busy — retry this keyword shortly.",
          retry_after_seconds: 30,
        },
      },
    ];

    const result = formatKeywordsTable(keywords);
    expect(result).toContain("sleep sounds");
    expect(result).toContain("rate limited");
    expect(result).toContain("retry in 30s");
    expect(result).toContain("not charged");
    expect(result).not.toMatch(/\b0\b/);
  });

  it("names the reason for a store-unavailable keyword", () => {
    const result = formatKeywordsTable([
      {
        keyword: "budget app",
        store: "android",
        country: "gb",
        difficulty: 0,
        popularity: null,
        results_count: 0,
        error: { code: "unavailable", message: "Store data is temporarily unavailable." },
      },
    ]);
    expect(result).toContain("store unavailable");
    expect(result).not.toContain("retry in");
  });

  it("renders the proxy estimate in brackets for a censored (SP 5) keyword", () => {
    const keywords: KeywordResult[] = [
      {
        keyword: "meditation timer",
        store: "ios",
        country: "us",
        difficulty: 30,
        popularity: 5,
        popularity_proxy: 58,
        results_count: 120,
      },
    ];

    const result = formatKeywordsTable(keywords);
    // "5 (58)" — the floored Apple value with Sonar's disambiguating proxy.
    expect(result).toMatch(/5\s+\(58\)/);
  });

  it("marks beatable keywords next to the difficulty score", () => {
    const keywords: KeywordResult[] = [
      {
        keyword: "migraine tracker",
        store: "ios",
        country: "us",
        difficulty: 38,
        popularity: 30,
        difficulty_breakdown: {
          titleMatches: 2,
          appsAnalyzed: 10,
          top3Strength: [40000, 35000, 138],
          medianStrength: 40000,
          weakSpotRank: 3,
          beatable: true,
        },
        results_count: 180,
      },
      {
        keyword: "meditation",
        store: "ios",
        country: "us",
        difficulty: 85,
        popularity: 80,
        difficulty_breakdown: {
          titleMatches: 9,
          appsAnalyzed: 10,
          top3Strength: [900000, 700000, 500000],
          medianStrength: 400000,
          weakSpotRank: null,
          beatable: false,
        },
        results_count: 200,
      },
    ];

    const result = formatKeywordsTable(keywords);
    const lines = result.split("\n");
    const beatableLine = lines.find((l) => l.includes("migraine tracker"));
    const normalLine = lines.find((l) => l.includes("meditation"));
    expect(beatableLine).toContain("beatable");
    expect(normalLine).not.toContain("beatable");
  });
});

describe("formatRankingsTable", () => {
  it("returns dim message for empty array", () => {
    const result = formatRankingsTable([]);
    expect(result).toContain("No ranking data found");
  });

  it("renders ranking summary", () => {
    const rankings: RankingEntry[] = [
      {
        keyword_id: "kw1",
        keyword: "test keyword",
        history: [
          { rank: 5, measured_at: "2026-01-01" },
          { rank: 3, measured_at: "2026-01-02" },
          { rank: 8, measured_at: "2026-01-03" },
        ],
      },
    ];

    const result = formatRankingsTable(rankings);
    expect(result).toContain("test keyword");
    // Current rank is the last entry = 8
    expect(result).toContain("8");
    // Best rank = 3
    expect(result).toContain("3");
    // Data points = 3
    expect(result).toContain("3");
  });
});

describe("formatSuggestionsTable", () => {
  it("returns dim message for empty array", () => {
    const result = formatSuggestionsTable([]);
    expect(result).toContain("No suggestions found");
  });

  it("renders suggestion data", () => {
    const suggestions: Suggestion[] = [
      { term: "fitness app", priority: 8500 },
      { term: "workout tracker", priority: 2100 },
    ];

    const result = formatSuggestionsTable(suggestions);
    expect(result).toContain("fitness app");
    expect(result).toContain("8500");
    expect(result).toContain("workout tracker");
    expect(result).toContain("2100");
  });
});

describe("formatCompetitorKeywordsTable", () => {
  it("returns dim message for empty array", () => {
    const result = formatCompetitorKeywordsTable([]);
    expect(result).toContain("No competitor keywords found");
  });

  it("renders competitor keyword data", () => {
    const keywords: CompetitorKeyword[] = [
      {
        keyword_id: "kw1",
        keyword: "running app",
        store: "ios",
        country: "us",
        competitor_rank: 3,
        own_rank: 15,
        gap: "opportunity",
        difficulty: 55,
        popularity: 68,
      },
      {
        keyword_id: "kw2",
        keyword: "jogging tracker",
        store: "android",
        country: "us",
        competitor_rank: 7,
        own_rank: null,
        gap: "missing",
        difficulty: null,
        popularity: null,
      },
    ];

    const result = formatCompetitorKeywordsTable(keywords);
    expect(result).toContain("running app");
    expect(result).toContain("jogging tracker");
    expect(result).toContain("opportunity");
    expect(result).toContain("Not ranked");
  });
});

describe("formatRevenue", () => {
  const sample: Revenue = {
    app: {
      store: "ios",
      store_id: "389801252",
      name: "Instagram",
      icon_url: null,
    },
    revenue: {
      monthly: 1234567.89,
      monthly_formatted: "$1.2M/mo",
      model: "ad-supported",
      methodology: "Estimated from reviews-to-install ratio.",
      confidence: "medium",
      confidence_factors: ["Install base is estimated from review counts"],
    },
  };

  it("renders app name, store label, formatted revenue, and model", () => {
    const result = formatRevenue(sample);
    expect(result).toContain("Instagram");
    expect(result).toContain("iOS App Store");
    expect(result).toContain("389801252");
    expect(result).toContain("$1.2M/mo");
    expect(result).toContain("ad-supported");
    expect(result).toContain("Estimated from reviews-to-install ratio.");
    expect(result).toContain("medium");
    expect(result).toContain("Install base is estimated from review counts");
  });

  it("uses 'Google Play' label for android", () => {
    const result = formatRevenue({ ...sample, app: { ...sample.app, store: "android" } });
    expect(result).toContain("Google Play");
    expect(result).not.toContain("iOS App Store");
  });
});

describe("new formatters (stateless + write commands)", () => {
  it("formatAppLookup renders metadata and optional fields", async () => {
    const { formatAppLookup } = await import("./table.js");
    const out = formatAppLookup({
      store: "android",
      storeId: "com.spotify.music",
      name: "Spotify",
      description: "Music app",
      developer: "Spotify AB",
      category: "Music",
      iconUrl: null,
      rating: 4.4,
      reviews: 30000000,
      installs: 1000000000,
      price: 0,
    });
    expect(out).toContain("Spotify");
    expect(out).toContain("Google Play");
    expect(out).toContain("com.spotify.music");
    expect(out).toContain("4.4");
    expect(out).toContain("1,000,000,000");
    expect(out).toContain("Free");
  });

  it("formatAppSearchTable returns dim message for empty array", async () => {
    const { formatAppSearchTable } = await import("./table.js");
    expect(formatAppSearchTable([])).toContain("No apps found");
  });

  it("formatAsoScore renders the score and checks", async () => {
    const { formatAsoScore } = await import("./table.js");
    const out = formatAsoScore({
      app: { store: "ios", store_id: "1", name: "Test App", icon_url: null },
      score: 72,
      checks: [
        { id: "title", label: "Title length", score: 90, weight: 3, detail: "29/30 chars" },
      ],
    });
    expect(out).toContain("Test App");
    expect(out).toContain("72");
    expect(out).toContain("Title length");
    expect(out).toContain("29/30 chars");
  });

  it("formatExtractedKeywords lists terms with scores", async () => {
    const { formatExtractedKeywords } = await import("./table.js");
    const out = formatExtractedKeywords({
      app: { store: "ios", store_id: "1", name: "Test App", icon_url: null },
      keywords: [{ term: "habit tracker", score: 85 }],
    });
    expect(out).toContain("habit tracker");
    expect(out).toContain("85");
  });

  it("formatReviewsTable renders rating, date, and body", async () => {
    const { formatReviewsTable } = await import("./table.js");
    const out = formatReviewsTable([
      {
        id: "r1",
        author: "Jane",
        title: "Great app",
        body: "Love it",
        score: 5,
        version: "2.0",
        date: "2026-06-01T00:00:00Z",
      },
    ]);
    expect(out).toContain("5★");
    expect(out).toContain("2026-06-01");
    expect(out).toContain("Great app");
    expect(out).toContain("Love it");
  });

  it("formatChangesTable renders change type and data", async () => {
    const { formatChangesTable } = await import("./table.js");
    const out = formatChangesTable([
      {
        id: "c1",
        change_type: "release",
        detected_at: "2026-06-01T08:00:00Z",
        data: { version: "3.1.0" },
      },
    ]);
    expect(out).toContain("release");
    expect(out).toContain("3.1.0");
  });

  it("formatProductCreated lists the product and linked apps", async () => {
    const { formatProductCreated } = await import("./table.js");
    const out = formatProductCreated({
      id: "prod-1",
      name: "MyFit",
      icon_url: null,
      country: "us",
      apps: [
        {
          id: "app-1",
          store: "ios",
          store_id: "123",
          name: "MyFit iOS",
          developer: null,
          category: null,
          icon_url: null,
        },
      ],
    });
    expect(out).toContain("Product created");
    expect(out).toContain("prod-1");
    expect(out).toContain("MyFit iOS");
    expect(out).toContain("app-1");
  });

  it("formatTrackKeywordsResult summarizes outcomes per keyword", async () => {
    const { formatTrackKeywordsResult } = await import("./table.js");
    const out = formatTrackKeywordsResult({
      added: 1,
      already_tracked: 1,
      failed: [],
      results: [
        { term: "yoga", status: "created", trackedKeywordId: "tk-1" },
        { term: "pilates", status: "already_tracked", trackedKeywordId: "tk-2" },
      ],
    });
    expect(out).toContain("1 added, 1 already tracked, 0 failed");
    expect(out).toContain("yoga");
    expect(out).toContain("tk-1");
  });

  it("formatScanResult shows counts and a follow-up hint", async () => {
    const { formatScanResult } = await import("./table.js");
    const out = formatScanResult({
      competitor_app_id: "comp-1",
      own_app_id: "app-1",
      generated: 120,
      queued: 95,
      verified_now: 24,
    });
    expect(out).toContain("120");
    expect(out).toContain("95");
    expect(out).toContain("24");
    expect(out).toContain("sonar competitors keywords comp-1 --app app-1");
  });

  it("formatLandscape shows stats, gap rows, threats, and the insight", async () => {
    const { formatLandscape } = await import("./table.js");
    const out = formatLandscape({
      app_id: "app-1",
      stats: {
        competitors: 2,
        keywords_compared: 40,
        gaps: 7,
        winnable: 3,
        threats: 1,
        leads: 5,
      },
      gaps: [
        {
          keyword_id: "kw-1",
          keyword: "sleep sounds",
          country: "us",
          own_rank: null,
          best_competitor: { name: "BetterSleep", rank: 2 },
          popularity: 71,
          difficulty: 34,
          opportunity: 62,
        },
      ],
      threats: [
        {
          competitor_app_id: "comp-1",
          competitor_name: "BetterSleep",
          keyword_id: "kw-2",
          keyword: "sleep tracker",
          country: "us",
          from_rank: 12,
          to_rank: 4,
          own_rank: 6,
        },
      ],
      leads: [],
      competitors: [{ app_id: "comp-1", name: "BetterSleep" }],
      insight: {
        generated_at: "2026-07-20T00:00:00.000Z",
        keywords_compared: 40,
        competitors_analyzed: 2,
        gaps_found: 7,
        model: "gemini-2.5-flash",
        posture: "challenger",
        overview: "Strong core, weak sounds niche.",
        opportunities: [
          {
            title: "Sleep sounds",
            detail: "Low difficulty across the cluster.",
            priority: "high",
            keywords: [
              {
                keyword_id: "kw-1",
                keyword: "sleep sounds",
                country: "us",
                own_rank: null,
                best_competitor: { name: "BetterSleep", rank: 2 },
                popularity: 71,
                difficulty: 34,
                opportunity: 62,
              },
            ],
          },
        ],
        threats: [
          {
            competitor_name: "BetterSleep",
            headline: "BetterSleep climbed #12 → #4",
            detail: "Subtitle change.",
          },
        ],
        strengths: ['#1 for "sleep diary"'],
        changes_since_last: null,
      },
      insight_cooldown: { in_cooldown: true, next_available_at: null },
    });
    expect(out).toContain("7 keyword gaps");
    expect(out).toContain("3 winnable");
    expect(out).toContain("sleep sounds");
    expect(out).toContain("BetterSleep");
    expect(out).toContain("#12 → #4");
    expect(out).toContain("Strong core, weak sounds niche.");
    expect(out).toContain("Sleep sounds");
    expect(out).toContain('#1 for "sleep diary"');
  });

  it("formatLandscape hints at analyze when there is no insight yet", async () => {
    const { formatLandscape } = await import("./table.js");
    const out = formatLandscape({
      app_id: "app-1",
      stats: {
        competitors: 1,
        keywords_compared: 10,
        gaps: 0,
        winnable: 0,
        threats: 0,
        leads: 0,
      },
      gaps: [],
      threats: [],
      leads: [],
      competitors: [{ app_id: "comp-1", name: "X" }],
      insight: null,
      insight_cooldown: { in_cooldown: false, next_available_at: null },
    });
    expect(out).toContain("sonar competitors analyze");
  });
});

describe("formatTopChartTable", () => {
  const chart: TopChart = {
    store: "ios",
    country: "us",
    chart: "free",
    category: "overall",
    measuredAt: "2026-07-26",
    previousMeasuredAt: "2026-07-25",
    stale: false,
    summary: { total: 100, newToday: 2, dropped: 3 },
    entries: [
      {
        rank: 1,
        storeId: "com.one",
        numericId: 1,
        name: "Riser",
        iconUrl: null,
        developer: "Dev One",
        rating: 4.6,
        delta: 4,
        isNew: false,
      },
      {
        rank: 2,
        storeId: "com.two",
        numericId: null,
        name: "Faller",
        iconUrl: null,
        developer: null,
        rating: null,
        delta: -7,
        isNew: false,
      },
      {
        rank: 3,
        storeId: "com.three",
        numericId: null,
        name: "Fresh",
        iconUrl: null,
        developer: "Dev Three",
        rating: 3.2,
        delta: null,
        isNew: true,
      },
    ],
    movers: [],
    droppedApps: [],
  };

  it("renders the header with the whole-chart summary and movement date", () => {
    const out = formatTopChartTable(chart);
    expect(out).toContain("iOS");
    expect(out).toContain("top free");
    expect(out).toContain("2026-07-26");
    expect(out).toContain("movement vs 2026-07-25");
    expect(out).toContain("100 apps");
    expect(out).toContain("2 new today");
    expect(out).toContain("3 dropped out");
  });

  it("renders up/down/NEW movement markers and missing values as dashes", () => {
    const out = formatTopChartTable(chart);
    expect(out).toContain("\u25B24");
    expect(out).toContain("\u25BC7");
    expect(out).toContain("NEW");
    expect(out).toContain("Riser");
    expect(out).toContain("4.6");
    expect(out).toContain("Dev One");
  });

  it("notes a cold-start chart and a stale serve", () => {
    const out = formatTopChartTable({
      ...chart,
      previousMeasuredAt: null,
      stale: true,
    });
    expect(out).toContain("no previous snapshot yet");
    expect(out).toContain("stale");
  });

  it("handles an empty entry list", () => {
    const out = formatTopChartTable({ ...chart, entries: [] });
    expect(out).toContain("No chart entries found.");
  });
});


it("shows a completed drop instead of an older numeric rank in CLI summaries", () => {
  const result = formatRankingsTable([{ keyword_id: "kw1", keyword: "pentomino",
    history: [{ rank: 28, measured_at: "2026-09-01" }],
    observations: [{ measured_at: "2026-09-02", rank: null, status: "not_found", results_count: 44 }],
  }]);
  expect(result).toContain("Not found");
});
it("shows an unknown check as no observation rather than not found", () => {
  const result = formatRankingsTable([{ keyword_id: "kw1", keyword: "pentomino", history: [],
    observations: [{ measured_at: "2026-09-02", rank: null, status: "not_observed", results_count: null }],
  }]);
  expect(result).toContain("No observation");
  expect(result).not.toContain("Not found");
});

describe("App Store Connect formatters", () => {
  const base = {
    app_id: "app-1",
    app_name: "Test App",
    store: "ios",
    status: "ready" as const,
    connected: true,
    message: null,
    apple_app_id: "123456789",
    last_synced_at: "2026-09-30T14:55:00.000Z",
    range: { start: "2026-09-29", end: "2026-09-30" },
  };

  it("formatAppSales renders totals, days (incl. unreported) and countries", async () => {
    const { formatAppSales } = await import("./table.js");
    const out = formatAppSales({
      ...base,
      reported_days: 1,
      totals: { downloads: 1200, redownloads: 30, iap_units: 4, proceeds_usd_approx: 1234.5 },
      days: [
        { date: "2026-09-29", reported: true, downloads: 1200, redownloads: 30, iap_units: 4, proceeds_usd_approx: 1234.5 },
        { date: "2026-09-30", reported: false, downloads: null, redownloads: null, iap_units: null, proceeds_usd_approx: null },
      ],
      countries: [{ country: "us", downloads: 1200, redownloads: 30, iap_units: 4, proceeds_usd_approx: 1234.5 }],
    });
    expect(out).toContain("Test App");
    expect(out).toContain("1,200");
    expect(out).toContain("≈ $1,234.50");
    expect(out).toContain("not reported yet");
    expect(out).toContain("US");
    expect(out).toContain("1 of 2 days reported");
  });

  it("formatAppSales says so when no day is reported", async () => {
    const { formatAppSales } = await import("./table.js");
    const out = formatAppSales({ ...base, reported_days: 0, totals: null, days: [], countries: [] });
    expect(out).toContain("has not reported any sales days");
  });

  it("formatAppEngagement renders the funnel, rates and sources", async () => {
    const { formatAppEngagement } = await import("./table.js");
    const out = formatAppEngagement({
      ...base,
      reported_days: 1,
      totals: { impressions: 10000, product_page_views: 1500, downloads: 300, installs: 280, deletions: 12, sessions: 900 },
      rates: { page_view_rate: 0.15, download_rate: 0.2, search_share: 0.6 },
      sources: [
        { source_type: "App Store Search", impressions: 6000, product_page_views: 900, share_of_impressions: 0.6 },
        { source_type: "App Referrer", impressions: 400, product_page_views: 400, share_of_impressions: 0.04 },
      ],
      days: [
        { date: "2026-09-29", reported: true, impressions: 10000, product_page_views: 1500, installs: 280, deletions: 12, sessions: 900, downloads: 300 },
        { date: "2026-09-30", reported: false, impressions: null, product_page_views: null, installs: null, deletions: null, sessions: null, downloads: null },
      ],
    });
    expect(out).toContain("10,000");
    expect(out).toContain("15.0%");
    expect(out).toContain("60.0%");
    expect(out).toContain("App Referrer");
    expect(out).toContain("Impressions include product page views");
  });

  it.each([
    ["pending", "Apple is generating the first analytics reports"],
    ["key_lacks_analytics", "needs the Admin role"],
  ] as const)("formatAppEngagement prints the %s message instead of tables", async (status, message) => {
    const { formatAppEngagement } = await import("./table.js");
    const out = formatAppEngagement({
      ...base,
      status,
      message: `${message}.`,
      reported_days: 0,
      totals: null,
      rates: null,
      sources: [],
      days: [],
    });
    expect(out).toContain(message);
    expect(out).not.toContain("Impressions by source");
  });
});
