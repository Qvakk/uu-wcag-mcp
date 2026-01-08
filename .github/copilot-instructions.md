# WCAG Report MCP Server - Copilot Instructions

## Project Overview

This is a Model Context Protocol (MCP) server that provides WCAG (Web Content Accessibility Guidelines) compliance analysis for websites. The server uses pa11y to crawl web pages and generate comprehensive accessibility reports in multiple formats. Built with Node.js 22 and supports both HTTP (Streamable HTTP) and stdio transports.

## Architecture & Components

### Core Components

- **MCP Server** (`src/index.js`): Main MCP server with HTTP/stdio transport support
- **Web Scraper** (`src/scraper.js`): Handles webpage crawling and link discovery
- **WCAG Analyzer** (`src/analyzer.js`): Performs accessibility compliance checks using pa11y
- **Report Generator** (`src/reporter.js`): Creates reports in Markdown and Excel formats
- **WCAG Data Service** (`src/wcag-data.js`): Official W3C WCAG 2.1 data with practical templates
- **Docker Configuration** (`Dockerfile`, `docker-compose.yml`): Containerization setup

### Key Features

1. **Web Crawling**: Discovers website pages by following internal links
2. **WCAG Analysis**: Checks against WCAG 2.1 AA standards using pa11y (Norwegian legal requirement)
3. **Multi-format Reports**: Generates Markdown and Excel reports
4. **Official WCAG Data**: W3C WCAG 2.1 specification with practical implementation templates
5. **Static Code Analysis**: Check HTML code for accessibility issues before deployment
6. **ARIA Suggestions**: Get ARIA patterns for common UI components
7. **Modular Design**: Separation of concerns with clear interfaces
8. **Error Handling**: Robust error handling and logging
9. **Fresh Analysis**: No caching - always analyzes current page state
10. **Localhost Support**: Test local development servers via host.docker.internal
11. **HTTP Transport**: Streamable HTTP for VS Code MCP client integration

## Technology Stack

### Core Technologies

- **Node.js** (v22 or higher) - Runtime environment with ES modules
- **pa11y** - Accessibility testing engine (uses HTML CodeSniffer and axe-core)
- **Puppeteer** - Headless Chrome automation
- **Cheerio** - HTML parsing for link discovery
- **axios** - HTTP client for page fetching

### MCP Integration

- **@modelcontextprotocol/sdk** (v1.25+) - MCP protocol implementation
- **StreamableHTTPServerTransport** - HTTP transport for VS Code
- **StdioServerTransport** - stdio transport for CLI usage
- **Express** - HTTP server for MCP endpoint

### Report Generation

- **ExcelJS** - Excel workbook generation with UU-tilsynet templates
- **Winston** - Structured logging

## Coding Standards & Best Practices

### Node.js 22 Standards

- Use ES modules (`"type": "module"` in package.json)
- Use `import`/`export` syntax (no require/module.exports)
- Use `node:` prefix for built-in modules (`import { randomUUID } from 'node:crypto'`)
- Use async/await for asynchronous operations
- Implement proper error handling with try-catch
- Use JSDoc comments for function documentation
- Follow consistent naming conventions (camelCase for functions/variables, PascalCase for classes)

### Project Structure

```
src/
├── index.js              # Main entry point & MCP server (HTTP + stdio)
├── analyzer.js           # pa11y integration
├── scraper.js            # Web crawling logic
├── reporter.js           # Report generation (Excel)
├── wcag-data.js          # Official W3C WCAG 2.1 data + templates
├── config.js             # Configuration management
├── logger.js             # Logging setup (Winston)
└── contents/             # UU-tilsynet Excel templates
    ├── WCAG-sjekkliste-web.xlsx
    └── WCAG-sjekkliste-app.xlsx
```

### Security Considerations

- Validate and sanitize all user inputs
- Implement URL validation to prevent SSRF attacks
- Use safe HTML parsing
- Limit crawling depth and request count
- Implement timeout mechanisms
- Use environment variables for sensitive configuration
- Never expose internal paths or system information

### Error Handling Strategy

- Use custom error classes for different error types
- Implement retry mechanisms for network operations
- Graceful degradation when partial failures occur
- Comprehensive error logging with context
- User-friendly error messages in MCP responses
- Always clean up resources (browser instances, file handles)

### pa11y Best Practices

- Always create fresh browser instances for each analysis
- Configure pa11y with appropriate WCAG standard (WCAG2AA, WCAG2AAA)
- Set reasonable timeouts to prevent hanging
- Close browser instances properly after analysis
- Handle pa11y errors gracefully (timeouts, navigation failures)
- Clear browser cache between runs

### Docker Best Practices

- Multi-stage builds for smaller images
- Non-root user execution
- Health checks implementation
- Proper signal handling
- Environment-specific configurations
- Security scanning and minimal base images

## Development Guidelines

### Adding New Features

1. Create feature branch from main
2. Write tests first (TDD approach recommended)
3. Implement feature with proper error handling
4. Update documentation and JSDoc comments
5. Ensure Docker build succeeds
6. Test MCP integration end-to-end
7. Naming of functions and classes should be descriptive and follow camelCase convention.
8. Commit changes with clear messages referencing relevant issues

### Testing Strategy

- Unit tests for core business logic (Jest or Mocha)
- Integration tests for MCP server functionality
- Mock external dependencies (HTTP requests, pa11y)
- Test error scenarios and edge cases
- Performance testing for large websites

### Performance Considerations

- Reuse browser instances within a single analysis session
- Use connection pooling for HTTP requests
- Implement concurrent page analysis where possible
- Memory-efficient processing for large reports
- Configurable resource limits
- Proper cleanup of browser instances

### Documentation Requirements

- JSDoc for all exported functions
- README with usage examples
- Configuration documentation
- Deployment instructions
- Troubleshooting guide

## MCP Integration Guidelines

### Tool Design

- Clear, descriptive tool names and descriptions
- Comprehensive input validation
- Structured output formats (JSON)
- Progress reporting for long-running operations
- Proper error responses with codes and messages

### Error Response Format

```javascript
{
  "error": {
    "code": "WCAG_ANALYSIS_ERROR",
    "message": "User-friendly error description",
    "details": "Technical details for debugging"
  }
}
```

### Configuration Management

- Use environment variables for Docker deployment
- Provide sensible defaults for all configurations
- Validate configuration on startup
- Document all configuration options

## pa11y Configuration

### Standard Configuration

```javascript
{
  standard: 'WCAG2AA',  // or WCAG2A, WCAG2AAA
  timeout: 30000,
  wait: 1000,
  chromeLaunchConfig: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-cache',
      '--disk-cache-size=0'
    ],
    headless: true
  },
  screenCapture: false,
  includeNotices: false,
  includeWarnings: true
}
```

### Fresh Analysis Guarantee

- Create new browser instance for each MCP request
- Clear browser cache before each page load
- Add cache-busting parameters to URLs if needed
- Properly close browser after analysis completes

## Environment Variables

| Variable         | Description                | Default           | Required |
| ---------------- | -------------------------- | ----------------- | -------- |
| LOG_LEVEL        | Logging level              | info              | No       |
| TIMEOUT          | Request timeout (ms)       | 30000             | No       |
| CRAWL_DELAY      | Delay between crawls (ms)  | 1000              | No       |
| WCAG_STANDARD    | WCAG standard              | WCAG2AA           | No       |
| PA11Y_WAIT       | Wait time for JS/i18n (ms) | 5000              | No       |
| PA11Y_WAIT_UNTIL | Page load event            | networkidle2      | No       |
| VIEWPORT_WIDTH   | Browser viewport width     | 1280              | No       |
| VIEWPORT_HEIGHT  | Browser viewport height    | 720               | No       |
| HEADLESS         | Run browser headless       | true              | No       |
| USER_AGENT       | Custom user agent          | WCAG-Analyzer/1.0 | No       |

## Usage Examples

### Basic WCAG Analysis

```javascript
// Via MCP client
const result = await mcpClient.callTool("analyze_wcag", {
  url: "https://example.com",
  format: "markdown",
  max_depth: 2,
  language: "en",
});
```

### Localhost Testing

```javascript
const result = await mcpClient.callTool("analyze_wcag", {
  url: "http://host.docker.internal:3000",
  max_depth: 1,
  max_pages: 5,
});
```

### Static Code Analysis

```javascript
// Check HTML before deployment
const result = await mcpClient.callTool("check_html_code", {
  html: '<button><img src="icon.png"></button>',
  context: "icon button",
  language: "en"
});
```

### Get WCAG Rules

```javascript
// Get official W3C guidance with practical tips
const result = await mcpClient.callTool("get_wcag_rules", {
  topic: "1.4.3",  // or "contrast", "forms", "keyboard"
  language: "en"
});
```

### Get ARIA Suggestions

```javascript
// Get ARIA patterns for components
const result = await mcpClient.callTool("suggest_aria", {
  element: "modal",
  context: "confirmation dialog"
});
```

## MCP Tools Available

| Tool | Description |
|------|-------------|
| `analyze_wcag` | Full website analysis with crawling |
| `quick_check` | Single page quick check |
| `check_html_code` | Static HTML code analysis |
| `get_wcag_rules` | Official W3C WCAG guidelines + practical tips |
| `suggest_aria` | ARIA patterns for UI components |

## Maintenance Guidelines

### Regular Updates

- Keep pa11y and dependencies updated
- Monitor for security vulnerabilities (npm audit)
- Update WCAG rules as standards evolve
- Review and update Docker base images
- Test with latest Chromium/Puppeteer versions

### Monitoring & Logging

- Use structured logging (Winston or Pino)
- Monitor memory usage during analysis
- Track request success/failure rates
- Log performance metrics
- Alert on persistent failures

### Backup & Recovery

- Version control for all code changes
- Documented rollback procedures
- Regular dependency audits

## Migration Notes (Python → Node.js)

### Why Node.js with pa11y?

- **Better browser control**: Puppeteer provides more reliable Chrome automation
- **Active maintenance**: pa11y is actively maintained with regular updates
- **Performance**: Node.js async I/O handles concurrent operations efficiently
- **Fresh results**: Easier to ensure no caching with explicit browser control
- **Rich ecosystem**: Excellent npm packages for reporting and data processing

### Key Differences from Python Version

- Replace `axe-selenium-python` with `pa11y`
- Replace `Selenium WebDriver` with `Puppeteer`
- Replace `BeautifulSoup` with `Cheerio`
- Use `ExcelJS` instead of `pandas/openpyxl`
- Async/await throughout instead of context managers

Remember: Always prioritize accessibility, fresh analysis results, and maintainability in all development decisions.
