import fs from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import type { AppConfig, FormAnswers } from './types';
import type { SavedFile } from './storage';
import type { SupplierAssessment } from './scoring';
import { getCompanyName, getContactEmail, sectionToRows, str } from './form-utils';
import { getAssessorName, getBrandName } from './app-config';
import { loadLogoBuffer } from './logo';

const PDF_LOGO_WIDTH = 100;
const PDF_LOGO_HEIGHT = 54;

const PAGE_WIDTH = 595.28;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  navy: '#1e3a5f',
  lightBlue: '#f0f7ff',
  borderBlue: '#bfdbfe',
  gray: '#6b7280',
  grayDark: '#374151',
  text: '#111827',
  white: '#ffffff',
  green: '#059669',
  blue: '#2563eb',
  orange: '#d97706',
  red: '#dc2626',
  rowAlt: '#f9fafb',
  divider: '#e5e7eb',
  headerSub: '#dbeafe',
};

function getScoreColor(percentage: number): string {
  if (percentage >= 90) return COLORS.green;
  if (percentage >= 80) return COLORS.blue;
  if (percentage >= 70) return COLORS.orange;
  if (percentage >= 60) return '#ea580c';
  return COLORS.red;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || 'supplier';
}

function ensureSpace(doc: InstanceType<typeof PDFDocument>, height = 60): void {
  if (doc.y + height > doc.page.height - MARGIN) {
    doc.addPage();
  }
}

function drawHeading(doc: InstanceType<typeof PDFDocument>, text: string, size = 14): void {
  ensureSpace(doc, 40);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(size).fillColor('#1e3a5f').text(text, MARGIN, doc.y, {
    width: CONTENT_WIDTH,
  });
  doc.moveDown(0.3);
}

function drawSubheading(doc: InstanceType<typeof PDFDocument>, text: string): void {
  ensureSpace(doc, 30);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#374151').text(text);
  doc.moveDown(0.2);
}

function drawParagraph(doc: InstanceType<typeof PDFDocument>, text: string): void {
  doc.font('Helvetica').fontSize(10).fillColor('#111827').text(text, {
    width: CONTENT_WIDTH,
    lineGap: 2,
  });
  doc.moveDown(0.3);
}

function drawKeyValue(doc: InstanceType<typeof PDFDocument>, label: string, value: string): void {
  ensureSpace(doc, 24);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151').text(`${label}: `, {
    continued: true,
    width: CONTENT_WIDTH,
  });
  doc.font('Helvetica').fillColor('#111827').text(value || '—');
}

function drawMatrixTable(doc: InstanceType<typeof PDFDocument>, assessment: SupplierAssessment): void {
  const colWidths = [262, 62, 62, 129];
  const rowH = 24;
  const startX = MARGIN + 14;
  const tableW = CONTENT_WIDTH - 28;
  const scoreColor = getScoreColor(assessment.percentage);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.navy).text('Scoring Matrix', startX, doc.y);
  doc.y += 18;

  const drawRow = (
    cells: string[],
    options: { header?: boolean; footer?: boolean; alt?: boolean } = {},
  ) => {
    ensureSpace(doc, rowH + 4);
    const y = doc.y;

    if (options.header) {
      doc.rect(startX, y, tableW, rowH).fill(COLORS.navy);
    } else if (options.footer) {
      doc.rect(startX, y, tableW, rowH).fill(COLORS.rowAlt);
    } else if (options.alt) {
      doc.rect(startX, y, tableW, rowH).fill(COLORS.rowAlt);
    }

    let x = startX;
    cells.forEach((cell, i) => {
      const align = i === 0 ? 'left' : 'center';
      const padX = i === 0 ? 10 : 4;
      let color = COLORS.text;
      let font: 'Helvetica' | 'Helvetica-Bold' = 'Helvetica';

      if (options.header) {
        color = COLORS.white;
        font = 'Helvetica-Bold';
      } else if (options.footer) {
        color = i === 0 ? COLORS.navy : scoreColor;
        font = 'Helvetica-Bold';
      } else if (i === 2 || i === 3) {
        font = 'Helvetica-Bold';
        color = i === 3 ? COLORS.navy : COLORS.text;
      } else {
        color = COLORS.grayDark;
      }

      doc.font(font).fontSize(9).fillColor(color);
      doc.text(cell, x + padX, y + 7, { width: colWidths[i] - padX * 2, align, lineBreak: false });
      x += colWidths[i];
    });

    doc.y = y + rowH;
  };

  drawRow(['Category', 'Weight', 'Score', 'Weighted'], { header: true });

  assessment.categories.forEach((category, index) => {
    drawRow(
      [category.label, `${category.weight}%`, `${category.score}/5`, String(category.weightedScore)],
      { alt: index % 2 === 1 },
    );
  });

  drawRow(['Total Weighted Score', '', '', String(assessment.totalWeightedScore)], { footer: true });
  doc.y += 12;
}

function drawSummaryDashboard(
  doc: InstanceType<typeof PDFDocument>,
  assessment: SupplierAssessment,
  innerX = MARGIN,
  innerW = CONTENT_WIDTH,
): void {
  const scoreColor = getScoreColor(assessment.percentage);
  const dashY = doc.y;
  const dashH = 86;
  const colW = innerW / 3;

  ensureSpace(doc, dashH + 12);
  doc.roundedRect(innerX, dashY, innerW, dashH, 8).fill(COLORS.white).stroke(COLORS.divider);

  const dividerTop = dashY + 10;
  const dividerBottom = dashY + dashH - 10;
  doc.strokeColor(COLORS.divider).lineWidth(1);
  doc.moveTo(innerX + colW, dividerTop).lineTo(innerX + colW, dividerBottom).stroke();
  doc.moveTo(innerX + colW * 2, dividerTop).lineTo(innerX + colW * 2, dividerBottom).stroke();

  const labelY = dashY + 14;

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray).text('OVERALL SCORE', innerX, labelY, {
    width: colW,
    align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(24).fillColor(scoreColor).text(
    `${assessment.totalWeightedScore} / ${assessment.maxScore}`,
    innerX,
    labelY + 14,
    { width: colW, align: 'center' },
  );
  doc.font('Helvetica-Bold').fontSize(13).fillColor(scoreColor).text(
    `${assessment.percentage}%`,
    innerX,
    labelY + 42,
    { width: colW, align: 'center' },
  );

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray).text('RISK RATING', innerX + colW, labelY, {
    width: colW,
    align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.navy).text(
    assessment.riskLevel,
    innerX + colW,
    labelY + 16,
    { width: colW, align: 'center' },
  );
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.grayDark).text(
    `★ ${assessment.rating}`,
    innerX + colW,
    labelY + 38,
    { width: colW, align: 'center' },
  );

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray).text('APPROVAL STATUS', innerX + colW * 2, labelY, {
    width: colW,
    align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.navy).text(
    assessment.approvalStatus,
    innerX + colW * 2,
    labelY + 14,
    { width: colW - 10, align: 'center' },
  );
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray).text(
    `Next review: ${assessment.nextReviewDate}`,
    innerX + colW * 2,
    labelY + 44,
    { width: colW - 10, align: 'center' },
  );

  doc.y = dashY + dashH + 16;
}

function estimateCardHeight(categoryCount: number): number {
  const matrixRows = categoryCount + 2;
  return 170 + 86 + 16 + 18 + matrixRows * 24 + 28;
}

function drawAssessmentCardBackground(
  doc: InstanceType<typeof PDFDocument>,
  cardY: number,
  cardHeight: number,
): void {
  doc.save();
  doc.roundedRect(MARGIN - 2, cardY, CONTENT_WIDTH + 4, cardHeight, 10).fill(COLORS.lightBlue);
  doc.roundedRect(MARGIN - 2, cardY, CONTENT_WIDTH + 4, cardHeight, 10).stroke(COLORS.borderBlue);
  doc.restore();
}

function drawSectionHeading(doc: InstanceType<typeof PDFDocument>, text: string, color: string): void {
  ensureSpace(doc, 36);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(color).text(text, MARGIN, doc.y);
  doc.y += 16;
}

function drawPdfLogo(doc: InstanceType<typeof PDFDocument>, logoBuffer: Buffer | null, y: number): number {
  if (!logoBuffer) return MARGIN;

  try {
    doc.image(logoBuffer, MARGIN, y, { fit: [PDF_LOGO_WIDTH, PDF_LOGO_HEIGHT] });
    return MARGIN + PDF_LOGO_WIDTH + 16;
  } catch {
    return MARGIN;
  }
}

function drawAssessmentHeader(
  doc: InstanceType<typeof PDFDocument>,
  brandName: string,
  supplierName: string,
  submissionId: string,
  logoBuffer: Buffer | null = null,
): void {
  doc.rect(0, 0, PAGE_WIDTH, 82).fill(COLORS.navy);
  const textX = drawPdfLogo(doc, logoBuffer, 12);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(17).text(
    `${brandName} — Supplier Assessment`,
    textX,
    22,
    { width: PAGE_WIDTH - textX - MARGIN },
  );
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.headerSub).text(
    `${supplierName} · Submission ID: ${submissionId}`,
    textX,
    48,
    { width: PAGE_WIDTH - textX - MARGIN },
  );
  doc.fillColor(COLORS.text);
  doc.y = 96;
}

function drawQuestionnaireHeader(
  doc: InstanceType<typeof PDFDocument>,
  brandName: string,
  submissionId: string,
  logoBuffer: Buffer | null = null,
): void {
  doc.rect(0, 0, PAGE_WIDTH, 90).fill(COLORS.navy);
  const textX = drawPdfLogo(doc, logoBuffer, 16);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(20).text(brandName, textX, 28, {
    width: PAGE_WIDTH - textX - MARGIN,
  });
  doc.fontSize(14).font('Helvetica').text('Supplier Questionnaire Responses', textX, 52, {
    width: PAGE_WIDTH - textX - MARGIN,
  });
  doc.fontSize(9).fillColor(COLORS.headerSub).text(`Submission ID: ${submissionId}`, textX, 72, {
    width: PAGE_WIDTH - textX - MARGIN,
  });
  doc.fillColor(COLORS.text);
  doc.y = 110;
}

function pdfFooterText(brandName: string): string {
  return `${brandName} Supplier Approval System`;
}

function drawStyledBullets(doc: InstanceType<typeof PDFDocument>, items: string[], boldPrefix = false): void {
  if (!items.length) {
    drawParagraph(doc, 'None identified.');
    return;
  }

  for (const item of items) {
    ensureSpace(doc, 28);
    const bulletX = MARGIN + 4;
    const textWidth = CONTENT_WIDTH - 16;

    if (boldPrefix && item.includes(':')) {
      const colonIdx = item.indexOf(':');
      const category = item.slice(0, colonIdx);
      const rest = item.slice(colonIdx + 1).trim();
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.grayDark).text('• ', bulletX, doc.y, {
        continued: true,
        width: textWidth,
      });
      doc.text(`${category}: `, { continued: true });
      doc.font('Helvetica').fillColor(COLORS.grayDark).text(rest, { width: textWidth, lineGap: 2 });
    } else {
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.grayDark).text(`• ${item}`, {
        width: textWidth,
        indent: 10,
        lineGap: 2,
      });
    }
    doc.moveDown(0.15);
  }
  doc.moveDown(0.3);
}

function drawReportIntro(
  doc: InstanceType<typeof PDFDocument>,
  companyName: string,
  assessmentDate: string,
  assessor: string,
  assessment: SupplierAssessment,
): void {
  const cardPad = 14;
  const innerX = MARGIN + cardPad;
  const innerW = CONTENT_WIDTH - cardPad * 2;
  let y = doc.y + cardPad;

  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.navy).text('Supplier Assessment Report', innerX, y);
  y += 22;
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray).text(
    'Automated risk assessment generated from questionnaire responses',
    innerX,
    y,
    { width: innerW },
  );
  y += 24;

  for (const [label, value] of [
    ['Supplier', companyName],
    ['Supplier Type', assessment.supplierTypeLabel],
    ['Review Schedule', assessment.reviewInterval],
    ['Review Based On', `${assessment.reviewDriverLabel} (highest risk)`],
    ['Assessment Date', assessmentDate],
    ['Assessor', assessor],
  ] as Array<[string, string]>) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.grayDark).text(label, innerX, y, { width: 120 });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text).text(value || '—', innerX + 125, y, { width: innerW - 125 });
    y += 18;
  }

  doc.y = y + 8;
  drawSummaryDashboard(doc, assessment, innerX, innerW);
}

export function buildPdfFilename(data: FormAnswers): string {
  return `Supplier-Assessment-${sanitizeFilename(getCompanyName(data))}.pdf`;
}

export function buildQuestionnairePdfFilename(data: FormAnswers): string {
  return `Supplier-Questionnaire-${sanitizeFilename(getCompanyName(data))}.pdf`;
}

function drawQuestionnaireResponses(
  doc: InstanceType<typeof PDFDocument>,
  data: FormAnswers,
  appConfig: AppConfig,
): void {
  for (const formSection of appConfig.sections) {
    const rows = sectionToRows(formSection, data);
    if (!rows.length) continue;

    drawSubheading(doc, formSection.title);
    for (const item of rows) {
      drawKeyValue(doc, item.label, item.value);
    }
  }
}

export async function generateQuestionnairePdf(
  submissionId: string,
  data: FormAnswers,
  appConfig: AppConfig,
): Promise<Buffer> {
  const companyName = getCompanyName(data);
  const brandName = getBrandName(appConfig);
  const logoData = await loadLogoBuffer(appConfig);
  const logoBuffer = logoData?.buffer ?? null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawQuestionnaireHeader(doc, brandName, submissionId, logoBuffer);

    drawKeyValue(doc, 'Supplier', companyName);
    drawKeyValue(doc, 'Contact', `${str(data, 'contactName') || '—'} (${getContactEmail(data) || '—'})`);
    drawKeyValue(doc, 'Submitted', new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }));
    doc.moveDown(0.5);

    drawHeading(doc, 'Questionnaire Responses', 13);
    drawQuestionnaireResponses(doc, data, appConfig);

    doc.moveDown(1);
    ensureSpace(doc, 30);
    doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text(
      `Generated ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })} · ${pdfFooterText(brandName)}`,
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, align: 'center' },
    );

    doc.end();
  });
}

export async function generateAssessmentPdf(
  submissionId: string,
  data: FormAnswers,
  appConfig: AppConfig,
  files: SavedFile[],
  assessment: SupplierAssessment,
): Promise<Buffer> {
  const assessor = getAssessorName(appConfig);
  const companyName = getCompanyName(data);
  const brandName = getBrandName(appConfig);
  const logoData = await loadLogoBuffer(appConfig);
  const logoBuffer = logoData?.buffer ?? null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawAssessmentHeader(doc, brandName, companyName, submissionId, logoBuffer);

    const cardY = doc.y;
    const cardHeight = estimateCardHeight(assessment.categories.length);
    drawAssessmentCardBackground(doc, cardY, cardHeight);

    drawReportIntro(doc, companyName, assessment.assessmentDate, assessor, assessment);
    drawMatrixTable(doc, assessment);

    doc.y = cardY + cardHeight + 20;

    drawSectionHeading(doc, 'Strengths', COLORS.green);
    drawStyledBullets(doc, assessment.strengths, true);

    drawSectionHeading(doc, 'Areas for Improvement', COLORS.orange);
    drawStyledBullets(doc, assessment.improvements);

    drawSectionHeading(doc, 'Required Actions', COLORS.red);
    drawStyledBullets(doc, assessment.requiredActions);

    doc.moveDown(1);
    ensureSpace(doc, 30);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray).text(
      `Report generated ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })} · ${pdfFooterText(brandName)}`,
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, align: 'center' },
    );

    void files;
    doc.end();
  });
}

export async function saveAssessmentPdf(
  submissionDir: string,
  data: FormAnswers,
  pdfBuffer: Buffer,
): Promise<string> {
  const filename = buildPdfFilename(data);
  const filePath = path.join(submissionDir, filename);
  await fs.writeFile(filePath, pdfBuffer);
  return filename;
}

export async function saveQuestionnairePdf(
  submissionDir: string,
  data: FormAnswers,
  pdfBuffer: Buffer,
): Promise<string> {
  const filename = buildQuestionnairePdfFilename(data);
  const filePath = path.join(submissionDir, filename);
  await fs.writeFile(filePath, pdfBuffer);
  return filename;
}
