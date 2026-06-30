import fs from 'node:fs/promises';
import path from 'node:path';
import { allowedExtensions, allowedMimeTypes, config, resolveUploadDir } from './config';

export interface SavedFile {
  originalName: string;
  savedName: string;
  mimeType: string;
  size: number;
  relativePath: string;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getExtension(name: string): string {
  return path.extname(name).toLowerCase();
}

export async function saveSubmissionFiles(
  submissionId: string,
  files: File[],
): Promise<SavedFile[]> {
  const uploadDir = resolveUploadDir();
  const submissionDir = path.join(uploadDir, submissionId);
  await fs.mkdir(submissionDir, { recursive: true });

  const saved: SavedFile[] = [];
  const maxBytes = config.maxFileSizeMb * 1024 * 1024;

  for (const file of files.slice(0, config.maxFiles)) {
    const ext = getExtension(file.name);
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`File type not allowed: ${file.name}`);
    }
    if (!allowedMimeTypes.includes(file.type) && file.type !== '') {
      throw new Error(`MIME type not allowed: ${file.name}`);
    }
    if (file.size > maxBytes) {
      throw new Error(`File too large (max ${config.maxFileSizeMb}MB): ${file.name}`);
    }

    const savedName = `${Date.now()}-${sanitizeFilename(file.name)}`;
    const filePath = path.join(submissionDir, savedName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    saved.push({
      originalName: file.name,
      savedName,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      relativePath: path.join(submissionId, savedName),
    });
  }

  return saved;
}

export async function saveSubmissionMetadata(
  submissionId: string,
  metadata: unknown,
): Promise<void> {
  const uploadDir = resolveUploadDir();
  const submissionDir = path.join(uploadDir, submissionId);
  await fs.mkdir(submissionDir, { recursive: true });
  await fs.writeFile(
    path.join(submissionDir, 'submission.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8',
  );
}

export async function listSubmissions(): Promise<Array<{ id: string; metadata: Record<string, unknown> }>> {
  const uploadDir = resolveUploadDir();
  let entries: string[] = [];
  try {
    entries = await fs.readdir(uploadDir);
  } catch {
    return [];
  }

  const submissions = await Promise.all(
    entries.map(async (id) => {
      try {
        const raw = await fs.readFile(path.join(uploadDir, id, 'submission.json'), 'utf-8');
        return { id, metadata: JSON.parse(raw) as Record<string, unknown> };
      } catch {
        return null;
      }
    }),
  );

  return submissions
    .filter((item): item is { id: string; metadata: Record<string, unknown> } => item !== null)
    .sort((a, b) => String(b.metadata.submittedAt || '').localeCompare(String(a.metadata.submittedAt || '')));
}

export async function getSubmission(id: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(resolveUploadDir(), id, 'submission.json'), 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function listSubmissionFiles(id: string): Promise<string[]> {
  try {
    const dir = path.join(resolveUploadDir(), id);
    const entries = await fs.readdir(dir);
    return entries.filter((name) => name !== 'submission.json');
  } catch {
    return [];
  }
}
