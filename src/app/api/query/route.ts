import { NextRequest, NextResponse } from 'next/server';
import { answerClientQuestion } from '@/lib/retrieval';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientId = (body.clientId || '').trim();
    const question = (body.question || '').trim();

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required.' },
        { status: 400 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { error: 'Please enter a question.' },
        { status: 400 }
      );
    }

    const result = await answerClientQuestion(clientId, question);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to process query' },
      { status: 500 }
    );
  }
}
