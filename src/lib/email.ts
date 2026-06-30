import nodemailer from 'nodemailer';
import type { AppConfig, FormAnswers } from './types';
import type { SavedFile } from './storage';
import type { SupplierAssessment } from './scoring';
import {
  getCompanyName,
  getContactEmail,
  sectionToRows,
} from './form-utils';
import { getAssessorName, getNotifyEmail } from './app-config';
import { config } from './config';
import {
  buildReviewReminderFilename,
  canGenerateReviewReminder,
  generateReviewReminderIcs,
} from './calendar-reminder';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;width:40%;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111827;white-space:pre-wrap;">${escapeHtml(value || '—')}</td>
    </tr>
  `;
}

function renderSection(title: string, rows: string): string {
  return `
    <h2 style="margin:28px 0 16px;font-size:16px;color:#1e3a5f;">${escapeHtml(title)}</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
      ${rows}
    </table>
  `;
}

function bulletList(items: string[]): string {
  if (!items.length) return '<p style="margin:0;color:#6b7280;font-size:14px;">None identified.</p>';
  return `<ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.6;">${items.map((item) => `<li style="margin-bottom:8px;">${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function getScoreColor(percentage: number): string {
  if (percentage >= 90) return '#059669';
  if (percentage >= 80) return '#2563eb';
  if (percentage >= 70) return '#d97706';
  if (percentage >= 60) return '#ea580c';
  return '#dc2626';
}

function buildAssessmentReport(assessment: SupplierAssessment, data: FormAnswers, appConfig: AppConfig): string {
  const color = getScoreColor(assessment.percentage);
  const assessor = getAssessorName(appConfig);

  const matrixRows = assessment.categories
    .map(
      (c) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;">${escapeHtml(c.label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${c.weight}%</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;font-weight:600;">${c.score}/5</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;font-weight:700;color:#1e3a5f;">${c.weightedScore}</td>
      </tr>
    `,
    )
    .join('');

  return `
    <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px;margin-bottom:32px;">
      <h2 style="margin:0 0 4px;font-size:20px;color:#1e3a5f;">Supplier Assessment Report</h2>
      <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">Automated risk assessment generated from questionnaire responses</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;font-size:14px;">
        ${row('Supplier', getCompanyName(data))}
        ${row('Supplier Type', assessment.supplierTypeLabel || '—')}
        ${row('Review Schedule', assessment.reviewInterval || '—')}
        ${row('Review Based On', assessment.reviewDriverLabel ? `${assessment.reviewDriverLabel} (shortest interval / highest risk)` : '—')}
        ${row('Assessment Date', assessment.assessmentDate)}
        ${row('Assessor', assessor)}
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;margin-bottom:20px;">
        <tr>
          <td style="padding:20px;text-align:center;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;">Overall Score</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:${color};">${assessment.totalWeightedScore} / ${assessment.maxScore}</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:${color};">${assessment.percentage}%</p>
          </td>
          <td style="padding:20px;text-align:center;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;">Risk Rating</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#1e3a5f;">${escapeHtml(assessment.riskLevel)}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#374151;">${escapeHtml(assessment.ratingLabel)}</p>
          </td>
          <td style="padding:20px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;">Approval Status</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:#1e3a5f;line-height:1.4;">${escapeHtml(assessment.approvalStatus)}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">Next review: ${escapeHtml(assessment.nextReviewDate)}</p>
          </td>
        </tr>
      </table>
      <h3 style="margin:0 0 12px;font-size:15px;color:#1e3a5f;">Scoring Matrix</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#1e3a5f;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#fff;">Category</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#fff;">Weight</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#fff;">Score</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#fff;">Weighted</th>
        </tr>
        ${matrixRows}
        <tr style="background:#f9fafb;font-weight:700;">
          <td style="padding:12px;font-size:13px;color:#1e3a5f;" colspan="3">Total Weighted Score</td>
          <td style="padding:12px;text-align:center;font-size:14px;color:${color};">${assessment.totalWeightedScore}</td>
        </tr>
      </table>
      <h3 style="margin:0 0 8px;font-size:15px;color:#059669;">Strengths</h3>
      ${bulletList(assessment.strengths)}
      <h3 style="margin:20px 0 8px;font-size:15px;color:#d97706;">Areas for Improvement</h3>
      ${bulletList(assessment.improvements)}
      <h3 style="margin:20px 0 8px;font-size:15px;color:#dc2626;">Required Actions</h3>
      ${bulletList(assessment.requiredActions)}
      ${
        canGenerateReviewReminder(assessment)
          ? `<div style="margin-top:24px;padding:16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#065f46;">Calendar reminder attached</p>
              <p style="margin:0;font-size:13px;color:#047857;line-height:1.5;">An <strong>.ics calendar file</strong> is attached for the next supplier review on <strong>${escapeHtml(assessment.nextReviewDate)}</strong>. Open it to add the reminder to Outlook, Google Calendar, or Apple Calendar (includes alerts 2 weeks and 1 week before).</p>
            </div>`
          : ''
      }
    </div>
  `;
}

function buildQuestionnaireDetails(data: FormAnswers, appConfig: AppConfig, files: SavedFile[]): string {
  const body = appConfig.sections
    .map((formSection) => {
      const rows = sectionToRows(formSection, data)
        .map((item) => row(item.label, item.value))
        .join('');
      if (!rows.trim()) return '';
      return renderSection(formSection.title, rows);
    })
    .join('');

  const fileRows = files.length
    ? files.map((f) => `<li style="margin-bottom:6px;">${escapeHtml(f.originalName)} (${Math.round(f.size / 1024)} KB)</li>`).join('')
    : '<li>No files uploaded</li>';

  return `${body}<h2 style="margin:28px 0 12px;font-size:16px;color:#1e3a5f;">Uploaded Files</h2><ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;">${fileRows}</ul>`;
}

export function buildEmailHtml(
  submissionId: string,
  data: FormAnswers,
  appConfig: AppConfig,
  files: SavedFile[],
  assessment: SupplierAssessment,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table width="720" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1e3a5f;padding:28px 32px;">
            <h1 style="margin:0;color:#fff;font-size:22px;">Your Company — Supplier Assessment</h1>
            <p style="margin:8px 0 0;color:#cbd5e1;font-size:14px;">${escapeHtml(getCompanyName(data))} · Submission ID: ${escapeHtml(submissionId)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${buildAssessmentReport(assessment, data, appConfig)}
            <h2 style="margin:0 0 16px;font-size:16px;color:#1e3a5f;border-top:2px solid #e5e7eb;padding-top:28px;">Full Questionnaire Responses</h2>
            ${buildQuestionnaireDetails(data, appConfig, files)}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
            Report generated ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export async function sendSubmissionEmail(
  submissionId: string,
  data: FormAnswers,
  appConfig: AppConfig,
  files: SavedFile[],
  attachmentPaths: string[],
  assessment: SupplierAssessment,
  pdfReportPath?: string,
): Promise<void> {
  const notifyEmail = getNotifyEmail(appConfig);
  if (!config.smtp.user || !config.smtp.pass || !notifyEmail) {
    throw new Error('Email is not configured. Set SMTP_USER, SMTP_PASS, and notify email.');
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });

  const html = buildEmailHtml(submissionId, data, appConfig, files, assessment);
  const from = config.smtp.from || `"Supplier Form" <${config.smtp.user}>`;
  const ratingShort = assessment.percentage >= 60 ? assessment.approvalStatus.split('—')[0].trim() : assessment.rating;

  const emailAttachments: Array<
    | { filename: string; path: string }
    | { filename: string; content: Buffer; contentType: string }
  > = [];

  if (pdfReportPath) {
    emailAttachments.push({
      filename: pdfReportPath.split('/').pop() || 'Supplier-Assessment-Report.pdf',
      path: pdfReportPath,
    });
  }

  const reviewIcs = generateReviewReminderIcs(submissionId, data, assessment);
  if (reviewIcs) {
    emailAttachments.push({
      filename: buildReviewReminderFilename(data),
      content: reviewIcs,
      contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
    });
  }

  emailAttachments.push(
    ...attachmentPaths.map((filePath, i) => ({
      filename: files[i]?.originalName || `attachment-${i + 1}`,
      path: filePath,
    })),
  );

  const calendarNote = canGenerateReviewReminder(assessment)
    ? ` Calendar reminder (.ics) attached for next review on ${assessment.nextReviewDate}.`
    : '';

  await transporter.sendMail({
    from,
    to: notifyEmail,
    replyTo: getContactEmail(data),
    subject: `Supplier Assessment — ${getCompanyName(data)} (${assessment.percentage}% — ${ratingShort})`,
    html,
    text: `Supplier assessment for ${getCompanyName(data)}: ${assessment.totalWeightedScore}/${assessment.maxScore} (${assessment.percentage}%) — ${assessment.approvalStatus}. Next review: ${assessment.nextReviewDate}. A PDF assessment report is attached.${calendarNote}`,
    attachments: emailAttachments,
  });
}
