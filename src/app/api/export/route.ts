import { NextRequest, NextResponse } from 'next/server';
import { getClientRecord, listSourcesForClient } from '@/lib/db';
import { getDontRepeatItems, getDecisionTimeline } from '@/lib/retrieval';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const format = searchParams.get('format') || 'json';

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId query parameter is required.' },
        { status: 400 }
      );
    }

    const client = getClientRecord(clientId);
    if (!client) {
      return NextResponse.json(
        { error: `Client with ID '${clientId}' not found.` },
        { status: 404 }
      );
    }

    const sources = listSourcesForClient(clientId);
    let dontRepeatData = null;
    let timelineData = null;

    try {
      dontRepeatData = await getDontRepeatItems(clientId);
    } catch {
      // Non-fatal if memory recall fails
    }

    try {
      timelineData = await getDecisionTimeline(clientId);
    } catch {
      // Non-fatal if memory recall fails
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      client,
      sources,
      dontRepeat: dontRepeatData?.items || [],
      timeline: timelineData?.decisions || [],
    };

    if (format === 'markdown' || format === 'md') {
      const sanitizedName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const mdContent = `# Institutional Memory Dossier: ${client.name}
**Exported At**: ${exportPayload.exportedAt}
**Client ID**: ${client.id}
**Hindsight Memory Bank**: ${client.hindsight_bank_id}

---

## 1. Don't Repeat This (Rejected Approaches & Failed Attempts)
${
  exportPayload.dontRepeat.length === 0
    ? '_No recorded rejected approaches._\n'
    : exportPayload.dontRepeat
        .map(
          (item: any, i: number) => `### ${i + 1}. ${item.item}
- **Status**: ${item.status}
- **Explicit Reason**: ${item.reason}
- **Date**: ${item.date || 'Undated'}
- **Source**: ${item.source}
${item.currentStatusNote ? `- **Note**: ${item.currentStatusNote}\n` : ''}`
        )
        .join('\n')
}

---

## 2. Decision Timeline (Mandates & Approvals)
${
  exportPayload.timeline.length === 0
    ? '_No recorded decisions or architectural mandates._\n'
    : exportPayload.timeline
        .map(
          (dec: any, i: number) => `### ${i + 1}. ${dec.statement}
- **Status**: ${dec.status}
- **Date**: ${dec.date || 'Undated'}
- **Source**: ${dec.source}
${dec.supportingQuote ? `- **Quote**: "${dec.supportingQuote}"\n` : ''}`
        )
        .join('\n')
}

---

## 3. Ingested Sources & Transcripts (${sources.length})
${
  sources.length === 0
    ? '_No source transcripts ingested._\n'
    : sources
        .map(
          (s, i) =>
            `${i + 1}. **${s.original_filename}** — Status: ${s.ingestion_status}, Size: ${Math.round(
              s.size_bytes / 1024
            )} KB, Ingested: ${s.created_at}`
        )
        .join('\n')
}
`;

      return new NextResponse(mdContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${sanitizedName}_memory_export.md"`,
        },
      });
    }

    const sanitizedName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${sanitizedName}_memory_export.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to export client data' },
      { status: 500 }
    );
  }
}
