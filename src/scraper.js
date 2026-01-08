/**
 * Web scraper for discovering pages
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'node:url';
import config from './config.js';
import logger from './logger.js';

export class WebScraper {
  constructor() {
    this.visited = new Set();
  }

  /**
   * Discover pages starting from a URL
   * @param {string} startUrl - Starting URL
   * @param {number} maxDepth - Maximum crawl depth
   * @param {number} maxPages - Maximum pages to discover
   * @returns {Promise<string[]>} List of discovered URLs
   */
  async discoverPages(startUrl, maxDepth = 2, maxPages = 10) {
    try {
      logger.info(`Discovering pages from ${startUrl} (max_depth=${maxDepth}, max_pages=${maxPages})`);
      
      const baseDomain = new URL(startUrl).hostname;
      logger.info(`Base domain: ${baseDomain}`);
      
      const pages = [startUrl];
      let toCrawl = [startUrl];
      this.visited = new Set();

      for (let depth = 0; depth < maxDepth; depth++) {
        if (pages.length >= maxPages || toCrawl.length === 0) {
          break;
        }

        logger.info(`Crawl depth ${depth + 1}/${maxDepth}: Checking ${toCrawl.length} pages for links`);
        const nextToCrawl = [];

        for (const page of toCrawl) {
          if (this.visited.has(page) || pages.length >= maxPages) {
            continue;
          }

          try {
            this.visited.add(page);
            const links = await this._extractLinks(page, baseDomain);
            logger.info(`  Found ${links.length} links on ${page}`);

            for (const link of links) {
              if (!pages.includes(link) && pages.length < maxPages) {
                pages.push(link);
                nextToCrawl.push(link);
                logger.info(`    + Added: ${link}`);
              }
            }

            // Delay between requests
            await this._delay(config.crawlDelay);
          } catch (error) {
            logger.warn(`  Failed to extract links from ${page}: ${error.message}`);
          }
        }

        toCrawl = nextToCrawl;
      }

      // Deduplicate
      const uniquePages = [...new Set(pages)];
      if (uniquePages.length < pages.length) {
        logger.info(`Removed ${pages.length - uniquePages.length} duplicate URLs`);
      }

      logger.info(`Discovered ${uniquePages.length} pages`);
      return uniquePages.slice(0, maxPages);
    } catch (error) {
      logger.error(`Page discovery failed: ${error.message}`);
      throw new Error(`Failed to discover pages: ${error.message}`);
    }
  }

  /**
   * Extract links from a page
   * @private
   */
  async _extractLinks(url, baseDomain) {
    try {
      const response = await axios.get(url, {
        timeout: config.timeout,
        headers: {
          'User-Agent': config.userAgent
        },
        validateStatus: (status) => status === 200
      });

      const $ = cheerio.load(response.data);
      const links = [];

      $('a[href]').each((_, element) => {
        try {
          const href = $(element).attr('href');
          const absoluteUrl = new URL(href, url);

          // Filter same-domain links
          if (absoluteUrl.hostname === baseDomain && 
              (absoluteUrl.protocol === 'http:' || absoluteUrl.protocol === 'https:')) {
            // Remove fragments
            absoluteUrl.hash = '';
            const cleanUrl = absoluteUrl.toString();
            links.push(cleanUrl);
          }
        } catch {
          // Skip invalid URLs
        }
      });

      return [...new Set(links)];
    } catch (error) {
      logger.debug(`Failed to extract links from ${url}: ${error.message}`);
      return [];
    }
  }

  /**
   * Delay helper
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default WebScraper;
