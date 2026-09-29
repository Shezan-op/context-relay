import { NextRequest, NextResponse } from 'next/server';
import { getDecisionTimeline } from '@/lib/retrieval';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = (searchParams.get('clientId') || '').trim();

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId query parameter is required.' },
        { status: 400 }
      );
    }

    const result = await getDecisionTimeline(clientId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve decision timeline' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const clientId = (body.clientId || '').trim();

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required in request body.' },
        { status: 400 }
      );
    }

    const result = await getDecisionTimeline(clientId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve decision timeline' },
      { status: 500 }
    );
  }
}
