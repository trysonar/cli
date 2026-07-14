import { describe, it, expect } from "vitest";
import {
  formatAppsTable,
  formatAppDetail,
  formatKeywordsTable,
  formatRankingsTable,
  formatSuggestionsTable,
  formatCompetitorKeywordsTable,
  formatRevenue,
} from "./table.js";
import type { App, KeywordResult, RankingEntry, Suggestion, CompetitorKeyword, Revenue } from "../types.js";

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
      discovered: 12,
      ranked: 24,
    });
    expect(out).toContain("12");
    expect(out).toContain("24");
    expect(out).toContain("sonar competitors keywords comp-1 --app app-1");
  });
});
