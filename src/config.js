/**
 * Configuration management for WCAG MCP Server
 */
import 'dotenv/config';

export const config = {
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Crawling
  timeout: parseInt(process.env.TIMEOUT) || 30000,
  crawlDelay: parseInt(process.env.CRAWL_DELAY) || 1000,
  userAgent: process.env.USER_AGENT || 'WCAG-Analyzer/1.0 (pa11y)',
  
  // pa11y configuration
  pa11yConfig: {
    timeout: parseInt(process.env.TIMEOUT) || 30000,
    // Wait for JavaScript to execute (important for SPAs like React, Svelte, Vue)
    wait: parseInt(process.env.PA11Y_WAIT) || 5000,
    // Wait until page is fully loaded
    // Options: 'load', 'domcontentloaded', 'networkidle0', 'networkidle2'
    waitUntil: process.env.PA11Y_WAIT_UNTIL || 'networkidle2',
    chromeLaunchConfig: {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-cache',
        '--disable-application-cache',
        '--disable-offline-load-stale-cache',
        '--disk-cache-size=0',
        '--media-cache-size=0',
        '--aggressive-cache-discard',
        '--disable-crash-reporter',
        '--no-crash-upload',
        '--no-zygote'
      ],
      headless: process.env.HEADLESS !== 'false'
    },
    standard: process.env.WCAG_STANDARD || 'WCAG2AA',
    screenCapture: false,
    includeNotices: false,
    includeWarnings: true,
    // Viewport size (helps with responsive testing)
    viewport: {
      width: parseInt(process.env.VIEWPORT_WIDTH) || 1280,
      height: parseInt(process.env.VIEWPORT_HEIGHT) || 720
    },
    // User agent
    userAgent: process.env.USER_AGENT || 'WCAG-Analyzer/1.0 (pa11y)'
  }
};

export default config;
