import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AppConfig, FormAnswers, FormField, FormSection } from './types';

export function str(data: FormAnswers, key: string): string {
  const value = data[key];
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return '';
}

export function multi(data: FormAnswers, key: string): string[] {
  const value = data[key];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value) return [value];
  return [];
}

export function bool(data: FormAnswers, key: string): boolean {
  const value = data[key];
  return value === true || value === 'on' || value === 'yes';
}

export function parseFormAnswers(formData: FormData, appConfig: AppConfig): FormAnswers {
  const answers: FormAnswers = {};

  for (const section of appConfig.sections) {
    for (const field of section.fields) {
      if (field.type === 'hint' || field.type === 'file') continue;

      if (field.type === 'checkbox-group') {
        answers[field.id] = formData.getAll(field.id).map(String);
        continue;
      }

      if (field.type === 'declaration') {
        answers[field.id] = formData.get(field.id) === 'on';
        continue;
      }

      answers[field.id] = str({ [field.id]: String(formData.get(field.id) || '') }, field.id);
    }
  }

  return answers;
}

export function validateFormAnswers(answers: FormAnswers, appConfig: AppConfig): string[] {
  const errors: string[] = [];

  for (const section of appConfig.sections) {
    for (const field of section.fields) {
      if (!field.required || field.type === 'hint' || field.type === 'file') continue;

      if (field.type === 'checkbox-group') {
        const values = multi(answers, field.id);
        if (!values.length) errors.push(`${field.label} is required.`);
        continue;
      }

      if (field.type === 'declaration') {
        if (!bool(answers, field.id)) errors.push('You must accept the supplier declaration.');
        continue;
      }

      const value = str(answers, field.id);
      if (!value) errors.push(`${field.label} is required.`);

      if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${field.label} is invalid.`);
      }
    }
  }

  return errors;
}

const CERT_DOCUMENT_TYPE = 'SALSA/BRCGS/ISO Certificate';
const FSMS_CERT_TYPES = new Set(['SALSA', 'BRCGS']);

export function validateCertificationUpload(formData: FormData, answers: FormAnswers): string[] {
  const fsmsTypes = multi(answers, 'fsmsTypes');
  if (!fsmsTypes.some((type) => FSMS_CERT_TYPES.has(type))) return [];

  const errors: string[] = [];
  const documentTypes = formData.getAll('documentTypes').map(String);

  if (!documentTypes.includes(CERT_DOCUMENT_TYPE)) {
    errors.push('Please tick SALSA/BRCGS/ISO Certificate in Section 9.');
  }

  const hasUpload = formData
    .getAll('attachments')
    .some((item) => item instanceof File && item.size > 0);

  if (!hasUpload) {
    errors.push('Please upload a copy of your SALSA or BRCGS certificate in Section 9.');
  }

  return errors;
}

export function formatYesNo(value: string): string {
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  if (value === 'na') return 'N/A';
  if (value === 'external') return 'External Contractor';
  if (value === 'internal') return 'Internal';
  return value || '—';
}

export function formatFieldValue(field: FormField, answers: FormAnswers): string {
  if (field.type === 'checkbox-group') {
    const values = multi(answers, field.id);
    return values.length ? values.join(', ') : '—';
  }
  if (field.type === 'declaration') {
    return bool(answers, field.id) ? 'Yes' : 'No';
  }
  const value = str(answers, field.id);
  if (field.type === 'radio') return formatYesNo(value);
  if (field.type === 'select') {
    const option = (field.options || []).find((item) => item.value === value);
    return option?.label || value || '—';
  }
  return value || '—';
}

export function getCompanyName(answers: FormAnswers): string {
  return str(answers, 'companyName') || 'Unknown Supplier';
}

export function getContactEmail(answers: FormAnswers): string {
  return str(answers, 'email') || str(answers, 'contactEmail');
}

export function getAssessmentDate(answers: FormAnswers): string {
  return str(answers, 'dateCompleted') || str(answers, 'declarationDate');
}

export function sectionToRows(section: FormSection, answers: FormAnswers): { label: string; value: string }[] {
  return section.fields
    .filter((field) => !['hint', 'file', 'declaration'].includes(field.type))
    .map((field) => ({
      label: field.number ? `${field.number}. ${field.label}` : field.label,
      value: formatFieldValue(field, answers),
    }));
}
