# WCAG Report MCP Server

Model Context Protocol (MCP) server for automated WCAG compliance analysis using **pa11y** with official **UU-tilsynet** Excel templates. Built with Node.js 22 and supports both HTTP and stdio transports.

## Features

- **Industry Standard** - Powered by pa11y (HTML CodeSniffer + axe-core)
- **Official Templates** - UU-tilsynet WCAG checklists for WEB and APP
- **Official WCAG Data** - W3C WCAG 2.1 specification with practical templates
- **Multiple Formats** - Markdown with WCAG criteria grouping, or Excel reports
- **Multi-language** - Norwegian and English support
- **HTTP Transport** - Streamable HTTP for VS Code MCP client
- **Docker Ready** - Containerized with Google Chrome
- **Localhost Testing** - Test local development servers
- **SPA Optimized** - Special configuration for React, Vue, Svelte, Angular
- **Static Code Analysis** - Check HTML code for accessibility before deployment
- **i18n Support** - Waits for translations to load before analysis

## Quick Start

```bash
# Clone and start
git clone <repository-url>
cd uu-wcag-mcp
docker compose up -d --build
```

**Note:** Default configuration uses 8-second wait with networkidle0. For simpler sites, reduce `PA11Y_WAIT` to 5000 in `docker-compose.yml`.

### Add to VS Code MCP Settings

Add to your MCP settings (Ctrl+Shift+P → "MCP: Edit Settings"):

```json
{
  "mcpServers": {
    "uu-wcag-mcp": {
      "type": "http",
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

**Alternative (stdio mode):**
```json
{
  "mcpServers": {
    "uu-wcag-mcp": {
      "type": "stdio",
      "command": "docker",
      "args": ["exec", "-i", "uu-wcag-mcp", "node", "src/index.js"]
    }
  }
}
```

## MCP Tools

### `analyze_wcag`
Full WCAG analysis with page crawling and official UU-tilsynet templates.

**Parameters:**
```json
{
  "url": "https://example.com",
  "max_depth": 2,
  "max_pages": 10,
  "format": "markdown",
  "language": "no",
  "checklist_type": "WEB",
  "standard": "WCAG2AA"
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | *required* | Website URL to analyze |
| `max_depth` | number | 2 | Maximum crawl depth |
| `max_pages` | number | 10 | Maximum pages to analyze |
| `format` | string | `markdown` | Report format: `markdown` or `excel` |
| `language` | string | `no` | Report language: `no` or `en` |
| `checklist_type` | string | `WEB` | Excel template: `WEB` or `APP` |
| `standard` | string | `WCAG2AA` | WCAG level: `WCAG2A`, `WCAG2AA`, or `WCAG2AAA` |

**Excel Report Example:**
```json
{
  "url": "https://vg.no",
  "format": "excel",
  "checklist_type": "WEB",
  "max_pages": 20,
  "language": "no"
}
```

### `quick_check`
Quick single-page WCAG check (no crawling).

**Parameters:**
```json
{
  "url": "https://example.com",
  "language": "en",
  "standard": "WCAG2AA"
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | *required* | Page URL to check |
| `language` | string | `no` | Report language: `no` or `en` |
| `standard` | string | `WCAG2AA` | WCAG level: `WCAG2A`, `WCAG2AA`, or `WCAG2AAA` |

### `check_html_code`
Analyze HTML code snippets for WCAG accessibility issues **before deployment**. Returns actionable suggestions.

**Parameters:**
```json
{
  "html": "<button>Click me</button><img src='photo.jpg'>",
  "context": "navigation menu",
  "language": "en"
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `html` | string | *required* | HTML code to analyze |
| `context` | string | - | Optional context (e.g., "login form") |
| `language` | string | `en` | Report language: `no` or `en` |

### `get_wcag_rules`
Get official W3C WCAG guidelines with practical guidance for a specific criterion or topic.

**Parameters:**
```json
{
  "topic": "1.4.3",
  "language": "en"
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `topic` | string | *required* | WCAG criterion (1.4.3) or topic (images, forms, keyboard) |
| `language` | string | `en` | Report language: `no` or `en` |

**Available topics:** `images`, `forms`, `keyboard`, `aria`, `color-contrast`, `focus`, `headings`, `links`, `video`, `audio`, `navigation`, `mobile`, `touch`

### `suggest_aria`
Get ARIA attribute suggestions for HTML elements and components.

**Parameters:**
```json
{
  "element": "modal",
  "context": "confirmation dialog"
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `element` | string | *required* | Element type: `modal`, `dropdown`, `tabs`, `accordion`, `button`, `navigation`, `alert`, `tooltip`, `combobox`, `tree` |
| `context` | string | - | Additional context about the use case |

## Localhost Testing

To test local servers, use `host.docker.internal` instead of `localhost`:

```json
{
  "url": "http://host.docker.internal:3000"
}
```

## Report Formats

### Markdown Report
Text-based report with WCAG criteria grouping:
- WCAG success criteria summary (1.1.1, 2.4.2, etc.)
- Detailed issue breakdown by criteria
- Severity counts (Critical, Serious, Moderate, Minor)
- Page-by-page results

**Example:**
```markdown
## WCAG Success Criteria Violations

[ERROR] **2.4.2** - Error (3 issues)
[WARNING] **1.4.3** - Warning (5 issues)

### 2.4.2

[ERROR] Page title is missing or empty
```

### Excel Report (UU-tilsynet Official Templates)
Downloadable `.xlsx` file with Norwegian UU-tilsynet checklist:
- Official WCAG checklist template
- Color-coded status cells (Red=Error, Orange=Warning, Green=Pass)
- Cell comments with violation details
- Disclaimer sheet about automated testing
- Choose `WEB` or `APP` template via `checklist_type`

**Templates:**
- `WCAG-sjekkliste-web.xlsx` - Web applications (997 rows)
- `WCAG-sjekkliste-app.xlsx` - Mobile apps (993 rows)

### Windows Firewall Setup

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Dev Server 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Linux Firewall Setup

```bash
sudo ufw allow 3000/tcp
```

## Docker Commands

```bash
# Start
docker compose up -d

# Rebuild
docker compose down && docker compose build --no-cache && docker compose up -d

# View logs
docker logs --tail 100 uu-wcag-mcp

# Debug
docker exec -it uu-wcag-mcp /bin/bash

# Health check
curl http://localhost:3100/health
```

## Configuration

Environment variables (optional `.env` or `docker-compose.yml`):

```bash
# Logging
LOG_LEVEL=info

# Crawling settings
CRAWL_DELAY=1000

# pa11y configuration
TIMEOUT=60000
WCAG_STANDARD=WCAG2AA
HEADLESS=true

# SPA/i18n support
PA11Y_WAIT=5000                    # Wait 5 seconds for JS/translations (increase for slow SPAs)
PA11Y_WAIT_UNTIL=networkidle2      # Wait for network idle (use networkidle0 for stricter wait)

# Viewport
VIEWPORT_WIDTH=1280
VIEWPORT_HEIGHT=720

# User agent
USER_AGENT=WCAG-Analyzer/1.0 (pa11y)
```

**Default Configuration:** Works well for most sites. For complex SPAs with i18n, increase `PA11Y_WAIT` to 8000ms and use `networkidle0`.

## Important Notes

### Automated Testing Limitations

**Automated tools detect only ~30-40% of accessibility issues!**

- Use this tool for **quick screening**
- **Always manually verify** findings
- Test with **real screen readers** (NVDA, JAWS, VoiceOver)
- Perform **keyboard navigation testing**
- Conduct **user testing** with people with disabilities

**Common false positives:**
- Empty titles in SPAs (React/Svelte/Vue) before JavaScript loads
- Dynamic content not yet rendered
- Timing issues with slow networks

**Solution:** The default configuration already waits 8 seconds with `PA11Y_WAIT=8000` and `PA11Y_WAIT_UNTIL=networkidle0`, which handles most SPAs and i18n scenarios. If issues persist, check your app's actual DOM state.

**See [docs/FALSE_POSITIVES.md](docs/FALSE_POSITIVES.md) for detailed guidance**

### WCAG Versions

| Standard | Description |
|----------|-------------|
| WCAG2AA | **WCAG 2.1 Level AA** (Norwegian law requirement - default) |
| WCAG2A | WCAG 2.1 Level A (minimum) |
| WCAG2AAA | WCAG 2.1 Level AAA (strict, optional) |

**Note:** WCAG 2.2 (2023) is not yet required by Norwegian law.

## MCP Tools Summary

| Tool | Description |
|------|-------------|
| `analyze_wcag` | Full website analysis with crawling and Excel reports |
| `quick_check` | Single page quick WCAG check |
| `check_html_code` | Static HTML code analysis before deployment |
| `get_wcag_rules` | Official W3C WCAG 2.1 guidelines + practical tips |
| `suggest_aria` | ARIA patterns for common UI components |

## Project Structure

```
uu-wcag-mcp/
├── src/
│   ├── index.js              # MCP server (HTTP + stdio transport)
│   ├── analyzer.js           # pa11y WCAG analysis
│   ├── scraper.js            # Web crawling
│   ├── reporter.js           # Excel report generation
│   ├── wcag-data.js          # W3C WCAG 2.1 data + templates
│   ├── config.js             # Configuration
│   ├── logger.js             # Winston logging
│   └── contents/             # UU-tilsynet Excel templates
│       ├── WCAG-sjekkliste-web.xlsx
│       └── WCAG-sjekkliste-app.xlsx
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Container configuration
├── package.json              # Node.js 22+ dependencies
└── README.md
```