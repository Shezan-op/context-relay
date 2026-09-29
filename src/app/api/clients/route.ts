import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClientRecord, listClientRecords, deleteClientRecord, resolveKey } from '@/lib/db';
import { getHindsightClient } from '@/lib/hindsight';

export async function GET() {
  try {
    const clients = listClientRecords();
    return NextResponse.json({ clients });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to list clients' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || '').trim();

    if (!name) {
      return NextResponse.json(
        { error: 'Client name is required.' },
        { status: 400 }
      );
    }

    const clientId = randomUUID();
    const hindsightBankId = `client:${clientId}`;
    const now = new Date().toISOString();

    const client = {
      id: clientId,
      name,
      hindsight_bank_id: hindsightBankId,
      created_at: now,
    };

    // Save record in SQLite first (always succeeds)
    createClientRecord(client);

    // Optionally provision bank in Hindsight — only if API key is configured
    const hindsightKey = resolveKey('HINDSIGHT_API_KEY', 'HINDSIGHT_API_KEY');
    let hindsightWarning: string | undefined;

    if (hindsightKey) {
      try {
        const hindsight = getHindsightClient();
        await hindsight.ensureClientBank(hindsightBankId, name);
      } catch (hindsightErr: any) {
        // Non-fatal: client is saved locally, Hindsight can be provisioned later
        hindsightWarning = `Client saved locally. Hindsight bank provisioning failed: ${hindsightErr?.message || hindsightErr}`;
      }
    } else {
      hindsightWarning = 'Hindsight API key not configured. Client saved locally — add your Hindsight key in Settings to enable memory features.';
    }

    return NextResponse.json(
      { client, warning: hindsightWarning },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to create client' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId query parameter is required.' },
        { status: 400 }
      );
    }

    deleteClientRecord(clientId);
    return NextResponse.json({ success: true, clientId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to delete client' },
      { status: 500 }
    );
  }
}
