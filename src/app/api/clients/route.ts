import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClientRecord, listClientRecords, getClientRecord, updateClientRecord, deleteClientRecord, resolveKey } from '@/lib/db';
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

    const hindsightKey = resolveKey('HINDSIGHT_API_KEY', 'HINDSIGHT_API_KEY');
    let hindsightWarning: string | undefined;
    let bankProvisioned = false;

    // 1. Provision bank in Hindsight first if configured
    if (hindsightKey) {
      try {
        const hindsight = getHindsightClient();
        await hindsight.ensureClientBank(hindsightBankId, name);
        bankProvisioned = true;
      } catch (hindsightErr: any) {
        // Non-fatal: can still create locally
        hindsightWarning = `Hindsight bank provisioning failed: ${hindsightErr?.message || hindsightErr}`;
      }
    } else {
      hindsightWarning = 'Hindsight API key not configured. Client saved locally — add your Hindsight key in Settings to enable memory features.';
    }

    // 2. Persist in local SQLite database; if this fails, clean up the provisioned Hindsight bank to prevent orphans
    try {
      createClientRecord(client);
    } catch (dbErr: any) {
      if (bankProvisioned && hindsightKey) {
        try {
          const hindsight = getHindsightClient();
          await hindsight.deleteBank(hindsightBankId);
        } catch {
          // Best effort rollback
        }
      }
      throw dbErr;
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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const clientId = (body.id || body.clientId || '').trim();
    const name = (body.name || '').trim();

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required.' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Client name cannot be empty.' },
        { status: 400 }
      );
    }

    const updated = updateClientRecord(clientId, name);
    if (!updated) {
      return NextResponse.json(
        { error: `Client with ID '${clientId}' not found.` },
        { status: 404 }
      );
    }

    // Also update bank name in Hindsight if configured
    const hindsightKey = resolveKey('HINDSIGHT_API_KEY', 'HINDSIGHT_API_KEY');
    if (hindsightKey) {
      try {
        const hindsight = getHindsightClient();
        await hindsight.ensureClientBank(updated.hindsight_bank_id, name);
      } catch {
        // Non-fatal if bank doesn't exist yet
      }
    }

    return NextResponse.json({ client: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to update client' },
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

    const client = getClientRecord(clientId);
    if (client) {
      // Clean up Hindsight bank if configured
      const hindsightKey = resolveKey('HINDSIGHT_API_KEY', 'HINDSIGHT_API_KEY');
      if (hindsightKey) {
        try {
          const hindsight = getHindsightClient();
          await hindsight.deleteBank(client.hindsight_bank_id);
        } catch {
          // Non-fatal if bank already removed
        }
      }
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
