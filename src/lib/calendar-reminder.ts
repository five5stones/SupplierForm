import type { FormAnswers } from './types';
import type { SupplierAssessment } from './scoring';
import { getAssessmentDate, getCompanyName } from './form-utils';

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function formatIcsDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50) || 'supplier';
}

function getReviewDate(answers: FormAnswers, assessment: SupplierAssessment): Date | null {
  if (assessment.approvalMonths <= 0) return null;
  if (assessment.nextReviewDate === 'Re-assessment required before approval') return null;

  const dateStr = getAssessmentDate(answers);
  const baseDate = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(baseDate.getTime())) return null;

  return startOfDayUtc(addMonths(baseDate, assessment.approvalMonths));
}

export function canGenerateReviewReminder(assessment: SupplierAssessment): boolean {
  return assessment.approvalMonths > 0 && assessment.nextReviewDate !== 'Re-assessment required before approval';
}

export function generateReviewReminderIcs(
  submissionId: string,
  answers: FormAnswers,
  assessment: SupplierAssessment,
): Buffer | null {
  const reviewDate = getReviewDate(answers, assessment);
  if (!reviewDate) return null;

  const companyName = getCompanyName(answers);
  const endDate = new Date(reviewDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  const summary = `Supplier Review Due — ${companyName}`;
  const description = escapeIcsText(
    [
      `Your Company supplier review reminder`,
      '',
      `Supplier: ${companyName}`,
      `Type(s): ${assessment.supplierTypeLabel || '—'}`,
      `Review schedule: ${assessment.reviewInterval || '—'}`,
      `Score: ${assessment.totalWeightedScore}/${assessment.maxScore} (${assessment.percentage}%)`,
      `Status: ${assessment.approvalStatus}`,
      `Submission ID: ${submissionId}`,
    ].join('\n'),
  );

  const uid = `${submissionId}@supplier-form-supplier-form`;
  const dtStamp = formatIcsDateTime(new Date());
  const dtStart = formatIcsDate(reviewDate);
  const dtEnd = formatIcsDate(endDate);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Your Company//Supplier Review Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'TRIGGER:-P14D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Supplier review due in 2 weeks',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P7D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Supplier review due in 1 week',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');

  return Buffer.from(ics, 'utf-8');
}

export function buildReviewReminderFilename(answers: FormAnswers): string {
  return `Supplier-Review-Reminder-${sanitizeFilename(getCompanyName(answers))}.ics`;
}
