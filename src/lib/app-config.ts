import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config';
import { defaultAppConfig, defaultSupplierReviewSchedules } from './default-config';
import type { AppConfig, FormSection, SupplierReviewSchedule } from './types';
import { normalizeLogoUrl, getLogoDisplayUrl, syncLogoFileState } from './logo';

function configPath(): string {
  return path.resolve(config.dataDir, 'app-config.json');
}

export async function loadAppConfig(): Promise<AppConfig> {
  const filePath = configPath();

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as AppConfig;
    const merged = mergeWithDefaults(parsed);
    const synced = await syncLogoFileState(merged);
    if (synced.settings.logoUpdatedAt !== merged.settings.logoUpdatedAt) {
      await saveAppConfig(synced);
    }
    return synced;
  } catch {
    await saveAppConfig(defaultAppConfig);
    return structuredClone(defaultAppConfig);
  }
}

function mergeReviewSchedules(parsed: SupplierReviewSchedule[] | undefined): SupplierReviewSchedule[] {
  if (!parsed?.length) return structuredClone(defaultSupplierReviewSchedules);

  const defaultsById = new Map(defaultSupplierReviewSchedules.map((item) => [item.id, item]));
  const merged = parsed.map((item) => ({
    id: item.id || defaultsById.get(item.id)?.id || '',
    label: item.label || defaultsById.get(item.id)?.label || 'Supplier type',
    reviewMonths: Number(item.reviewMonths) > 0 ? Number(item.reviewMonths) : 12,
  })).filter((item) => item.id);

  for (const fallback of defaultSupplierReviewSchedules) {
    if (!merged.some((item) => item.id === fallback.id)) {
      merged.push(structuredClone(fallback));
    }
  }

  return merged;
}

function ensureSupplierTypeField(sections: FormSection[]): FormSection[] {
  const updated = structuredClone(sections);
  const companySection = updated.find((section) => section.id === 'company-details');
  if (!companySection) return updated;

  const existing = companySection.fields.find((field) => field.id === 'supplierType');
  if (existing) {
    existing.type = 'checkbox-group';
    existing.label = 'Supplier Type(s)';
    existing.required = true;
    return updated;
  }

  const companyNameIndex = companySection.fields.findIndex((field) => field.id === 'companyName');
  const insertAt = companyNameIndex >= 0 ? companyNameIndex + 1 : 0;
  companySection.fields.splice(insertAt, 0, {
    id: 'supplierType',
    type: 'checkbox-group',
    label: 'Supplier Type(s)',
    required: true,
  });

  return updated;
}

function ensureDocumentOptionHints(sections: FormSection[]): FormSection[] {
  const updated = structuredClone(sections);
  const docSection = updated.find((section) => section.id === 'section-9');
  if (!docSection) return updated;

  const documentTypes = docSection.fields.find((field) => field.id === 'documentTypes');
  if (!documentTypes?.options) return updated;

  const salsaOption = documentTypes.options.find(
    (option) => option.value === 'SALSA/BRCGS/ISO Certificate',
  );
  if (salsaOption) {
    salsaOption.hint = '*please provide a copy';
  }

  return updated;
}

function ensureFsmsTypeHints(sections: FormSection[]): FormSection[] {
  const updated = structuredClone(sections);
  const fsmsSection = updated.find((section) => section.id === 'section-2');
  if (!fsmsSection) return updated;

  const fsmsTypes = fsmsSection.fields.find((field) => field.id === 'fsmsTypes');
  if (!fsmsTypes?.options) return updated;

  const certHint = '*please upload a copy of your certificate in Section 9';
  for (const value of ['SALSA', 'BRCGS'] as const) {
    const option = fsmsTypes.options.find((item) => item.value === value);
    if (option) option.hint = certHint;
  }

  return updated;
}

function mergeWithDefaults(parsed: AppConfig): AppConfig {
  const base = structuredClone(defaultAppConfig);

  return {
    version: parsed.version ?? base.version,
    settings: {
      ...base.settings,
      ...parsed.settings,
      companyName:
        parsed.settings?.companyName?.trim() ||
        parsed.settings?.formEyebrow?.trim() ||
        base.settings.companyName,
      logoUrl: normalizeLogoUrl(parsed.settings?.logoUrl),
      logoFile: parsed.settings?.logoFile?.trim() || '',
      logoUpdatedAt: parsed.settings?.logoUpdatedAt,
      notifyEmail: parsed.settings?.notifyEmail || config.notifyEmail,
      smtpHost: parsed.settings?.smtpHost?.trim() ?? base.settings.smtpHost,
      smtpPort: Number(parsed.settings?.smtpPort) > 0 ? Number(parsed.settings.smtpPort) : base.settings.smtpPort,
      smtpSecure: parsed.settings?.smtpSecure ?? base.settings.smtpSecure,
      smtpUser: parsed.settings?.smtpUser?.trim() ?? base.settings.smtpUser,
      smtpPass: parsed.settings?.smtpPass?.trim() || undefined,
      smtpFrom: parsed.settings?.smtpFrom?.trim() ?? base.settings.smtpFrom,
    },
    sections: ensureFsmsTypeHints(
      ensureDocumentOptionHints(
        ensureSupplierTypeField(parsed.sections?.length ? parsed.sections : base.sections),
      ),
    ),
    scoringCategories: parsed.scoringCategories?.length ? parsed.scoringCategories : base.scoringCategories,
    supplierReviewSchedules: mergeReviewSchedules(parsed.supplierReviewSchedules),
  };
}

export async function saveAppConfig(appConfig: AppConfig): Promise<void> {
  await fs.mkdir(config.dataDir, { recursive: true });
  const toSave = structuredClone(appConfig);
  delete toSave.settings.smtpPassConfigured;
  await fs.writeFile(configPath(), JSON.stringify(toSave, null, 2), 'utf-8');
}

export interface ResolvedSmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function getSmtpSettings(appConfig: AppConfig): ResolvedSmtpSettings {
  const settings = appConfig.settings;
  const user = settings.smtpUser?.trim() || config.smtp.user;
  const from =
    settings.smtpFrom?.trim() ||
    config.smtp.from ||
    (user ? `"Supplier Form" <${user}>` : '');

  return {
    host: settings.smtpHost?.trim() || config.smtp.host,
    port: settings.smtpPort > 0 ? settings.smtpPort : config.smtp.port,
    secure: settings.smtpSecure ?? config.smtp.secure,
    user,
    pass: settings.smtpPass?.trim() || config.smtp.pass,
    from,
  };
}

export function sanitizeAppConfigForAdmin(appConfig: AppConfig): AppConfig {
  const effective = getSmtpSettings(appConfig);
  const copy = structuredClone(appConfig);
  const savedSmtp = Boolean(
    appConfig.settings.smtpHost?.trim() ||
      appConfig.settings.smtpUser?.trim() ||
      appConfig.settings.smtpPass?.trim() ||
      appConfig.settings.smtpFrom?.trim(),
  );

  if (savedSmtp) {
    copy.settings.smtpHost = appConfig.settings.smtpHost;
    copy.settings.smtpPort = appConfig.settings.smtpPort || 587;
    copy.settings.smtpSecure = appConfig.settings.smtpSecure ?? false;
    copy.settings.smtpUser = appConfig.settings.smtpUser;
    copy.settings.smtpFrom = appConfig.settings.smtpFrom;
  } else {
    copy.settings.smtpHost = effective.host;
    copy.settings.smtpPort = effective.port;
    copy.settings.smtpSecure = effective.secure;
    copy.settings.smtpUser = effective.user;
    copy.settings.smtpFrom = effective.from;
  }

  copy.settings.notifyEmail = appConfig.settings.notifyEmail || config.notifyEmail;
  copy.settings.smtpPassConfigured = Boolean(effective.pass);
  delete copy.settings.smtpPass;

  return copy;
}

export async function prepareConfigForSave(incoming: AppConfig): Promise<AppConfig> {
  const existing = await loadAppConfig();
  const prepared = structuredClone(incoming);
  const newPass = prepared.settings.smtpPass?.trim();

  if (newPass) {
    prepared.settings.smtpPass = newPass;
  } else {
    prepared.settings.smtpPass = existing.settings.smtpPass;
  }

  delete prepared.settings.smtpPassConfigured;
  return prepared;
}

export function getBrandName(appConfig: AppConfig): string {
  return (
    appConfig.settings.companyName?.trim() ||
    appConfig.settings.formEyebrow?.trim() ||
    'Your Company'
  );
}

export function getLogoUrl(appConfig: AppConfig): string {
  return getLogoDisplayUrl(appConfig);
}

export function applyBrandTemplate(text: string, appConfig: AppConfig): string {
  return text.replace(/\{companyName\}/g, getBrandName(appConfig));
}

export function getNotifyEmail(appConfig: AppConfig): string {
  return appConfig.settings.notifyEmail || config.notifyEmail;
}

export function getAssessorName(appConfig: AppConfig): string {
  return appConfig.settings.assessorName || config.assessorName;
}

export function getAdminPassword(appConfig: AppConfig): string {
  return (appConfig.settings.adminPassword || config.adminPassword).trim();
}

export function getAllFieldIds(appConfig: AppConfig): string[] {
  return appConfig.sections.flatMap((section) =>
    section.fields.filter((f) => !['hint', 'file'].includes(f.type)).map((f) => f.id),
  );
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48) || `field_${Date.now()}`;
}
