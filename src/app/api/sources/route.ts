import { NextRequest, NextResponse } from 'next/server';
import { listSourcesForClient, getSourceRecord, getClientRecord, deleteSourceRecord, resolveKey } from '@/lib/db';
import { getHindsightClient } from '@/lib/hindsight';
import { ingestTranscript } from '@/lib/ingestion';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId query parameter is required.' },
        { status: 400 }
      );
    }

    const sources = listSourcesForClient(clientId);
    return NextResponse.json({ sources });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to list sources' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentTypeHeader = req.headers.get('content-type') || '';

    let clientId = '';
    let filename = '';
    let textContent = '';
    let sizeBytes = 0;
    let contentType = 'text/plain';

    if (contentTypeHeader.includes('multipart/form-data')) {
      const { searchParams } = new URL(req.url);
      const formData = await req.formData();
      clientId = (formData.get('clientId') as string || searchParams.get('clientId') || '').trim();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No transcript file provided in upload.' },
          { status: 400 }
        );
      }

      filename = file.name;
      sizeBytes = file.size;
      contentType = file.type || 'text/plain';
      textContent = await file.text();
    } else if (contentTypeHeader.includes('application/json')) {
      // Programmatic ingestion support for testing (Rule 34)
      const json = await req.json();
      clientId = (json.clientId || '').trim();
      filename = (json.filename || 'transcript.txt').trim();
      textContent = json.content || '';
      sizeBytes = Buffer.byteLength(textContent, 'utf8');
      contentType = json.contentType || 'text/plain';
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Please use multipart/form-data or application/json.' },
        { status: 415 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required.' },
        { status: 400 }
      );
    }

    const result = await ingestTranscript(clientId, {
      filename,
      contentType,
      sizeBytes,
      content: textContent,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, source: result.source },
        { status: 422 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to ingest transcript' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get('sourceId') || searchParams.get('id');

    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId query parameter is required.' },
        { status: 400 }
      );
    }

    const source = getSourceRecord(sourceId);
    if (!source) {
      return NextResponse.json(
        { error: `Source with ID '${sourceId}' not found.` },
        { status: 404 }
      );
    }

    // Attempt to delete from Hindsight if configured and document exists
    const client = getClientRecord(source.client_id);
    const hindsightKey = resolveKey('HINDSIGHT_API_KEY', 'HINDSIGHT_API_KEY');
    if (client && hindsightKey && source.hindsight_document_id) {
      try {
        const hindsight = getHindsightClient();
        await hindsight.deleteDocument(client.hindsight_bank_id, source.hindsight_document_id);
      } catch {
        // Non-fatal if document does not exist in Hindsight
      }
    }

    deleteSourceRecord(sourceId);
    return NextResponse.json({ success: true, sourceId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to delete source document' },
      { status: 500 }
    );
  }
}
