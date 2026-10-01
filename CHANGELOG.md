# @sonarapp/cli

## 0.9.1

### Patch Changes

- d408508: Refresh the README tool and command reference. The MCP README now lists all 55 tools grouped by plan (stateless, workspace reads, Agency-only, write tools, Screenshot Studio), notes which tools run keyless on the free tier, and corrects the default `SONAR_API_URL`. The CLI README lists every command, including `apps overview`, `apps sales`, `apps engagement`, `keywords discovered`, `portfolio`, `alerts` and `charts top`, and marks the Agency-only ones.

## 0.9.0

### Minor Changes

- 0d087a2: Add App Store Connect sales and engagement for your own iOS apps (Agency plan, App Store Connect connection required). New MCP tools `sonar_app_sales` (downloads, redownloads, IAP units, approximate USD proceeds, per-country breakdown) and `sonar_app_engagement` (impressions, product page views, downloads, conversion rates, search share, impressions by source, installs, deletions, sessions), and the matching CLI commands `sonar apps sales <id>` and `sonar apps engagement <id>` with `--start`, `--end`, `--days` and `--store`. Impressions follow App Store Connect's definition and include product page views. When data is missing, the response's `status` and `message` say why (not connected, not an iOS app, analytics still pending, key lacks the Admin role).
- 00b57be: Add the `top_chart` alert type: get notified when one of your apps enters or leaves a store top chart (overall and its category) in the countries you choose. `sonar_set_alert` and `sonar alerts set` accept a `countries` list (max 10) and a rank cutoff via `threshold` (default 200).

## 0.8.1

### Patch Changes

- 00da7ee: Explain daily ranking outcomes from the API's additive observations field: ranked, not found in completed search results, or no confirmed observation. CLI rank summaries use the latest dated outcome instead of an older position.
- 303bc95: Escape spreadsheet formula prefixes in CSV text cells and quote multiline values while preserving numeric ranks. JSON exports are unchanged.

## 0.8.0

### Minor Changes

- 351f7af: Add an optional Android review language (`--lang` in the CLI, `lang` in MCP).
  Without a language, Sonar merges the market language plus English, Spanish,
  French, and Arabic review feeds, deduplicating reviews before sorting.

### Patch Changes

- 45d1874: Tell the truth about keywords a bulk metrics request couldn't serve. Terms the
  scraper queue sheds come back with an `error` and zeroed fields; the CLI table
  printed those zeros as data (difficulty 0, coloured "easiest") and counted them
  in the "credits charged" line even though the server refunds them. Shed rows
  now render as "rate limited — retry in 30s (not charged)", the charge line
  counts only served keywords, and the MCP tool folds the response's new
  `retry_after_seconds` into the term's message so agents back off at the drain
  rate — the `Retry-After` header is nonstandard on a 200 and proxies drop it.
- 3b80241: Surface the server's `Retry-After` hint in throttle errors. The API now sizes
  that header to the real scraper-queue depth, so a 429/503 message reads
  "Retry after 30s." instead of a bare "retry later" — agents and scripts back
  off at the drain rate rather than retrying straight back into congestion.

## 0.7.1

### Patch Changes

- dc71090: Default API base URL is now `https://api.trysonar.app` — the dedicated API
  serving endpoint with drastically higher keyword-compute throughput.
  `https://trysonar.app` keeps working (it proxies to the same backend), and
  `SONAR_API_URL` / saved config still override the default.
- c14349c: Top charts depth raised to 200 — the `limit` parameter of `sonar_top_charts` / `sonar charts top` now accepts 1-200, and summary/movers/dropped cover the full top 200.

## 0.7.0

### Minor Changes

- 20be68f: Competitor scan upgraded to the AI-first discovery pipeline. `sonar_scan_competitor` / `sonar competitors scan` now return `generated` / `queued` / `verified_now` counts: the scan generates terms from the competitor's listing (brand queries included), verifies the first batch inline (~30s), and the rest verify in the background — poll competitor keywords for results as they land. The previous `discovered` / `ranked` response fields are gone.
- a9a1d63: Top Charts. New `sonar charts top` command and `sonar_top_charts` MCP tool wrap `GET /api/v1/charts/top`: the store's top free/paid/grossing chart (overall or by category, any country) with day-over-day movement — per-app rank delta, apps new to the chart, the biggest movers, and apps that dropped out. Market-wide, so it needs no tracked apps, and it works without an API key on the anonymous free tier. `summary`, `movers` and `droppedApps` always describe the whole top 100; `--limit` / `limit` truncates the returned entries only.
- 83b69f5: Add app overview, Agency portfolio, discovered keywords, alert events, and AI review insights.
  - MCP: new tools `sonar_discovered_keywords`, `sonar_alert_events`, `sonar_review_insights`, `sonar_generate_review_insights`, `sonar_app_overview`, and `sonar_portfolio` (53 tools total, full v1 API parity).
  - CLI: new commands `sonar apps overview`, `sonar portfolio`, `sonar keywords discovered`, `sonar alerts events`, `sonar apps insights`, and `sonar apps analyze-reviews`.

### Patch Changes

- 6558083: Rename the user-facing plan name from "Full plan" to "Indie plan" in tool descriptions and error messages, matching current Sonar pricing. Update the Smithery badge to the new trysonar/sonar namespace.

## 0.6.0

### Minor Changes

- Requests now send a `sonar-cli/<version>` User-Agent so server-side usage stats can attribute CLI traffic.

- c1b99c4: Revenue estimates now include a `confidence` grade (high/medium/low) and `confidence_factors` explaining it. The CLI prints the grade and factors in table output; the MCP tool description now instructs agents to communicate confidence alongside the number.
- e8db12c: Starred keywords: mark tracked keywords as favorites/targets. CLI gains `sonar keywords star <id>` / `unstar <id>` and shows a ★ marker in `keywords list`; MCP gains the `sonar_star_keyword` write tool, and `sonar_app_keywords` now returns `note` and `starred_at` per keyword.

### Patch Changes

- eb0c134: Point repository and bugs links at the public GitHub mirrors (trysonar/cli, trysonar/mcp) so the Repository link on npm resolves for everyone.

## 0.5.0

### Minor Changes

- c4f4c16: Add teardown + alerts coverage to match the new v1 endpoints.

  MCP: 9 new tools — `sonar_list_products`, `sonar_list_alerts`, `sonar_delete_tracked_keyword`, `sonar_untrack_keywords`, `sonar_untrack_app`, `sonar_delete_product`, `sonar_remove_competitor`, `sonar_set_alert`, `sonar_delete_alert` (now 31 tools total).

  CLI: `keywords untrack`, `keywords untrack-all`, `apps untrack`, `products list`, `products delete`, `products remove-competitor`, and a new `alerts` group (`list`, `set`, `delete`). Destructive commands confirm unless `--force`.

## 0.4.0

### Minor Changes

- 9ff7f99: Full API parity: the CLI now covers every Sonar API endpoint.

  New read commands:
  - `sonar apps lookup <store-id>` — look up any app by store ID
  - `sonar apps search <query>` — search apps in a store
  - `sonar apps score <store-id>` — ASO audit score (0-100)
  - `sonar apps extract-keywords <store-id>` — keywords from an app's metadata
  - `sonar apps reviews <store-id>` — fetch app reviews (with rating/sort filters)
  - `sonar apps changes <id>` — change history for a tracked app (releases, metadata, screenshots, price, category)

  New write commands (require an API key with the `write` scope):
  - `sonar products create --ios <id> / --android <pkg>` — create a product and start tracking
  - `sonar products add-app <product-id>` — link the second-store version
  - `sonar products add-competitor <product-id>` — track a competitor
  - `sonar keywords track <app-id> <keywords...>` — start rank-tracking keywords
  - `sonar keywords note <tracked-keyword-id>` — set or clear a keyword note
  - `sonar competitors scan <competitor-id> --app <id>` — run a competitor keyword discovery scan

  The HTTP client now supports POST/PATCH with the same auth, verbose logging, and error handling as GET.

## 0.3.0

### Minor Changes

- 2197f20: Add `keywords metrics` endpoint — difficulty + popularity for a specific keyword or up to 25 in bulk. 1 credit per keyword, vs. 10 for `keywords search` which fans out into related ideas.

  **CLI:**

  ```bash
  sonar keywords metrics --store ios "habit tracker"
  sonar keywords metrics --store ios habit water sleep   # bulk, 1 credit each
  ```

  **MCP:** New `sonar_keyword_metrics` tool with `keyword` (single) or `keywords` (bulk array) arg.

## 0.2.0

### Minor Changes

- 83d22db: Initial release.

  **`@sonarapp/cli`** — `sonar` CLI for App Store Optimization. Authenticate with `sonar auth login`, then research keywords (`sonar keywords search`), audit apps (`sonar apps get`), track rankings (`sonar rankings`), and run competitor analysis from the terminal. Reads `SONAR_API_KEY` / `SONAR_API_URL` from env or `~/.config/sonar/config.json`.

  **`@sonarapp/mcp`** — Sonar MCP server (`sonar-mcp`) exposing 8 stateless ASO tools to AI agents (Claude Desktop, Claude Code, Cursor, Cline): `sonar_app_lookup`, `sonar_app_search`, `sonar_app_aso_score`, `sonar_app_extract_keywords`, `sonar_app_reviews`, `sonar_app_revenue`, `sonar_keyword_search`, `sonar_keyword_suggestions`. Configure with `SONAR_API_KEY` env var.
