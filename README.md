# @sonarapp/cli

[![npm](https://img.shields.io/npm/v/@sonarapp/cli.svg)](https://www.npmjs.com/package/@sonarapp/cli)
[![license](https://img.shields.io/npm/l/@sonarapp/cli.svg)](./LICENSE)

`sonar` — App Store Optimization from the command line.

Look up apps, research keywords, track rankings, and run competitor analysis on the App Store and Google Play, all from your terminal. Powered by [Sonar](https://trysonar.app).

---

## Install

```bash
npm install -g @sonarapp/cli
```

Requires Node.js 20+.

## Authenticate

Get an API key at [trysonar.app/developers](https://trysonar.app/developers). Every new account gets 50 free API credits for the research commands; workspace commands (tracking, rankings, competitors) need an Indie plan, with a 7-day free trial.

```bash
sonar auth login
```

This stores your key in `~/.config/sonar/config.json` (mode `0600`). Or set `SONAR_API_KEY` in your environment.

```bash
export SONAR_API_KEY=aso_...
```

## Quick start

```bash
# Look up any app by store ID (no tracking required)
sonar apps lookup com.spotify.music --store android --table

# Research a keyword
sonar keywords search "meditation" --store ios --table

# Get autocomplete suggestions
sonar keywords suggestions "med" --store ios --table

# Run an ASO audit
sonar apps score 1450772168 --store ios --table

# Start tracking an app (write-scope API key)
sonar products create --ios 1450772168 --name "My App"

# Track keywords for it (write-scope API key)
sonar keywords track <app-id> "habit tracker" "daily habits"

# Rank history for the app's tracked keywords
sonar rankings <app-id> --table

# Estimate monthly revenue
sonar revenue --store ios --id 1450772168 --table

# Export rankings to CSV
sonar export rankings <app-id> --format csv > rankings.csv
```

Add `--table` for human-readable tables. Default output is JSON, ready to pipe into `jq`, `fx`, or other tools.

## Commands

```
sonar auth login                                  Authenticate with your API key
sonar auth status                                 Show authentication status
sonar auth logout                                 Remove saved credentials

sonar apps lookup <store-id>                      Look up any app by store ID
sonar apps search <query>                         Search apps in a store
sonar apps score <store-id>                       ASO audit score (0-100)
sonar apps extract-keywords <store-id>            Keywords from an app's metadata
sonar apps reviews <store-id>                     Fetch app reviews
sonar apps list                                   List your tracked apps
sonar apps get <id>                               Show app details
sonar apps overview <app-id>                      Dashboard scoreboard (visibility, movers)
sonar apps changes <id>                           Change history for a tracked app
sonar apps insights <app-id>                      Latest AI review insight
sonar apps analyze-reviews <app-id>               Generate a fresh AI review insight ✏️
sonar apps sales <app-id>                         App Store Connect sales (Agency)
sonar apps engagement <app-id>                    App Store Connect engagement (Agency)
sonar apps untrack <id>                           Stop tracking an app ✏️

sonar keywords search <query>                     Keyword research (volume, difficulty)
sonar keywords metrics <keywords...>              Difficulty + popularity (single or bulk)
sonar keywords suggestions <seed>                 Autocomplete suggestions
sonar keywords list <app-id>                      Keywords tracked for an app
sonar keywords discovered <app-id>                Discovered keywords not tracked yet
sonar keywords track <app-id> <keywords...>       Start tracking keywords ✏️
sonar keywords note <tracked-keyword-id> [note]   Set or clear a keyword note ✏️
sonar keywords star <tracked-keyword-id>          Star a tracked keyword ✏️
sonar keywords unstar <tracked-keyword-id>        Unstar a tracked keyword ✏️
sonar keywords untrack <tracked-keyword-id>       Stop tracking a keyword ✏️
sonar keywords untrack-all <app-id>               Untrack several (--ids) or all (--all) ✏️

sonar rankings <app-id>                           Rank history for an app
sonar rankings keyword <keyword-id>               Apps ranking for a keyword

sonar competitors keywords <competitor-id>        Competitor keyword analysis
sonar competitors landscape <app-id>              Gaps, threats, leads + latest AI insight
sonar competitors scan <competitor-id> --app <id> Discover competitor keywords ✏️
sonar competitors analyze <app-id>                Generate a fresh AI competitive insight ✏️

sonar products list                               List products and their linked apps
sonar products create                             Create a product, start tracking ✏️
sonar products add-app <product-id>               Link the second-store version ✏️
sonar products add-competitor <product-id>        Track a competitor ✏️
sonar products remove-competitor <product-id> <competitor-id>
                                                  Stop tracking a competitor ✏️
sonar products delete <product-id>                Delete a product, untrack its apps ✏️

sonar alerts list                                 List your alert rules
sonar alerts events                               Detected alert events, newest first
sonar alerts set <type>                           Create or update an alert rule ✏️
sonar alerts delete <id>                          Delete an alert rule ✏️

sonar portfolio                                   Portfolio rollup across your apps (Agency)

sonar charts top --store <ios|android>            Top free/paid/grossing chart with movement

sonar revenue --store <ios|android> --id <id>     Estimate monthly revenue

sonar export rankings <app-id>                    Export rankings to CSV/JSON
```

Run `sonar <command> --help` for full options.

The research commands (`apps lookup`, `apps search`, `apps score`, `apps extract-keywords`, `apps reviews`, `keywords search`, `keywords metrics`, `keywords suggestions`, `charts top`, `revenue`) work on any plan with credits, including API Credits. Everything else reads or changes your workspace and needs an Indie plan or higher (an active trial counts).

Commands marked ✏️ mutate your workspace and require an API key created with the **`write` scope**. The rest work with the default `read` scope. The AI generation commands, `apps analyze-reviews` and `competitors analyze`, need a paid plan and are not available during the trial.

Commands marked (Agency) need the **Agency plan** (an Agency trial counts). `apps sales` and `apps engagement` are iOS-only and also need an App Store Connect connection at [trysonar.app/settings/connections](https://trysonar.app/settings/connections).

## Global flags

```
--table                   Output as a formatted table instead of JSON
--verbose                 Show request timing and rate-limit info
--base-url <url>          Override the API base URL (for self-hosting / staging)
```

## Environment variables

| Variable | Description |
|-|-|
| `SONAR_API_KEY` | Your Sonar API key. Overrides the value in `config.json`. |
| `SONAR_API_URL` | API base URL. Default `https://api.trysonar.app`. |
| `SONAR_CONFIG_PATH` | Path to the config file. Default `~/.config/sonar/config.json`. |

## Companion: MCP server for AI agents

If you want Claude, Cursor, or Cline to drive Sonar directly, install [`@sonarapp/mcp`](https://www.npmjs.com/package/@sonarapp/mcp).

## License

MIT © Peter Sutarik
