import fs from 'node:fs/promises';
import path from 'node:path';
import { loadAppConfig } from './app-config';
import { getSubmission } from './storage';
import type { SavedFile } from './storage';
import type { FormAnswers } from './types';
import type { SupplierAssessment } from './scoring';
import { resolveUploadDir } from './config';
import {
  buildPdfFilename,
  buildQuestionnairePdfFilename,
  generateAssessmentPdf,
  generateQuestionnairePdf,
} from './pdf-report';

export interface SubmissionContext {
  id: string;
  metadata: Record<string, unknown>;
  answers: FormAnswers;
  assessment: SupplierAssessment;
  files: SavedFile[];
  submissionDir: string;
}

export async function loadSubmissionContext(id: string): Promise<SubmissionContext | null> {
  const metadata = await getSubmission(id);
  if (!metadata) return null;

  const answers = (metadata.answers || metadata) as FormAnswers;
  const assessment = metadata.assessment as SupplierAssessment;
  const files = Array.isArray(metadata.files) ? (metadata.files as SavedFile[]) : [];

  return {
    id,
    metadata,
    answers,
    assessment,
    files,
    submissionDir: path.join(resolveUploadDir(), id),
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureAssessmentPdf(ctx: SubmissionContext): Promise<{ filename: string; filePath: string }> {
  const appConfig = await loadAppConfig();
  const filename = String(ctx.metadata.pdfReport || buildPdfFilename(ctx.answers));
  const filePath = path.join(ctx.submissionDir, filename);
  const buffer = await generateAssessmentPdf(ctx.id, ctx.answers, appConfig, ctx.files, ctx.assessment);
  await fs.writeFile(filePath, buffer);
  ctx.metadata.pdfReport = filename;
  return { filename, filePath };
}

export async function ensureQuestionnairePdf(ctx: SubmissionContext): Promise<{ filename: string; filePath: string }> {
  const appConfig = await loadAppConfig();
  let filename = String(ctx.metadata.pdfQuestionnaire || buildQuestionnairePdfFilename(ctx.answers));
  let filePath = path.join(ctx.submissionDir, filename);

  if (!(await fileExists(filePath))) {
    const buffer = await generateQuestionnairePdf(ctx.id, ctx.answers, appConfig);
    await fs.writeFile(filePath, buffer);
    ctx.metadata.pdfQuestionnaire = filename;
  }

  return { filename, filePath };
}

export function getAttachmentFiles(ctx: SubmissionContext): SavedFile[] {
  return ctx.files.filter((file) => file.savedName && file.originalName);
}
