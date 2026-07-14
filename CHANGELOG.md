# @sonarapp/cli

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
