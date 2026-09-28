import { NextRequest, NextResponse } from 'next/server';
import { getClientRecord, listSourcesForClient } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClientRecord(id);
    if (!client) {
      return NextResponse.json(
        { error: `Client with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    const sources = listSourcesForClient(id);
    return NextResponse.json({ client, sources });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve client' },
      { status: 500 }
    );
  }
}
