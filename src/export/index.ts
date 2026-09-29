/**
 * Dispatcher central de exportação — gera o blob e salva
 * preferencialmente na pasta do usuário (/Exportacoes), com fallback download.
 */

import { generatePDF } from './pdf';
import { generateDocx } from './docx';
import { generateXLSX, xlsxToBlob } from './xlsx';
import { generateMarkdown } from './markdown';
import { buildPayload, type ExportScope } from './payload';
import { saveToFolder, buildFileName, downloadFile } from '@/filesystem';
import { exportJSON } from '@/db/actions';
import type { ExportFormat } from '@/types';

export type { ExportScope };

const MIME: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  md: 'text/markdown',
  json: 'application/json',
};

const PREFIX: Record<ExportFormat, string> = {
  pdf: 'DR_Diario',
  docx: 'DR_Diario',
  xlsx: 'DR_Planilha',
  md: 'DR_Diario',
  json: 'DR_Backup',
};

export interface ExportResult {
  destination: 'folder' | 'download';
  filename: string;
}

/** Exporta no formato escolhido para o escopo escolhido */
export async function exportData(
  format: ExportFormat,
  scope: ExportScope,
  withCover = false,
): Promise<ExportResult> {
  const payload = await buildPayload(scope);

  let blob: Blob;
  switch (format) {
    case 'pdf': {
      const doc = generatePDF(payload, withCover);
      blob = doc.output('blob');
      break;
    }
    case 'docx':
      blob = await generateDocx(payload);
      break;
    case 'xlsx':
      blob = xlsxToBlob(generateXLSX(payload));
      break;
    case 'md':
      blob = new Blob([generateMarkdown(payload)], { type: MIME.md });
      break;
    case 'json':
      blob = new Blob([await exportJSON()], { type: MIME.json });
      break;
  }

  const filename = buildFileName(PREFIX[format], format);
  const destination = await saveToFolder('Exportacoes', filename, blob, MIME[format]);
  if (destination === 'download') {
    // saveToFolder já dispara o download no fallback
    void downloadFile;
  }
  return { destination, filename };
}
