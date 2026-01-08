/**
 * Excel Reporter - Generates WCAG reports using UU-tilsynet Excel templates
 */
import ExcelJS from 'exceljs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExcelReporter {
  constructor() {
    this.webTemplatePath = path.join(__dirname, 'contents', 'WCAG-sjekkliste-web.xlsx');
    this.appTemplatePath = path.join(__dirname, 'contents', 'WCAG-sjekkliste-app.xlsx');
  }

  /**
   * Generate Excel report from analysis results
   * @param {Object} analysis - Analysis results from WCAGAnalyzer
   * @param {string} checklistType - 'WEB' or 'APP'
   * @returns {Promise<ExcelJS.Workbook>} Populated workbook
   */
  async generateReport(analysis, checklistType = 'WEB') {
    try {
      logger.info(`Generating Excel report (${checklistType})...`);
      
      // Load template
      const templatePath = checklistType === 'APP' ? this.appTemplatePath : this.webTemplatePath;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);
      
      const worksheet = workbook.worksheets[0];
      
      // Map pa11y violations to WCAG success criteria
      const violationsByCriteria = this._mapViolationsToWCAG(analysis);
      
      logger.info(`Mapped violations to ${Object.keys(violationsByCriteria).length} WCAG criteria`);
      
      // Update worksheet with findings
      this._updateWorksheet(worksheet, violationsByCriteria, analysis);
      
      // Add disclaimer sheet
      this._addDisclaimerSheet(workbook, analysis);
      
      logger.info('Excel report generated successfully');
      return workbook;
    } catch (error) {
      logger.error(`Failed to generate Excel report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map pa11y violations to WCAG success criteria
   * @private
   */
  _mapViolationsToWCAG(analysis) {
    const violationsByCriteria = {};
    
    // Collect all issues from all pages
    const allIssues = [];
    if (analysis.pageAnalyses) {
      for (const page of analysis.pageAnalyses) {
        allIssues.push(...page.issues);
      }
    } else if (analysis.issues) {
      allIssues.push(...analysis.issues);
    }
    
    logger.info(`Processing ${allIssues.length} total issues`);
    
    for (const issue of allIssues) {
      // Extract WCAG criterion from issue code
      // Example: "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail" -> "1.4.3"
      const wcagMatch = issue.code?.match(/Principle(\d)\.Guideline(\d+)_(\d+)\.(\d+)_(\d+)_(\d+)/);
      
      if (wcagMatch) {
        const [, principle, guideline1, guideline2, sc1, sc2, sc3] = wcagMatch;
        const criterion = `${sc1}.${sc2}.${sc3}`;
        
        if (!violationsByCriteria[criterion]) {
          violationsByCriteria[criterion] = {
            principle: `Prinsipp ${principle}`,
            criterion: criterion,
            issues: []
          };
        }
        
        violationsByCriteria[criterion].issues.push({
          type: issue.type,
          message: issue.message,
          selector: issue.selector,
          affectedElements: issue.affectedElements || 1
        });
      } else {
        // Try alternative format
        const altMatch = issue.code?.match(/(\d+)\.(\d+)\.(\d+)/);
        if (altMatch) {
          const criterion = `${altMatch[1]}.${altMatch[2]}.${altMatch[3]}`;
          if (!violationsByCriteria[criterion]) {
            violationsByCriteria[criterion] = {
              principle: `Prinsipp ${altMatch[1]}`,
              criterion: criterion,
              issues: []
            };
          }
          violationsByCriteria[criterion].issues.push({
            type: issue.type,
            message: issue.message,
            selector: issue.selector,
            affectedElements: issue.affectedElements || 1
          });
        } else {
          logger.debug(`Could not extract WCAG criterion from: ${issue.code}`);
        }
      }
    }
    
    return violationsByCriteria;
  }

  /**
   * Update worksheet with violation data
   * @private
   */
  _updateWorksheet(worksheet, violationsByCriteria, analysis) {
    logger.info('Updating worksheet with findings...');
    
    let updatedRows = 0;
    
    // Start from row 6 (first data row after headers)
    for (let rowNum = 6; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      // Get success criterion from column C (index 3)
      const cellC = row.getCell(3);
      let criterionText = '';
      
      if (cellC.value && typeof cellC.value === 'object' && cellC.value.text) {
        criterionText = cellC.value.text;
      } else if (typeof cellC.value === 'string') {
        criterionText = cellC.value;
      }
      
      // Extract criterion number (e.g., "1.1.1" from "1.1.1 Ikke-tekstlig innhold")
      const criterionMatch = criterionText.match(/^(\d+\.\d+\.\d+)/);
      
      if (criterionMatch) {
        const criterion = criterionMatch[1];
        
        if (violationsByCriteria[criterion]) {
          const violations = violationsByCriteria[criterion];
          const errorCount = violations.issues.filter(i => i.type === 'error').length;
          const warningCount = violations.issues.filter(i => i.type === 'warning').length;
          
          // Update status column (D) - was "Ikke sjekket", now show result
          const statusCell = row.getCell(4);
          if (errorCount > 0) {
            statusCell.value = 'Ikke oppfylt';
            statusCell.font = { color: { argb: 'FFFF0000' }, bold: true }; // Red, bold
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFCCCC' } // Light red background
            };
          } else if (warningCount > 0) {
            statusCell.value = 'Advarsel';
            statusCell.font = { color: { argb: 'FFFF6600' }, bold: true }; // Orange, bold
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFEECC' } // Light orange background
            };
          } else {
            statusCell.value = 'Oppfylt';
            statusCell.font = { color: { argb: 'FF006600' } }; // Green
          }
          
          // Add comment with details
          const totalElements = violations.issues.reduce((sum, i) => sum + i.affectedElements, 0);
          const comment = [
            `Funnet ${violations.issues.length} type(r) problemer:`,
            `- Feil: ${errorCount}`,
            `- Advarsler: ${warningCount}`,
            `- Berørte elementer: ${totalElements}`,
            '',
            'Detaljer:',
            ...violations.issues.slice(0, 3).map(issue => 
              `• ${issue.message.substring(0, 100)}${issue.message.length > 100 ? '...' : ''}`
            )
          ].join('\n');
          
          statusCell.note = comment;
          
          updatedRows++;
        }
      }
    }
    
    logger.info(`Updated ${updatedRows} rows with violation data`);
    
    // Add summary at the top (update cells in row 1-2)
    const summaryRow = worksheet.getRow(2);
    const summaryText = [
      `Analyse av: ${analysis.baseUrl || analysis.url}`,
      `Dato: ${new Date(analysis.timestamp).toLocaleDateString('no-NO')}`,
      `Sider analysert: ${analysis.pagesAnalyzed || 1}`,
      `Problemer funnet: ${analysis.totalIssues || analysis.issues?.length || 0}`
    ].join(' | ');
    
    summaryRow.getCell(1).value = summaryText;
    summaryRow.font = { bold: true, size: 11 };
  }

  /**
   * Add disclaimer sheet to workbook
   * @private
   */
  _addDisclaimerSheet(workbook, analysis) {
    const sheet = workbook.addWorksheet('⚠️ Les Meg Først', { 
      state: 'visible',
      properties: { tabColor: { argb: 'FFFF6600' } }
    });
    
    // Move to first position
    workbook.worksheets.forEach((ws, index) => {
      if (ws.name === '⚠️ Les Meg Først') {
        workbook.worksheets.splice(index, 1);
        workbook.worksheets.unshift(ws);
      }
    });
    
    // Set column widths
    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 80;
    
    let rowNum = 1;
    
    // Title
    const titleRow = sheet.getRow(rowNum++);
    titleRow.getCell(1).value = 'VIKTIG:';
    titleRow.getCell(2).value = 'Automatisert WCAG-analyse - Begrensninger og anbefalinger';
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFF0000' } };
    titleRow.getCell(2).font = { bold: true, size: 16 };
    rowNum++;
    
    // Date
    sheet.getRow(rowNum++).getCell(2).value = `Generert: ${new Date(analysis.timestamp).toLocaleString('no-NO')}`;
    sheet.getRow(rowNum++).getCell(2).value = `URL: ${analysis.baseUrl || analysis.url}`;
    rowNum++;
    
    // Warning section
    const warningRow = sheet.getRow(rowNum++);
    warningRow.getCell(1).value = '⚠️ ADVARSEL';
    warningRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFF6600' } };
    warningRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEECC' } };
    
    const warningText = sheet.getRow(rowNum++);
    warningText.getCell(2).value = 'Automatiserte verktøy fanger kun 30-40% av tilgjengelighetsproblemer!';
    warningText.getCell(2).font = { bold: true, size: 12, color: { argb: 'FFFF0000' } };
    rowNum++;
    
    // What automated tools detect
    sheet.getRow(rowNum++).getCell(1).value = '✅ Verktøyet kan finne:';
    sheet.getRow(rowNum++).getCell(2).value = '• Manglende alt-tekst på bilder';
    sheet.getRow(rowNum++).getCell(2).value = '• Lav fargekontrast';
    sheet.getRow(rowNum++).getCell(2).value = '• Manglende skjemamerking';
    sheet.getRow(rowNum++).getCell(2).value = '• Ugyldig HTML-struktur';
    sheet.getRow(rowNum++).getCell(2).value = '• Feil bruk av ARIA-attributter';
    rowNum++;
    
    // What requires manual testing
    sheet.getRow(rowNum++).getCell(1).value = '❌ Krever manuell testing:';
    sheet.getRow(rowNum++).getCell(2).value = '• Tastaturnavigasjon og fokushåndtering';
    sheet.getRow(rowNum++).getCell(2).value = '• Skjermleserkvalitet og opplesning';
    sheet.getRow(rowNum++).getCell(2).value = '• Komplekse widgets og interaksjoner';
    sheet.getRow(rowNum++).getCell(2).value = '• Kontekstuelle problemer';
    sheet.getRow(rowNum++).getCell(2).value = '• Reell brukeropplevelse';
    rowNum++;
    
    // False positives section
    sheet.getRow(rowNum++).getCell(1).value = '⚠️ FALSKE POSITIVER';
    sheet.getRow(rowNum++).getCell(1).font = { bold: true, size: 12 };
    
    sheet.getRow(rowNum++).getCell(2).value = 'Enkelte feil kan være falske positiver, spesielt for:';
    sheet.getRow(rowNum++).getCell(2).value = '• Single Page Applications (React, Vue, Svelte, Angular)';
    sheet.getRow(rowNum++).getCell(2).value = '• Dynamisk innhold som lastes via JavaScript';
    sheet.getRow(rowNum++).getCell(2).value = '• Sider med treg nettverkstilkobling';
    rowNum++;
    
    sheet.getRow(rowNum++).getCell(2).value = 'Eksempel på falske positiver:';
    sheet.getRow(rowNum++).getCell(2).value = '• "Tom tittel" - tittel settes etter JavaScript-lasting';
    sheet.getRow(rowNum++).getCell(2).value = '• "Mangler lang-attributt" - attributt finnes, men ikke oppdaget';
    sheet.getRow(rowNum++).getCell(2).value = '• "Preformatert tekst" - ingen <pre> tags i koden';
    rowNum++;
    
    // Recommendations
    sheet.getRow(rowNum++).getCell(1).value = '✅ ANBEFALINGER';
    sheet.getRow(rowNum++).getCell(1).font = { bold: true, size: 12 };
    
    sheet.getRow(rowNum++).getCell(2).value = '1. VERIFISER FUNN MANUELT';
    sheet.getRow(rowNum++).getCell(2).value = '   • Åpne siden i nettleseren og inspiser (F12)';
    sheet.getRow(rowNum++).getCell(2).value = '   • Sammenlign rapporterte feil med faktisk innhold';
    rowNum++;
    
    sheet.getRow(rowNum++).getCell(2).value = '2. TEST MED SKJERMLESER';
    sheet.getRow(rowNum++).getCell(2).value = '   • Windows: NVDA (gratis) eller JAWS';
    sheet.getRow(rowNum++).getCell(2).value = '   • macOS: VoiceOver (innebygd)';
    sheet.getRow(rowNum++).getCell(2).value = '   • Nettleser: ChromeVox-utvidelse';
    rowNum++;
    
    sheet.getRow(rowNum++).getCell(2).value = '3. TEST TASTATURNAVIGASJON';
    sheet.getRow(rowNum++).getCell(2).value = '   • Bruk kun Tab, Shift+Tab, Enter, Space, piltaster';
    sheet.getRow(rowNum++).getCell(2).value = '   • Sjekk at fokus er synlig hele tiden';
    sheet.getRow(rowNum++).getCell(2).value = '   • Verifiser at alle funksjoner er tilgjengelige';
    rowNum++;
    
    sheet.getRow(rowNum++).getCell(2).value = '4. BRUKERTESTING';
    sheet.getRow(rowNum++).getCell(2).value = '   • Test med reelle brukere med funksjonsnedsettelser';
    sheet.getRow(rowNum++).getCell(2).value = '   • Observer faktisk bruk av hjelpemidler';
    rowNum++;
    
    // Standards info
    sheet.getRow(rowNum++).getCell(1).value = 'ℹ️ WCAG-STANDARDER';
    sheet.getRow(rowNum++).getCell(1).font = { bold: true, size: 12 };
    
    sheet.getRow(rowNum++).getCell(2).value = `Standard brukt: WCAG 2.1 Nivå AA (lovkrav i Norge)`;
    sheet.getRow(rowNum++).getCell(2).value = 'WCAG 2.1 Nivå AA er minimumskravet i forskrift om universell utforming av IKT.';
    sheet.getRow(rowNum++).getCell(2).value = 'Frist: 23. juni 2021 (allerede i kraft)';
    rowNum++;
    
    // More info
    sheet.getRow(rowNum++).getCell(1).value = '📚 MER INFORMASJON';
    sheet.getRow(rowNum++).getCell(1).font = { bold: true, size: 12 };
    
    sheet.getRow(rowNum++).getCell(2).value = '• UU-tilsynet: https://www.uutilsynet.no/';
    sheet.getRow(rowNum++).getCell(2).value = '• WCAG 2.1 Understanding: https://www.w3.org/WAI/WCAG21/Understanding/';
    rowNum++;
    
    // Summary
    const summaryRow = sheet.getRow(rowNum++);
    summaryRow.getCell(2).value = 'HUSK: Målet er tilgjengelig brukeropplevelse, ikke bare å bestå automatiserte tester!';
    summaryRow.getCell(2).font = { bold: true, size: 12, color: { argb: 'FF006600' } };
    summaryRow.getCell(2).alignment = { wrapText: true };
    
    // Format all cells for word wrap
    for (let r = 1; r <= rowNum; r++) {
      const row = sheet.getRow(r);
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
      row.height = undefined; // Auto height
    }
    
    logger.info('Added disclaimer sheet');
  }
}

export default ExcelReporter;
