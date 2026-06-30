import type { APIRoute } from 'astro';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { loadAppConfig } from '../../lib/app-config';
import { sendSubmissionEmail } from '../../lib/email';
import { generateAssessmentPdf, saveAssessmentPdf, generateQuestionnairePdf, saveQuestionnairePdf } from '../../lib/pdf-report';
import { parseFormAnswers, validateFormAnswers, validateCertificationUpload } from '../../lib/form-utils';
import { scoreSupplier } from '../../lib/scoring';
import { saveSubmissionFiles, saveSubmissionMetadata } from '../../lib/storage';
import { config, resolveUploadDir } from '../../lib/config';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const appConfig = await loadAppConfig();

    if (formData.get('_honeypot')) {
      return new Response(JSON.stringify({ ok: true, submissionId: 'ignored' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const answers = parseFormAnswers(formData, appConfig);
    const errors = [
      ...validateFormAnswers(answers, appConfig),
      ...validateCertificationUpload(formData, answers),
    ];

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: errors.join(' ') }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rawFiles = formData.getAll('attachments').filter((item): item is File => item instanceof File && item.size > 0);

    if (rawFiles.length > config.maxFiles) {
      return new Response(JSON.stringify({ error: `Maximum ${config.maxFiles} files allowed.` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const submissionId = uuidv4();
    const assessment = scoreSupplier(answers, appConfig.scoringCategories, appConfig.supplierReviewSchedules);
    const savedFiles = await saveSubmissionFiles(submissionId, rawFiles);

    const uploadDir = resolveUploadDir();
    const submissionDir = path.join(uploadDir, submissionId);
    const pdfBuffer = await generateAssessmentPdf(submissionId, answers, appConfig, savedFiles, assessment);
    const pdfFilename = await saveAssessmentPdf(submissionDir, answers, pdfBuffer);
    const pdfReportPath = path.join(submissionDir, pdfFilename);

    const questionnaireBuffer = await generateQuestionnairePdf(submissionId, answers, appConfig);
    const questionnaireFilename = await saveQuestionnairePdf(submissionDir, answers, questionnaireBuffer);

    await saveSubmissionMetadata(submissionId, {
      id: submissionId,
      submittedAt: new Date().toISOString(),
      answers,
      assessment,
      files: savedFiles,
      pdfReport: pdfFilename,
      pdfQuestionnaire: questionnaireFilename,
    });

    const attachmentPaths = savedFiles.map((file) => path.join(uploadDir, file.relativePath));

    let emailSent = true;
    let emailError: string | undefined;

    try {
      await sendSubmissionEmail(
        submissionId,
        answers,
        appConfig,
        savedFiles,
        attachmentPaths,
        assessment,
        pdfReportPath,
      );
    } catch (error) {
      emailSent = false;
      emailError = error instanceof Error ? error.message : 'Email failed to send';
      console.error('Email error:', error);
    }

    return new Response(JSON.stringify({ ok: true, submissionId, assessment, emailSent, emailError }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Submit error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
