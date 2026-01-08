/**
 * WCAG MCP Server - Main entry point
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import WCAGAnalyzer from './analyzer.js';
import logger from './logger.js';
import ExcelReporter from './reporter.js';
import WebScraper from './scraper.js';

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
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('WCAG MCP Server running on stdio');
  }
}

// Start server
const server = new WCAGMCPServer();
server.run().catch((error) => {
  logger.error('Server error:', error);
  process.exit(1);
});
