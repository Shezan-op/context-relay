import { randomUUID } from 'node:crypto';
import {
  getClientRecord,
  createSourceRecord,
  updateSourceStatus,
  SourceRecord,
} from './db';
import { getHindsightClient } from './hindsight';

export interface IngestFileInput {
  filename: string;
  contentType: string;
  sizeBytes: number;
  content: string;
  meetingDate?: string | null;
}

export interface IngestResult {
  source: SourceRecord;
  success: boolean;
  message?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface IngestOptions {
  hindsight?: import('./hindsight').HindsightWrapper;
}

export async function ingestTranscript(
  clientId: string,
  fileInput: IngestFileInput,
  options?: IngestOptions
): Promise<IngestResult> {
  // 1. Validate client exists in SQLite
  const client = getClientRecord(clientId);
  if (!client) {
    throw new Error(`Client with ID '${clientId}' not found.`);
  }

  // 2. Validate filename extension
  const filename = (fileInput.filename || '').trim();
  const lowerName = filename.toLowerCase();
  if (!lowerName.endsWith('.txt') && !lowerName.endsWith('.md')) {
    throw new Error('Invalid file type. Viora only accepts .txt and .md transcript files.');
  }

  // 3. Validate content is non-empty
  const textContent = (fileInput.content || '').trim();
  if (!textContent) {
    throw new Error('Transcript file is empty. Please provide a file with non-empty text content.');
  }

  // 4. Validate file size
  if (fileInput.sizeBytes > MAX_FILE_SIZE || textContent.length > MAX_FILE_SIZE) {
    throw new Error(`File exceeds the 5MB size limit. Size: ${Math.round(fileInput.sizeBytes / 1024)} KB.`);
  }

  // 5. Generate source and document identifiers
  const sourceId = randomUUID();
  const hindsightDocId = `doc:${sourceId}`;
  const now = new Date().toISOString();

  const sourceRecord: SourceRecord = {
    id: sourceId,
    client_id: clientId,
    original_filename: filename,
    content_type: fileInput.contentType || (lowerName.endsWith('.md') ? 'text/markdown' : 'text/plain'),
    size_bytes: fileInput.sizeBytes || Buffer.byteLength(textContent, 'utf8'),
    meeting_date: fileInput.meetingDate || null,
    hindsight_document_id: hindsightDocId,
    ingestion_status: 'processing',
    error_message: null,
    created_at: now,
  };

  // 6. Record source in SQLite with status 'processing'
  createSourceRecord(sourceRecord);

  // 7. Retain in Hindsight
  const hindsight = options?.hindsight || getHindsightClient();
  try {
    // Ensure bank exists with mission
    await hindsight.ensureClientBank(client.hindsight_bank_id, client.name);

    // Call retain
    await hindsight.retainTranscript(client.hindsight_bank_id, textContent, hindsightDocId, {
      sourceId,
      filename,
      meetingDate: fileInput.meetingDate || '',
    });

    // 8. Update status to 'stored'
    updateSourceStatus(sourceId, 'stored', null);
    sourceRecord.ingestion_status = 'stored';

    return {
      source: sourceRecord,
      success: true,
      message: 'Transcript successfully retained in Hindsight client memory.',
    };
  } catch (err: any) {
    // 9. On failure, update status to 'failed' and preserve readable error
    const rawError = err?.message || String(err);
    const safeError = `Ingestion failed: ${rawError.replace(/([A-Za-z0-9_-]{20,})/g, '***')}`;
    
    updateSourceStatus(sourceId, 'failed', safeError);
    sourceRecord.ingestion_status = 'failed';
    sourceRecord.error_message = safeError;

    return {
      source: sourceRecord,
      success: false,
      message: safeError,
    };
  }
}
