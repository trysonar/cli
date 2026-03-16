import { describe, it, expect } from "vitest";
import {
  formatAppsTable,
  formatAppDetail,
  formatKeywordsTable,
  formatRankingsTable,
  formatSuggestionsTable,
  formatCompetitorKeywordsTable,
} from "./table.js";
import type { App, KeywordResult, RankingEntry, Suggestion, CompetitorKeyword } from "../types.js";

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
    expect(result).toContain("8");
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
