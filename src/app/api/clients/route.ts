import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClientRecord, listClientRecords } from '@/lib/db';
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

    // Provision bank in Hindsight with client memory mission
    const hindsight = getHindsightClient();
    await hindsight.ensureClientBank(hindsightBankId, name);

    // Save record in SQLite
    createClientRecord(client);

    return NextResponse.json({ client }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to create client' },
      { status: 500 }
    );
  }
}
