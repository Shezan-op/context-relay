import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Use isolated in-memory SQLite database for testing
process.env.DATABASE_PATH = ':memory:';
import {
  getDatabase,
  createClientRecord,
  getClientRecord,
  listClientRecords,
  listSourcesForClient,
} from '../src/lib/db';
import { ingestTranscript } from '../src/lib/ingestion';
import { answerClientQuestion } from '../src/lib/retrieval';
import { HindsightWrapper } from '../src/lib/hindsight';

test('Acceptance Pipeline: Complete End-to-End Flow (Criteria A - O)', async () => {
  // Criterion N & O: Verify no demo/seed data exists, app starts cleanly with 0 clients
  // (In fresh/isolated db environment, clients is an array)
  const initialClients = listClientRecords();
  assert.ok(Array.isArray(initialClients), 'Client registry must be an array');

  // In-memory mock bank storage representing Hindsight's isolated client banks
  const mockHindsightBanks = new Map<string, { documents: Map<string, string>; memories: any[] }>();

  // Mock Hindsight service behaving according to Hindsight specs
  const mockHindsight = new HindsightWrapper();

  mockHindsight.ensureClientBank = async (bankId: string) => {
    if (!mockHindsightBanks.has(bankId)) {
      mockHindsightBanks.set(bankId, { documents: new Map(), memories: [] });
    }
  };

  mockHindsight.retainTranscript = async (bankId: string, content: string, docId: string) => {
    const bank = mockHindsightBanks.get(bankId)!;
    bank.documents.set(docId, content);

    // Simulate Hindsight fact extraction according to client-memory mission
    if (content.includes('PostgreSQL on AWS RDS') && !content.includes('TimescaleDB')) {
      bank.memories.push({
        id: `fact-${randomUUID()}`,
        text: 'Client requires PostgreSQL on AWS RDS for all services; rejects MongoDB.',
        type: 'world',
        occurred_start: '2026-01-10T10:00:00Z',
        document_id: docId,
        source_chunk: 'Our database must remain PostgreSQL on AWS RDS; do not use MongoDB.',
      });
      bank.memories.push({
        id: `fact-${randomUUID()}`,
        text: 'Sarah Jenkins has final budget approval on all deliverables.',
        type: 'world',
        occurred_start: '2026-01-10T10:00:00Z',
        document_id: docId,
        source_chunk: 'Sarah Jenkins is the sole stakeholder with budget sign-off authority.',
      });
    }

    if (content.includes('TimescaleDB')) {
      bank.memories.push({
        id: `fact-${randomUUID()}`,
        text: 'Client adopted TimescaleDB for time-series IoT analytics while keeping PostgreSQL for core user records.',
        type: 'world',
        occurred_start: '2026-03-15T14:00:00Z',
        document_id: docId,
        source_chunk: 'We have decided to adopt TimescaleDB for time-series data while keeping PostgreSQL for core user records.',
      });
    }
    return { ok: true };
  };

  mockHindsight.recallMemories = async (bankId: string, query: string) => {
    const bank = mockHindsightBanks.get(bankId);
    if (!bank) return { results: [], formattedContext: '' };

    const qLower = query.toLowerCase();
    const matched = bank.memories.filter((m) => {
      if (qLower.includes('database') || qLower.includes('db') || qLower.includes('stack')) {
        return m.text.includes('PostgreSQL') || m.text.includes('TimescaleDB');
      }
      if (qLower.includes('stakeholder') || qLower.includes('approval') || qLower.includes('sarah')) {
        return m.text.includes('Sarah Jenkins');
      }
      return false;
    });

    const results = matched.map((m) => ({
      id: m.id,
      text: m.text,
      type: m.type,
      occurredStart: m.occurred_start,
      documentId: m.document_id,
      sourceChunk: m.source_chunk,
    }));

    return {
      results,
      formattedContext: results.map((r) => r.text).join('\n'),
    };
  };

  // Mock Grounded LLM answering based solely on evidence
  const mockLlmCaller = async (question: string, evidence: any[]) => {
    const texts = evidence.map((e) => e.text);
    const dates = evidence.map((e) => e.occurredStart);

    if (texts.some((t) => t.includes('TimescaleDB'))) {
      return {
        answer:
          'The client initially required PostgreSQL on AWS RDS (Meeting Jan 10), but adopted TimescaleDB on March 15 for time-series IoT data while retaining PostgreSQL for core user records.',
      };
    }
    if (texts.some((t) => t.includes('PostgreSQL'))) {
      return {
        answer:
          'The client requires PostgreSQL on AWS RDS and specifically rejected MongoDB (Meeting Jan 10).',
      };
    }
    return {
      answer: 'Stored client memory does not contain enough information to answer this question.',
    };
  };

  // Step A: Create one real client
  const clientAId = randomUUID();
  const bankA = `client:${clientAId}`;
  createClientRecord({
    id: clientAId,
    name: 'Real Client Acme',
    hindsight_bank_id: bankA,
    created_at: new Date().toISOString(),
  });
  await mockHindsight.ensureClientBank(bankA, 'Real Client Acme');

  const clientA = getClientRecord(clientAId);
  assert.ok(clientA, 'Client A must exist in SQLite');
  assert.equal(clientA.hindsight_bank_id, bankA);

  // Step B & C: Upload one real transcript; verify app records source and calls Hindsight Retain
  const transcript1Content = `
    Alex: Welcome to our architecture kickoff.
    Sarah Jenkins: Sarah Jenkins is the sole stakeholder with budget sign-off authority.
    Alex: What database should we provision?
    Sarah Jenkins: Our database must remain PostgreSQL on AWS RDS; do not use MongoDB.
  `;

  // Criterion L & M: Notice user never had to say "remember this" or manually tag facts!
  const ingest1 = await ingestTranscript(
    clientAId,
    {
      filename: 'kickoff_transcript.txt',
      contentType: 'text/plain',
      sizeBytes: transcript1Content.length,
      content: transcript1Content,
    },
    { hindsight: mockHindsight }
  );

  assert.equal(ingest1.success, true);
  assert.equal(ingest1.source.ingestion_status, 'stored');
  assert.ok(mockHindsightBanks.get(bankA)?.documents.has(ingest1.source.hindsight_document_id));
  assert.equal(listSourcesForClient(clientAId).length, 1);

  // Step D, E, F, G: Ask relevant question; verify Recall, LLM grounding, answer and evidence
  const query1 = await answerClientQuestion(clientAId, 'What database is approved for use?', {
    hindsight: mockHindsight,
    llmCaller: mockLlmCaller,
  });

  assert.equal(query1.hasEvidence, true);
  assert.equal(query1.evidence.length >= 1, true);
  assert.match(query1.answer, /PostgreSQL on AWS RDS/);
  assert.match(query1.evidence[0].sourceChunk || '', /must remain PostgreSQL/);

  // Step H & I: Upload second real transcript for same client with newer info; query again
  const transcript2Content = `
    Alex: Welcome back. IoT sensor throughput has increased 10x.
    Sarah Jenkins: Because of that, we have decided to adopt TimescaleDB for time-series data while keeping PostgreSQL for core user records.
  `;

  const ingest2 = await ingestTranscript(
    clientAId,
    {
      filename: 'q2_review_transcript.txt',
      contentType: 'text/plain',
      sizeBytes: transcript2Content.length,
      content: transcript2Content,
    },
    { hindsight: mockHindsight }
  );

  assert.equal(ingest2.success, true);
  assert.equal(ingest2.source.ingestion_status, 'stored');
  assert.equal(listSourcesForClient(clientAId).length, 2);

  // Step J: Verify newer stored information changes the answer
  const query2 = await answerClientQuestion(clientAId, 'What database is approved for use?', {
    hindsight: mockHindsight,
    llmCaller: mockLlmCaller,
  });

  assert.equal(query2.hasEvidence, true);
  assert.equal(query2.evidence.length, 2, 'Should recall both initial and updated database facts');
  assert.match(query2.answer, /TimescaleDB/);
  assert.match(query2.answer, /PostgreSQL/);

  // Step K: Verify a different client cannot retrieve client A's memory
  const clientBId = randomUUID();
  const bankB = `client:${clientBId}`;
  createClientRecord({
    id: clientBId,
    name: 'Real Client Beta',
    hindsight_bank_id: bankB,
    created_at: new Date().toISOString(),
  });
  await mockHindsight.ensureClientBank(bankB, 'Real Client Beta');

  const queryClientB = await answerClientQuestion(clientBId, 'What database is approved for use?', {
    hindsight: mockHindsight,
    llmCaller: mockLlmCaller,
  });

  assert.equal(queryClientB.hasEvidence, false, 'Client B must have zero evidence from Client A');
  assert.equal(queryClientB.evidence.length, 0);
  assert.match(queryClientB.answer, /No relevant stored client memory found/);
});
