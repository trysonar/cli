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

Get an API key at [trysonar.app/developers](https://trysonar.app/developers) (requires a Sonar subscription — 7-day free trial available).

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

# Track a keyword's ranking history
sonar rankings <app-id> --table

# Estimate monthly revenue
sonar revenue --store ios --id 1450772168 --table

# Export rankings to CSV
sonar export rankings <app-id> --format csv > rankings.csv
```

Add `--table` for human-readable tables. Default output is JSON, ready to pipe into `jq`, `fx`, or other tools.

## Commands

```
sonar auth login                              Authenticate with your API key
sonar auth status                             Show authentication status
sonar auth logout                             Remove saved credentials

sonar apps list                               List your tracked apps
sonar apps get <id>                           Show app details
sonar apps lookup <store-id>                  Look up any app by store ID
sonar apps search <query>                     Search apps in a store
sonar apps score <store-id>                   ASO audit score (0-100)
sonar apps extract-keywords <store-id>        Keywords from an app's metadata
sonar apps reviews <store-id>                 Fetch app reviews
sonar apps changes <id>                       Change history for a tracked app

sonar keywords search <query>                 Keyword research (volume, difficulty)
sonar keywords list <app-id>                  Keywords your app ranks for
sonar keywords metrics <keywords...>          Difficulty + popularity (single or bulk)
sonar keywords suggestions <seed>             Autocomplete suggestions
sonar keywords track <app-id> <keywords...>   Start tracking keywords ✏️
sonar keywords note <tracked-keyword-id>      Set or clear a keyword note ✏️

sonar rankings <app-id>                       Rank history for an app
sonar rankings keyword <keyword-id>           Apps ranking for a keyword

sonar competitors keywords <competitor-id>    Competitor keyword analysis
sonar competitors scan <competitor-id>        Discover competitor keywords ✏️

sonar products create                         Create a product, start tracking ✏️
sonar products add-app <product-id>           Link the second-store version ✏️
sonar products add-competitor <product-id>    Track a competitor ✏️

sonar revenue --store <ios|android> --id <id> Estimate monthly revenue

sonar export rankings <app-id>                Export rankings to CSV/JSON
```

Run `sonar <command> --help` for full options.

Commands marked ✏️ mutate your workspace and require an API key created with the **`write` scope** plus a Full plan (an active trial counts). The rest work with the default `read` scope.

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
| `SONAR_API_URL` | API base URL. Default `https://trysonar.app`. |
| `SONAR_CONFIG_PATH` | Path to the config file. Default `~/.config/sonar/config.json`. |

## Companion: MCP server for AI agents

If you want Claude, Cursor, or Cline to drive Sonar directly, install [`@sonarapp/mcp`](https://www.npmjs.com/package/@sonarapp/mcp).

## License

MIT © Peter Sutarik
