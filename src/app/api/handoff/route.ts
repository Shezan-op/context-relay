import { NextRequest, NextResponse } from 'next/server';
import { generateClientHandoffBrief } from '@/lib/retrieval';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientId = (body.clientId || '').trim();

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required to generate an account handoff brief.' },
        { status: 400 }
      );
    }

    const result = await generateClientHandoffBrief(clientId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to generate account handoff brief' },
      { status: 500 }
    );
  }
}
