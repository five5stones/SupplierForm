import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config';
import { defaultAppConfig, defaultSupplierReviewSchedules } from './default-config';
import type { AppConfig, FormSection, SupplierReviewSchedule } from './types';

function configPath(): string {
  return path.resolve(config.dataDir, 'app-config.json');
}

export async function loadAppConfig(): Promise<AppConfig> {
  const filePath = configPath();

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as AppConfig;
    return mergeWithDefaults(parsed);
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

function mergeWithDefaults(parsed: AppConfig): AppConfig {
  const base = structuredClone(defaultAppConfig);

  return {
    version: parsed.version ?? base.version,
    settings: {
      ...base.settings,
      ...parsed.settings,
      notifyEmail: parsed.settings?.notifyEmail || config.notifyEmail,
    },
    sections: ensureSupplierTypeField(parsed.sections?.length ? parsed.sections : base.sections),
    scoringCategories: parsed.scoringCategories?.length ? parsed.scoringCategories : base.scoringCategories,
    supplierReviewSchedules: mergeReviewSchedules(parsed.supplierReviewSchedules),
  };
}

export async function saveAppConfig(appConfig: AppConfig): Promise<void> {
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(configPath(), JSON.stringify(appConfig, null, 2), 'utf-8');
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
