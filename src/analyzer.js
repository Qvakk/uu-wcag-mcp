/**
 * WCAG Analyzer using pa11y
 */
import pa11y from 'pa11y';
import puppeteer from 'puppeteer';
import config from './config.js';
import logger from './logger.js';

export class WCAGAnalyzer {
  constructor(standard = 'WCAG2AA') {
    this.browser = null;
    this.standard = standard;
  }

  /**
   * Initialize browser instance
   */
  async init() {
    if (!this.browser) {
      logger.info('Launching Puppeteer browser...');
      this.browser = await puppeteer.launch(config.pa11yConfig.chromeLaunchConfig);
      logger.info('Browser launched successfully');
    }
  }

  /**
   * Analyze a single page
   * @param {string} url - URL to analyze
   * @returns {Promise<Object>} Analysis results
   */
  async analyzePage(url) {
    try {
      await this.init();
      
      logger.info(`Analyzing page: ${url}`);
      logger.info(`Timestamp: ${new Date().toISOString()}`);

      // Add cache-busting parameter
      const cacheBustUrl = this._addCacheBuster(url);
      logger.debug(`Cache-bust URL: ${cacheBustUrl}`);

      // Run pa11y analysis with SPA-friendly settings
      const results = await pa11y(cacheBustUrl, {
        ...config.pa11yConfig,
        standard: this.standard,
        browser: this.browser,
        // Wait for network to be idle (important for SPAs with i18n)
        waitUntil: config.pa11yConfig.waitUntil,
        log: {
          debug: (msg) => logger.debug(msg),
          error: (msg) => logger.error(msg),
          info: (msg) => logger.info(msg)
        }
      });

      // Group issues by type to avoid duplicates
      const groupedIssues = this._groupIssuesByType(results.issues);

      logger.info(`Analysis complete: ${groupedIssues.length} unique issue types found`);
      
      return {
        url,
        pageTitle: results.pageTitle || '',
        issues: groupedIssues,
        totalIssues: results.issues.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Analysis failed for ${url}: ${error.message}`);
      throw new Error(`Failed to analyze ${url}: ${error.message}`);
    }
  }

  /**
   * Analyze multiple pages
   * @param {string[]} urls - Array of URLs to analyze
   * @returns {Promise<Object>} Complete website analysis
   */
  async analyzeWebsite(urls) {
    try {
      // Deduplicate URLs
      const uniqueUrls = [...new Set(urls)];
      if (uniqueUrls.length < urls.length) {
        logger.warn(`Removed ${urls.length - uniqueUrls.length} duplicate URLs`);
      }

      logger.info(`Starting website analysis for ${uniqueUrls.length} pages`);
      
      const pageAnalyses = [];
      const failedPages = [];
      let allIssues = [];

      for (let i = 0; i < uniqueUrls.length; i++) {
        const url = uniqueUrls[i];
        try {
          logger.info(`[${i + 1}/${uniqueUrls.length}] Analyzing: ${url}`);
          const analysis = await this.analyzePage(url);
          pageAnalyses.push(analysis);
          allIssues = allIssues.concat(analysis.issues);
          
          logger.info(`✓ Found ${analysis.issues.length} unique issue types`);
        } catch (error) {
          logger.error(`✗ Failed: ${error.message}`);
          failedPages.push({ url, error: error.message });
        }
      }

      // Calculate statistics
      const issuesByImpact = this._groupIssuesByImpact(allIssues);
      
      return {
        baseUrl: uniqueUrls[0] || '',
        pagesAnalyzed: pageAnalyses.length,
        totalIssues: allIssues.length,
        pageAnalyses,
        issuesByImpact,
        failedPages,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Website analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Group issues by type to avoid duplicates
   * @private
   */
  _groupIssuesByType(issues) {
    const grouped = {};
    
    for (const issue of issues) {
      const key = `${issue.code}_${issue.type}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          code: issue.code,
          type: issue.type,
          typeCode: issue.typeCode,
          message: issue.message,
          context: issue.context,
          selector: issue.selector,
          runner: issue.runner,
          runnerExtras: issue.runnerExtras,
          elements: []
        };
      }
      
      grouped[key].elements.push({
        selector: issue.selector,
        context: issue.context
      });
    }

    // Convert to array and add element count
    return Object.values(grouped).map(issue => ({
      ...issue,
      affectedElements: issue.elements.length,
      message: `${issue.message} (Affects ${issue.elements.length} element${issue.elements.length > 1 ? 's' : ''})`
    }));
  }

  /**
   * Group issues by impact level
   * @private
   */
  _groupIssuesByImpact(issues) {
    const impact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    
    for (const issue of issues) {
      const type = issue.type?.toLowerCase() || 'notice';
      if (type === 'error') impact.critical++;
      else if (type === 'warning') impact.serious++;
      else impact.moderate++;
    }
    
    return impact;
  }

  /**
   * Add cache-busting parameter to URL
   * @private
   */
  _addCacheBuster(url) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('_wcag_cache_bust', Date.now());
      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original
      return url;
    }
  }

  /**
   * Close browser and cleanup
   */
  async close() {
    if (this.browser) {
      logger.info('Closing browser...');
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed successfully');
    }
  }
}

export default WCAGAnalyzer;
