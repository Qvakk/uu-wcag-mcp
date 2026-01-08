/**
 * WCAG MCP Server - Main entry point
 * Supports both stdio and HTTP/SSE transports
 */
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import WCAGAnalyzer from './analyzer.js';
import logger from './logger.js';
import ExcelReporter from './reporter.js';
import WebScraper from './scraper.js';
import wcagDataService from './wcag-data.js';

// Convert localhost to host.docker.internal for Docker
function convertLocalhostUrl(url) {
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return url
      .replace('localhost', 'host.docker.internal')
      .replace('127.0.0.1', 'host.docker.internal');
  }
  return url;
}

class WCAGMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'uu-tilsynet',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_wcag',
          description: 'Analyze website for WCAG compliance with crawling',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Website URL to analyze',
              },
              max_depth: {
                type: 'number',
                description: 'Maximum crawl depth (default: 2)',
                default: 2,
              },
              max_pages: {
                type: 'number',
                description: 'Maximum pages to analyze (default: 10)',
                default: 10,
              },
              checklist_type: {
                type: 'string',
                enum: ['WEB', 'APP'],
                description: 'Checklist type for Excel reports (default: WEB)',
                default: 'WEB',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'excel'],
                description: 'Report format (default: markdown)',
                default: 'markdown',
              },
              language: {
                type: 'string',
                enum: ['no', 'en'],
                description: 'Report language (default: no)',
                default: 'no',
              },
              standard: {
                type: 'string',
                enum: ['WCAG2A', 'WCAG2AA', 'WCAG2AAA'],
                description: 'WCAG standard level: WCAG2A, WCAG2AA (default, Norwegian legal requirement), or WCAG2AAA',
                default: 'WCAG2AA',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'quick_check',
          description: 'Quick WCAG check for a single page',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Page URL to check',
              },
              language: {
                type: 'string',
                enum: ['no', 'en'],
                description: 'Report language (default: no)',
                default: 'no',
              },
              standard: {
                type: 'string',
                enum: ['WCAG2A', 'WCAG2AA', 'WCAG2AAA'],
                description: 'WCAG standard level (default: WCAG2AA)',
                default: 'WCAG2AA',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'check_html_code',
          description: 'Analyze HTML code snippet for WCAG accessibility issues. Use this BEFORE deploying to find and fix issues in your code. Returns actionable suggestions for the AI agent to fix.',
          inputSchema: {
            type: 'object',
            properties: {
              html: {
                type: 'string',
                description: 'HTML code to analyze for accessibility issues',
              },
              context: {
                type: 'string',
                description: 'Optional context about the component (e.g., "navigation menu", "login form")',
              },
              language: {
                type: 'string',
                enum: ['no', 'en'],
                description: 'Report language (default: en)',
                default: 'en',
              },
            },
            required: ['html'],
          },
        },
        {
          name: 'get_wcag_rules',
          description: 'Get WCAG guidelines and best practices for a specific criterion or topic. Useful for understanding requirements before writing accessible code.',
          inputSchema: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'WCAG topic or criterion (e.g., "images", "forms", "color-contrast", "1.1.1", "keyboard", "aria")',
              },
              language: {
                type: 'string',
                enum: ['no', 'en'],
                description: 'Response language (default: en)',
                default: 'en',
              },
            },
            required: ['topic'],
          },
        },
        {
          name: 'suggest_aria',
          description: 'Get ARIA attribute suggestions for a specific HTML element or component type. Helps ensure proper semantic markup.',
          inputSchema: {
            type: 'object',
            properties: {
              element: {
                type: 'string',
                description: 'HTML element or component type (e.g., "modal", "dropdown", "tabs", "accordion", "button", "navigation")',
              },
              context: {
                type: 'string',
                description: 'Additional context about the use case',
              },
            },
            required: ['element'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === 'analyze_wcag') {
          return await this.analyzeWCAG(args);
        } else if (name === 'quick_check') {
          return await this.quickCheck(args);
        } else if (name === 'check_html_code') {
          return await this.checkHtmlCode(args);
        } else if (name === 'get_wcag_rules') {
          return await this.getWcagRules(args);
        } else if (name === 'suggest_aria') {
          return await this.suggestAria(args);
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Tool execution error: ${error.message}`);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async analyzeWCAG(args) {
    const { url, max_depth = 2, max_pages = 10, format = 'markdown', language = 'no', checklist_type = 'WEB', standard = 'WCAG2AA' } = args;
    
    const convertedUrl = convertLocalhostUrl(url);
    if (convertedUrl !== url) {
      logger.info(`Converted URL: ${url} → ${convertedUrl}`);
    }

    logger.info(`Starting WCAG analysis for ${convertedUrl}`);

    // Step 1: Discover pages
    logger.info('📡 Step 1/3: Discovering pages...');
    const scraper = new WebScraper();
    const pages = await scraper.discoverPages(convertedUrl, max_depth, max_pages);

    logger.info(`✅ Found ${pages.length} pages to analyze`);

    // Step 2: Analyze pages
    logger.info(`🔍 Step 2/3: Analyzing pages with pa11y (${standard})...`);
    const analyzer = new WCAGAnalyzer(standard);
    try {
      const analysis = await analyzer.analyzeWebsite(pages);

      // Step 3: Generate report
      logger.info('✅ Step 3/3: Analysis complete!');
      logger.info(`   Total issues found: ${analysis.totalIssues}`);
      logger.info(`   Pages analyzed: ${analysis.pagesAnalyzed}`);

      if (format === 'excel') {
        // Generate Excel report
        const reporter = new ExcelReporter();
        const workbook = await reporter.generateReport(analysis, checklist_type);
        const buffer = await workbook.xlsx.writeBuffer();
        
        const filename = `WCAG-report-${checklist_type}-${new Date().toISOString().split('T')[0]}.xlsx`;
        logger.info(`Excel report ready: ${filename}`);
        
        return {
          content: [
            {
              type: 'resource',
              resource: {
                uri: `file:///${filename}`,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                blob: buffer.toString('base64')
              }
            },
            {
              type: 'text',
              text: `📊 Excel-rapport generert: ${filename}\n\nSider analysert: ${analysis.pagesAnalyzed}\nProblemer funnet: ${analysis.totalIssues}`
            }
          ],
        };
      } else {
        // Simple markdown report
        const report = this._generateMarkdownReport(analysis, language);

        return {
          content: [
            {
              type: 'text',
              text: report,
            },
          ],
        };
      }
    } finally {
      await analyzer.close();
    }
  }

  async quickCheck(args) {
    const { url, language = 'no', standard = 'WCAG2AA' } = args;
    
    const convertedUrl = convertLocalhostUrl(url);
    if (convertedUrl !== url) {
      logger.info(`Converted URL: ${url} → ${convertedUrl}`);
    }

    logger.info(`Quick check for ${convertedUrl} (${standard})`);

    const analyzer = new WCAGAnalyzer(standard);
    try {
      const analysis = await analyzer.analyzePage(convertedUrl);
      const report = this._generateQuickReport(analysis, language);

      return {
        content: [
          {
            type: 'text',
            text: report,
          },
        ],
      };
    } finally {
      await analyzer.close();
    }
  }

  async checkHtmlCode(args) {
    const { html, context = '', language = 'en' } = args;
    
    logger.info(`Checking HTML code for accessibility issues${context ? ` (context: ${context})` : ''}`);
    
    const issues = [];
    const suggestions = [];
    
    // Static analysis rules
    const rules = [
      // Images
      {
        pattern: /<img(?![^>]*alt=)[^>]*>/gi,
        issue: 'Image missing alt attribute',
        wcag: '1.1.1',
        fix: 'Add alt="" for decorative images or alt="description" for informative images',
        severity: 'error'
      },
      {
        pattern: /<img[^>]*alt=["']\s*["'][^>]*>/gi,
        issue: 'Image has empty alt attribute - verify if decorative',
        wcag: '1.1.1',
        fix: 'If image conveys information, add descriptive alt text. Empty alt is only for decorative images.',
        severity: 'warning'
      },
      // Form inputs
      {
        pattern: /<input(?![^>]*(?:aria-label|aria-labelledby|id=[^>]*<label))(?![^>]*type=["'](?:submit|button|reset|hidden)["'])[^>]*>/gi,
        issue: 'Form input may be missing accessible label',
        wcag: '1.3.1, 4.1.2',
        fix: 'Add a <label> element with for attribute, or use aria-label/aria-labelledby',
        severity: 'warning'
      },
      // Buttons
      {
        pattern: /<button[^>]*>\s*<\/button>/gi,
        issue: 'Empty button element',
        wcag: '4.1.2',
        fix: 'Add text content, aria-label, or aria-labelledby to the button',
        severity: 'error'
      },
      {
        pattern: /<button[^>]*>\s*<(?:img|svg|i|span)[^>]*>\s*<\/button>/gi,
        issue: 'Button with only icon/image - may need accessible name',
        wcag: '4.1.2',
        fix: 'Add aria-label to button or alt text to image inside',
        severity: 'warning'
      },
      // Links
      {
        pattern: /<a[^>]*href[^>]*>\s*<\/a>/gi,
        issue: 'Empty link element',
        wcag: '2.4.4',
        fix: 'Add descriptive link text or aria-label',
        severity: 'error'
      },
      {
        pattern: /<a[^>]*>(?:click here|read more|learn more|here)<\/a>/gi,
        issue: 'Non-descriptive link text',
        wcag: '2.4.4',
        fix: 'Use descriptive text that makes sense out of context, e.g., "Read more about accessibility"',
        severity: 'warning'
      },
      // Headings
      {
        pattern: /<h1[^>]*>.*<\/h1>.*<h1[^>]*>/gis,
        issue: 'Multiple h1 elements detected',
        wcag: '1.3.1',
        fix: 'Use only one h1 per page. Use h2-h6 for subsections.',
        severity: 'warning'
      },
      // Color and contrast
      {
        pattern: /color:\s*#([0-9a-f]{3}|[0-9a-f]{6})\s*;[^}]*(?!background)/gi,
        issue: 'Text color set without background - check contrast',
        wcag: '1.4.3',
        fix: 'Ensure text has minimum 4.5:1 contrast ratio with background',
        severity: 'info'
      },
      // Tables
      {
        pattern: /<table(?![^>]*role=["']presentation["'])[^>]*>(?![^<]*<th)/gi,
        issue: 'Data table missing header cells',
        wcag: '1.3.1',
        fix: 'Add <th> elements with scope attribute for row/column headers',
        severity: 'warning'
      },
      // ARIA
      {
        pattern: /role=["']button["'][^>]*(?!tabindex)/gi,
        issue: 'Element with role="button" may need tabindex',
        wcag: '2.1.1',
        fix: 'Add tabindex="0" to make it keyboard focusable',
        severity: 'warning'
      },
      {
        pattern: /aria-hidden=["']true["'][^>]*(?:tabindex|href|onclick)/gi,
        issue: 'Interactive element hidden from assistive technology',
        wcag: '4.1.2',
        fix: 'Remove aria-hidden or make element non-interactive',
        severity: 'error'
      },
      // Focus
      {
        pattern: /outline:\s*(?:none|0)[^;]*;/gi,
        issue: 'Focus outline removed',
        wcag: '2.4.7',
        fix: 'Provide visible focus indicator. Never remove outline without alternative.',
        severity: 'error'
      },
      // Language
      {
        pattern: /<html(?![^>]*lang=)[^>]*>/gi,
        issue: 'Missing lang attribute on html element',
        wcag: '3.1.1',
        fix: 'Add lang attribute, e.g., <html lang="en"> or <html lang="nb">',
        severity: 'error'
      },
      // Semantic HTML
      {
        pattern: /<div[^>]*onclick[^>]*>/gi,
        issue: 'Div with onclick - consider using button',
        wcag: '4.1.2',
        fix: 'Use <button> instead of <div> for clickable elements',
        severity: 'warning'
      },
      {
        pattern: /<span[^>]*onclick[^>]*>/gi,
        issue: 'Span with onclick - consider using button or link',
        wcag: '4.1.2',
        fix: 'Use <button> or <a> instead of <span> for interactive elements',
        severity: 'warning'
      }
    ];
    
    // Run all rules
    for (const rule of rules) {
      const matches = html.match(rule.pattern);
      if (matches) {
        issues.push({
          severity: rule.severity,
          wcag: rule.wcag,
          issue: rule.issue,
          fix: rule.fix,
          occurrences: matches.length,
          examples: matches.slice(0, 2).map(m => m.substring(0, 100) + (m.length > 100 ? '...' : ''))
        });
      }
    }
    
    // Generate report
    const t = language === 'en' ? {
      title: 'HTML Accessibility Analysis',
      noIssues: 'No obvious accessibility issues detected in the code.',
      issuesFound: 'issues found',
      severity: 'Severity',
      wcagCriteria: 'WCAG',
      howToFix: 'How to fix',
      occurrences: 'Occurrences',
      examples: 'Examples in code',
      note: 'Note: This is static analysis. Always test with screen readers and keyboard navigation.',
      error: 'Error',
      warning: 'Warning',
      info: 'Info'
    } : {
      title: 'HTML Tilgjengelighetsanalyse',
      noIssues: 'Ingen åpenbare tilgjengelighetsproblemer funnet i koden.',
      issuesFound: 'problemer funnet',
      severity: 'Alvorlighet',
      wcagCriteria: 'WCAG',
      howToFix: 'Slik fikser du',
      occurrences: 'Forekomster',
      examples: 'Eksempler i koden',
      note: 'Merk: Dette er statisk analyse. Test alltid med skjermleser og tastaturnavigasjon.',
      error: 'Feil',
      warning: 'Advarsel',
      info: 'Info'
    };
    
    let report = `# ${t.title}\n\n`;
    
    if (context) {
      report += `**Context:** ${context}\n\n`;
    }
    
    if (issues.length === 0) {
      report += `✅ ${t.noIssues}\n\n`;
    } else {
      const errors = issues.filter(i => i.severity === 'error');
      const warnings = issues.filter(i => i.severity === 'warning');
      const infos = issues.filter(i => i.severity === 'info');
      
      report += `**${issues.length} ${t.issuesFound}:** `;
      report += `🔴 ${errors.length} ${t.error}, `;
      report += `🟡 ${warnings.length} ${t.warning}, `;
      report += `🔵 ${infos.length} ${t.info}\n\n`;
      
      for (const issue of issues) {
        const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
        report += `## ${icon} ${issue.issue}\n\n`;
        report += `- **${t.wcagCriteria}:** ${issue.wcag}\n`;
        report += `- **${t.occurrences}:** ${issue.occurrences}\n`;
        report += `- **${t.howToFix}:** ${issue.fix}\n`;
        if (issue.examples.length > 0) {
          report += `- **${t.examples}:**\n`;
          for (const ex of issue.examples) {
            report += `  \`\`\`html\n  ${ex}\n  \`\`\`\n`;
          }
        }
        report += '\n';
      }
    }
    
    report += `---\n*${t.note}*\n`;
    
    return {
      content: [{ type: 'text', text: report }],
    };
  }

  async getWcagRules(args) {
    const { topic, language = 'en' } = args;
    
    logger.info(`Getting WCAG rules for topic: ${topic}`);
    
    // Use the wcag-data service to get official W3C data combined with templates
    const results = wcagDataService.searchByTopic(topic);
    
    if (!results || results.length === 0) {
      const stats = wcagDataService.getCoverageStats();
      return {
        content: [{
          type: 'text',
          text: language === 'en' 
            ? `No specific rules found for "${topic}".\n\nTry:\n- **Topics:** images, forms, keyboard, aria, color-contrast, focus, headings, links, video, audio, navigation, mobile, touch\n- **WCAG Criteria:** 1.1.1, 1.3.1, 1.4.3, 2.1.1, 2.4.4, 2.4.7, 4.1.2, etc.\n- **Levels:** A, AA, AAA\n- **Principles:** Perceivable, Operable, Understandable, Robust\n\n📊 Coverage: ${stats.totalCriteria} official WCAG 2.1 criteria available`
            : `Ingen spesifikke regler funnet for "${topic}".\n\nPrøv:\n- **Emner:** images, forms, keyboard, aria, color-contrast, focus, headings, links, video, audio, navigation, mobile, touch\n- **WCAG-kriterier:** 1.1.1, 1.3.1, 1.4.3, 2.1.1, 2.4.4, 2.4.7, 4.1.2, osv.\n- **Nivåer:** A, AA, AAA\n- **Prinsipper:** Perceivable, Operable, Understandable, Robust\n\n📊 Dekning: ${stats.totalCriteria} offisielle WCAG 2.1-kriterier tilgjengelig`
        }]
      };
    }
    
    // Build report with official data + template guidance
    let report = '';
    
    for (const criterion of results) {
      report += `# ${criterion.id}: ${criterion.name}\n\n`;
      
      // Official W3C data
      report += `## 📋 Official W3C Definition\n\n`;
      report += `**Level:** ${criterion.level}\n`;
      report += `**Principle:** ${criterion.principle}\n`;
      report += `**Guideline:** ${criterion.guideline}\n\n`;
      report += `**Description:** ${criterion.description}\n\n`;
      report += `🔗 [W3C Understanding Document](${criterion.url})\n\n`;
      
      // WCAG 2.1 badge if applicable
      if (criterion.wcag21) {
        report += `🆕 *New in WCAG 2.1*\n\n`;
      }
      
      // Techniques from W3C
      if (criterion.techniques && criterion.techniques.length > 0) {
        report += `**Official Techniques:** ${criterion.techniques.join(', ')}\n\n`;
      }
      
      // Template guidance (practical tips)
      if (criterion.hasTemplateGuidance) {
        report += `---\n\n## 💡 Practical Guidance\n\n`;
        
        if (criterion.bestPractices && criterion.bestPractices.length > 0) {
          report += `### Best Practices\n\n`;
          for (const tip of criterion.bestPractices) {
            report += `- ${tip}\n`;
          }
          report += `\n`;
        }
        
        if (criterion.codeExamples && criterion.codeExamples.length > 0) {
          report += `### Code Examples\n\n`;
          for (const example of criterion.codeExamples) {
            if (example.includes('<') || example.includes('{')) {
              report += `\`\`\`html\n${example}\n\`\`\`\n\n`;
            } else {
              report += `\`\`\`\n${example}\n\`\`\`\n\n`;
            }
          }
        }
        
        if (criterion.commonMistakes && criterion.commonMistakes.length > 0) {
          report += `### ⚠️ Common Mistakes\n\n`;
          for (const mistake of criterion.commonMistakes) {
            report += `- ${mistake}\n`;
          }
          report += `\n`;
        }
      } else {
        report += `---\n\n*ℹ️ Practical guidance templates not yet available for this criterion. Refer to the W3C Understanding document above.*\n\n`;
      }
      
      report += `---\n\n`;
    }
    
    // Add source attribution
    report += `\n*📚 Data sources: Official W3C WCAG 2.1 specification + practical implementation templates*\n`;
    
    return {
      content: [{ type: 'text', text: report }]
    };
  }

  async suggestAria(args) {
    const { element, context = '' } = args;
    
    logger.info(`Getting ARIA suggestions for: ${element}`);
    
    const suggestions = {
      'modal': {
        description: 'Dialog/modal overlay',
        html: `<div role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc">
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-desc">Modal description</p>
  <button aria-label="Close modal">×</button>
  <!-- content -->
</div>`,
        tips: [
          'Trap focus inside modal while open',
          'Return focus to trigger element on close',
          'Close on Escape key',
          'Use aria-modal="true" to indicate background is inert'
        ]
      },
      'dropdown': {
        description: 'Dropdown menu',
        html: `<div class="dropdown">
  <button aria-haspopup="true" aria-expanded="false" aria-controls="dropdown-menu">
    Options
  </button>
  <ul id="dropdown-menu" role="menu" hidden>
    <li role="menuitem"><a href="#">Option 1</a></li>
    <li role="menuitem"><a href="#">Option 2</a></li>
  </ul>
</div>`,
        tips: [
          'Toggle aria-expanded on button click',
          'Use arrow keys to navigate menu items',
          'Close on Escape or click outside',
          'First item receives focus when opened'
        ]
      },
      'tabs': {
        description: 'Tab panel interface',
        html: `<div class="tabs">
  <div role="tablist" aria-label="Content tabs">
    <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1">Tab 1</button>
    <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2" tabindex="-1">Tab 2</button>
  </div>
  <div role="tabpanel" id="panel-1" aria-labelledby="tab-1">Content 1</div>
  <div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>Content 2</div>
</div>`,
        tips: [
          'Only selected tab should have tabindex="0"',
          'Use arrow keys to switch between tabs',
          'Home/End to jump to first/last tab',
          'Panel should be labelledby its tab'
        ]
      },
      'accordion': {
        description: 'Expandable accordion sections',
        html: `<div class="accordion">
  <h3>
    <button aria-expanded="false" aria-controls="section-1">Section Title</button>
  </h3>
  <div id="section-1" hidden>
    Section content...
  </div>
</div>`,
        tips: [
          'Toggle aria-expanded and hidden attribute',
          'Use heading level appropriate to page structure',
          'Enter or Space to toggle',
          'Optionally allow only one section open at a time'
        ]
      },
      'navigation': {
        description: 'Navigation landmark',
        html: `<nav aria-label="Main navigation">
  <ul>
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>`,
        tips: [
          'Use aria-label when multiple nav elements exist',
          'Mark current page with aria-current="page"',
          'Keep navigation consistent across pages',
          'Consider skip link to bypass navigation'
        ]
      },
      'button': {
        description: 'Button element',
        html: `<!-- Standard button -->
<button type="button">Click me</button>

<!-- Icon button -->
<button aria-label="Close dialog" type="button">
  <svg aria-hidden="true">...</svg>
</button>

<!-- Toggle button -->
<button aria-pressed="false" type="button">Toggle feature</button>`,
        tips: [
          'Use <button> element, not <div> or <span>',
          'Icon-only buttons need aria-label',
          'Use aria-pressed for toggle buttons',
          'Use aria-disabled instead of disabled for better a11y'
        ]
      },
      'alert': {
        description: 'Live region for alerts',
        html: `<!-- Assertive alert (important, interrupts) -->
<div role="alert" aria-live="assertive">
  Error: Please fix the following issues...
</div>

<!-- Polite status (non-urgent updates) -->
<div role="status" aria-live="polite">
  3 items in cart
</div>`,
        tips: [
          'role="alert" is implicitly aria-live="assertive"',
          'Use "polite" for non-critical updates',
          'Content must be injected dynamically to be announced',
          'Don\'t overuse - too many alerts are disruptive'
        ]
      },
      'tooltip': {
        description: 'Tooltip/help text',
        html: `<button aria-describedby="tooltip-1">
  Help
</button>
<div id="tooltip-1" role="tooltip" hidden>
  Click for assistance with this feature
</div>`,
        tips: [
          'Show on focus and hover',
          'Use aria-describedby to connect trigger and tooltip',
          'Tooltip should be dismissible with Escape',
          'Consider role="tooltip" for proper semantics'
        ]
      },
      'search': {
        description: 'Search form',
        html: `<form role="search" aria-label="Site search">
  <label for="search-input" class="visually-hidden">Search</label>
  <input id="search-input" type="search" placeholder="Search...">
  <button type="submit" aria-label="Submit search">
    <svg aria-hidden="true">...</svg>
  </button>
</form>`,
        tips: [
          'role="search" creates search landmark',
          'Always include a label, even if visually hidden',
          'Use type="search" for proper semantics',
          'Announce search results with aria-live region'
        ]
      }
    };
    
    const normalizedElement = element.toLowerCase().trim();
    let suggestion = suggestions[normalizedElement];
    
    // Try partial match
    if (!suggestion) {
      const key = Object.keys(suggestions).find(k => 
        k.includes(normalizedElement) || normalizedElement.includes(k)
      );
      suggestion = key ? suggestions[key] : null;
    }
    
    if (!suggestion) {
      return {
        content: [{
          type: 'text',
          text: `No specific ARIA pattern found for "${element}". Available patterns: ${Object.keys(suggestions).join(', ')}`
        }]
      };
    }
    
    let report = `# ARIA Pattern: ${element.charAt(0).toUpperCase() + element.slice(1)}\n\n`;
    report += `**Description:** ${suggestion.description}\n\n`;
    if (context) {
      report += `**Your context:** ${context}\n\n`;
    }
    report += `## Recommended HTML Structure\n\n`;
    report += `\`\`\`html\n${suggestion.html}\n\`\`\`\n\n`;
    report += `## Implementation Tips\n\n`;
    for (const tip of suggestion.tips) {
      report += `- ${tip}\n`;
    }
    
    return {
      content: [{ type: 'text', text: report }]
    };
  }

  _generateMarkdownReport(analysis, language) {
    const t = language === 'en' ? {
      title: 'WCAG Compliance Report',
      website: 'Website',
      pages: 'Pages Analyzed',
      issues: 'Total Issues',
      timestamp: 'Analysis Date',
      critical: 'Critical',
      serious: 'Serious',
      moderate: 'Moderate',
      minor: 'Minor'
    } : {
      title: 'WCAG Tilgjengelighetsrapport',
      website: 'Nettsted',
      pages: 'Sider analysert',
      issues: 'Totalt antall problemer',
      timestamp: 'Analysedato',
      critical: 'Kritisk',
      serious: 'Alvorlig',
      moderate: 'Moderat',
      minor: 'Mindre'
    };

    // Map violations to WCAG criteria (reuse ExcelReporter logic)
    const violationsByCriteria = this._mapViolationsToWCAG(analysis);
    
    let report = `# ${t.title}\n\n`;
    report += `**${t.website}:** ${analysis.baseUrl}\n`;
    report += `**${t.timestamp}:** ${analysis.timestamp}\n`;
    report += `**${t.pages}:** ${analysis.pagesAnalyzed}\n`;
    report += `**${t.issues}:** ${analysis.totalIssues}\n\n`;

    // WCAG Criteria Summary
    if (Object.keys(violationsByCriteria).length > 0) {
      report += `## ${language === 'en' ? 'WCAG Success Criteria Violations' : 'WCAG Suksesskriterier - Brudd'}\n\n`;
      report += `${language === 'en' ? 'Violated' : 'Brudd på'} **${Object.keys(violationsByCriteria).length}** ${language === 'en' ? 'WCAG success criteria' : 'WCAG suksesskriterier'}:\n\n`;
      
      for (const [criteria, violations] of Object.entries(violationsByCriteria).sort()) {
        const errorCount = violations.filter(v => v.type === 'error').length;
        const warningCount = violations.filter(v => v.type === 'warning').length;
        const icon = errorCount > 0 ? '🔴' : '🟡';
        const status = errorCount > 0 ? 
          (language === 'en' ? 'Error' : 'Feil') : 
          (language === 'en' ? 'Warning' : 'Advarsel');
        
        report += `${icon} **${criteria}** - ${status} (${violations.length} ${language === 'en' ? 'issues' : 'problemer'})\n`;
      }
      report += `\n`;
    }

    report += `## ${language === 'en' ? 'Issues by Severity' : 'Problemer etter alvorlighetsgrad'}\n\n`;
    report += `| ${language === 'en' ? 'Severity' : 'Alvorlighetsgrad'} | ${language === 'en' ? 'Count' : 'Antall'} |\n`;
    report += `|--------|-------|\n`;
    report += `| 🔴 ${t.critical} | ${analysis.issuesByImpact.critical} |\n`;
    report += `| 🟠 ${t.serious} | ${analysis.issuesByImpact.serious} |\n`;
    report += `| 🟡 ${t.moderate} | ${analysis.issuesByImpact.moderate} |\n`;
    report += `| 🔵 ${t.minor} | ${analysis.issuesByImpact.minor} |\n\n`;

    // Detailed WCAG criteria breakdown
    if (Object.keys(violationsByCriteria).length > 0) {
      report += `## ${language === 'en' ? 'Detailed WCAG Criteria Analysis' : 'Detaljert WCAG-kriterieanalyse'}\n\n`;
      
      for (const [criteria, violations] of Object.entries(violationsByCriteria).sort()) {
        report += `### ${criteria}\n\n`;
        
        // Show unique messages
        const uniqueMessages = [...new Set(violations.map(v => v.message))];
        for (const message of uniqueMessages) {
          const matchingViolations = violations.filter(v => v.message === message);
          const icon = matchingViolations[0].type === 'error' ? '🔴' : '🟡';
          report += `${icon} ${message} (${language === 'en' ? 'Affects' : 'Påvirker'} ${matchingViolations[0].count || 1} ${language === 'en' ? 'elements' : 'elementer'})\n`;
        }
        report += `\n`;
      }
    }

    // Page results
    report += `## ${language === 'en' ? 'Page Results' : 'Sideresultater'}\n\n`;
    for (const page of analysis.pageAnalyses) {
      report += `### ${page.url}\n\n`;
      report += `**${language === 'en' ? 'Issues Found' : 'Problemer funnet'}:** ${page.issues.length}\n\n`;
      
      if (page.issues.length > 0) {
        report += `${language === 'en' ? 'Top issues' : 'Viktigste problemer'}:\n`;
        for (const issue of page.issues.slice(0, 5)) {
          report += `- ${issue.message}\n`;
        }
        report += '\n';
      }
    }

    report += `\n---\n*${language === 'en' ? 'Report generated by pa11y WCAG analyzer' : 'Rapport generert av pa11y WCAG-analysator'}*\n`;

    return report;
  }

  /**
   * Map violations to WCAG success criteria (same logic as ExcelReporter)
   * @private
   */
  _mapViolationsToWCAG(analysis) {
    const violationsByCriteria = {};
    
    for (const page of analysis.pageAnalyses) {
      for (const issue of page.issues) {
        // Extract WCAG criterion from code
        // Example: "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail" -> "1.4.3"
        const match = issue.code.match(/Guideline(\d+)_(\d+)\.(\d+)_(\d+)_(\d+)/);
        if (match) {
          const [, major, minor, sc1, sc2, sc3] = match;
          const criteria = `${major}.${minor}.${sc3}`;
          
          if (!violationsByCriteria[criteria]) {
            violationsByCriteria[criteria] = [];
          }
          
          violationsByCriteria[criteria].push({
            message: issue.message,
            type: issue.type,
            selector: issue.selector,
            count: issue.affectedElements || 1,
            context: issue.context
          });
        }
      }
    }
    
    return violationsByCriteria;
  }

  _generateQuickReport(analysis, language) {
    const t = language === 'en' ? {
      title: 'Quick WCAG Check',
      url: 'URL',
      issues: 'Issues Found',
      timestamp: 'Analysis Date'
    } : {
      title: 'Rask WCAG-sjekk',
      url: 'URL',
      issues: 'Problemer funnet',
      timestamp: 'Analysedato'
    };

    let report = `# ${t.title}\n\n`;
    report += `**${t.url}:** ${analysis.url}\n`;
    report += `**${t.timestamp}:** ${analysis.timestamp}\n`;
    report += `**${t.issues}:** ${analysis.issues.length}\n\n`;

    if (analysis.issues.length > 0) {
      report += `## ${language === 'en' ? 'Issues' : 'Problemer'}\n\n`;
      for (const issue of analysis.issues) {
        report += `### ${issue.code}\n`;
        report += `${issue.message}\n`;
        report += `- **${language === 'en' ? 'Type' : 'Type'}:** ${issue.type}\n`;
        report += `- **${language === 'en' ? 'Selector' : 'Velger'}:** \`${issue.selector}\`\n\n`;
      }
    } else {
      report += `✅ ${language === 'en' ? 'No issues found!' : 'Ingen problemer funnet!'}\n`;
    }

    return report;
  }

  async run() {
    const transportMode = process.env.MCP_TRANSPORT || 'stdio';
    
    if (transportMode === 'http' || transportMode === 'sse') {
      await this.runHttpServer();
    } else {
      await this.runStdioServer();
    }
  }

  async runStdioServer() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('WCAG MCP Server running on stdio');
  }

  async runHttpServer() {
    const port = parseInt(process.env.MCP_PORT) || 3000;
    const app = express();
    
    // Enable CORS for all origins
    app.use(cors());
    
    // Parse JSON bodies
    app.use(express.json());
    
    // Store active transports by session ID
    const transports = {};
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', transport: 'streamable-http', timestamp: new Date().toISOString() });
    });
    
    // MCP POST endpoint - handles initialization and requests
    app.post('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];
      
      try {
        let transport;
        
        if (sessionId && transports[sessionId]) {
          // Reuse existing transport
          transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
          // New initialization request - create new transport and server
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (newSessionId) => {
              logger.info(`Session initialized: ${newSessionId}`);
              transports[newSessionId] = transport;
            }
          });
          
          // Clean up on close
          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid && transports[sid]) {
              logger.info(`Transport closed for session ${sid}`);
              delete transports[sid];
            }
          };
          
          // Create a new server instance for this session
          const mcpServer = new WCAGMCPServer();
          await mcpServer.server.connect(transport);
          
          await transport.handleRequest(req, res, req.body);
          return;
        } else {
          // Invalid request
          res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
            id: null
          });
          return;
        }
        
        // Handle request with existing transport
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        logger.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null
          });
        }
      }
    });
    
    // MCP GET endpoint - SSE streams for server-to-client notifications
    app.get('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];
      
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      
      logger.info(`SSE stream requested for session ${sessionId}`);
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    });
    
    // MCP DELETE endpoint - session termination
    app.delete('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];
      
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      
      logger.info(`Session termination requested for ${sessionId}`);
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    });
    
    app.listen(port, '0.0.0.0', () => {
      logger.info(`WCAG MCP Server running on HTTP at http://0.0.0.0:${port}`);
      logger.info(`  - MCP endpoint: http://localhost:${port}/mcp`);
      logger.info(`  - Health check: http://localhost:${port}/health`);
    });
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down server...');
      for (const sessionId in transports) {
        try {
          await transports[sessionId].close();
          delete transports[sessionId];
        } catch (error) {
          logger.error(`Error closing transport for session ${sessionId}:`, error);
        }
      }
      process.exit(0);
    });
  }
}

// Start server
const server = new WCAGMCPServer();
server.run().catch((error) => {
  logger.error('Server error:', error);
  process.exit(1);
});
