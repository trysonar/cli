# Sonar CLI

Command-line tool for App Store Optimization. Research keywords, track rankings, and analyze competitors for iOS App Store and Google Play.

Built for [Sonar](https://trysonar.app) — the ASO platform for indie app developers.

## Install

```bash
npm install -g sonar-aso
```

Or run without installing:

```bash
npx sonar-aso <command>
```

## Quick Start

```bash
# Authenticate with your API key
sonar auth login

# Search keywords with difficulty scores
sonar keywords search "recipe app" --store ios

# Get autocomplete suggestions
sonar keywords suggestions "fitness" --store ios

# List your tracked apps
sonar apps list

# Check rank history
sonar rankings <app-id> --days 7

# Export to CSV
sonar export rankings <app-id> --format csv --output rankings.csv
```

## Commands

### `sonar auth`

```bash
sonar auth login              # Save your API key
sonar auth status             # Show key + remaining quota
sonar auth logout             # Remove saved credentials
```

### `sonar apps`

```bash
sonar apps list               # List all tracked apps
sonar apps get <id>           # App details + latest snapshot
```

### `sonar keywords`

```bash
sonar keywords search <query> --store ios       # Keyword research (difficulty, popularity)
sonar keywords search <query> --store android --country de
sonar keywords list <app-id>                    # List tracked keywords (auto-paginates)
sonar keywords suggestions <seed> --store ios   # Autocomplete suggestions
```

### `sonar rankings`

```bash
sonar rankings <app-id>                         # Rank history (default: 30 days)
sonar rankings <app-id> --days 7                # Last 7 days
sonar rankings <app-id> --keyword <keyword-id>  # Filter by keyword
sonar rankings keyword <keyword-id>             # SERP history for a keyword
```

### `sonar competitors`

```bash
sonar competitors keywords <competitor-id>              # Competitor's keywords
sonar competitors keywords <competitor-id> --app <id>   # Gap analysis vs your app
```

### `sonar export`

```bash
sonar export rankings <app-id> --format csv             # CSV to stdout
sonar export rankings <app-id> --format csv -o data.csv # CSV to file
sonar export rankings <app-id> --format json            # JSON output
```

## Output Formats

**JSON** (default) — pipe into `jq` or other tools:

```bash
sonar apps list | jq '.data[].name'
```

**Table** — human-readable with color-coded difficulty (green/yellow/red):

```bash
sonar keywords search "photo editor" --store ios --table
```

## Global Flags

| Flag | Description |
|-|-|
| `--table` | Formatted table output instead of JSON |
| `--verbose` | Show request URL, timing, and rate limit info |
| `--base-url <url>` | Override API base URL |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

## Configuration

Config is saved to `~/.config/sonar/config.json` with `0600` permissions.

### Environment Variables

| Variable | Description |
|-|-|
| `SONAR_API_KEY` | API key (overrides saved config) |
| `SONAR_API_URL` | Base URL (overrides saved config) |

Use environment variables for CI/CD:

```bash
SONAR_API_KEY=aso_xxx sonar apps list
```

## API Key

Get your API key at [trysonar.app/developers](https://trysonar.app/developers). Included with every Sonar subscription.

## License

MIT
