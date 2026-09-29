import { NextRequest, NextResponse } from 'next/server';
import { setApiKey, listApiKeys, deleteApiKey } from '@/lib/db';

// Known configurable keys with labels and env var mappings
export const KNOWN_KEYS = [
  { name: 'HINDSIGHT_API_KEY', label: 'Hindsight API Key', envVar: 'HINDSIGHT_API_KEY', required: true },
  { name: 'GROQ_API_KEY', label: 'Groq API Key', envVar: 'GROQ_API_KEY', required: false },
  { name: 'OPENAI_API_KEY', label: 'OpenAI API Key', envVar: 'OPENAI_API_KEY', required: false },
  { name: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', envVar: 'ANTHROPIC_API_KEY', required: false },
  { name: 'GEMINI_API_KEY', label: 'Google Gemini API Key', envVar: 'GEMINI_API_KEY', required: false },
];

export async function GET() {
  try {
    const storedKeys = listApiKeys();
    const storedMap = new Map(storedKeys.map((k) => [k.key_name, k]));

    const keys = KNOWN_KEYS.map((def) => {
      const stored = storedMap.get(def.name);
      const envValue = process.env[def.envVar];
      const hasValue = !!(stored?.key_value || envValue);
      return {
        name: def.name,
        label: def.label,
        required: def.required,
        hasValue,
        source: stored?.key_value ? 'db' : envValue ? 'env' : 'none',
        updatedAt: stored?.updated_at ?? null,
        // Mask the actual value — show only last 4 chars for security
        maskedValue: stored?.key_value
          ? `${'•'.repeat(Math.max(0, stored.key_value.length - 4))}${stored.key_value.slice(-4)}`
          : envValue
          ? `(from .env) ${'•'.repeat(Math.max(0, envValue.length - 4))}${envValue.slice(-4)}`
          : null,
      };
    });

    return NextResponse.json({ keys });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyName, keyValue } = body;

    if (!keyName || typeof keyName !== 'string') {
      return NextResponse.json({ error: 'keyName is required.' }, { status: 400 });
    }

    // Only allow known key names
    const isKnown = KNOWN_KEYS.some((k) => k.name === keyName);
    if (!isKnown) {
      return NextResponse.json({ error: `Unknown key: ${keyName}` }, { status: 400 });
    }

    if (!keyValue || typeof keyValue !== 'string' || !keyValue.trim()) {
      return NextResponse.json({ error: 'keyValue must be a non-empty string.' }, { status: 400 });
    }

    setApiKey(keyName, keyValue.trim());
    return NextResponse.json({ success: true, keyName });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to save key' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyName = searchParams.get('keyName');

    if (!keyName) {
      return NextResponse.json({ error: 'keyName query param is required.' }, { status: 400 });
    }

    deleteApiKey(keyName);
    return NextResponse.json({ success: true, keyName });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to delete key' },
      { status: 500 }
    );
  }
}
