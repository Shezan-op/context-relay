import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Use isolated in-memory SQLite database for testing
process.env.DATABASE_PATH = ':memory:';
import {
  getDatabase,
  createClientRecord,
  getClientRecord,
  listClientRecords,
  createSourceRecord,
  updateSourceStatus,
  getSourceRecord,
  listSourcesForClient,
} from '../src/lib/db';
import { ingestTranscript } from '../src/lib/ingestion';
import {
  answerClientQuestion,
  generateClientHandoffBrief,
  getDontRepeatItems,
  getDecisionTimeline,
} from '../src/lib/retrieval';
import { HindsightWrapper, getHindsightClient } from '../src/lib/hindsight';
import * as llmModule from '../src/lib/llm';

// Test Category 1: Client creation creates a stable Hindsight bank ID
test('Category 1: Client creation creates a stable Hindsight bank ID', () => {
  const clientId = randomUUID();
  const bankId = `client:${clientId}`;
  const now = new Date().toISOString();

  createClientRecord({
    id: clientId,
    name: 'Test Acme Corp',
    hindsight_bank_id: bankId,
    created_at: now,
  });

  const retrieved = getClientRecord(clientId);
  assert.ok(retrieved, 'Client record should exist');
  assert.equal(retrieved.name, 'Test Acme Corp');
  assert.equal(retrieved.hindsight_bank_id, bankId);
  assert.match(retrieved.hindsight_bank_id, /^client:[0-9a-f-]{36}$/);
});

// Test Category 2: Transcript validation rejects unsupported/empty files
test('Category 2: Transcript validation rejects unsupported, empty, or oversized files', async () => {
  const clientId = randomUUID();
  createClientRecord({
    id: clientId,
    name: 'Validation Client',
    hindsight_bank_id: `client:${clientId}`,
    created_at: new Date().toISOString(),
  });

  // Unsupported file extension (.pdf)
  await assert.rejects(
    async () => {
      await ingestTranscript(clientId, {
        filename: 'notes.pdf',
        contentType: 'application/pdf',
        sizeBytes: 100,
        content: 'Some meeting notes',
      });
    },
    { message: /only accepts \.txt and \.md/ }
  );

  // Empty file content
  await assert.rejects(
    async () => {
      await ingestTranscript(clientId, {
        filename: 'empty.txt',
        contentType: 'text/plain',
        sizeBytes: 0,
        content: '   \n  ',
      });
    },
    { message: /file is empty/ }
  );

  // Oversized file (> 5MB)
  await assert.rejects(
    async () => {
      await ingestTranscript(clientId, {
        filename: 'large.txt',
        contentType: 'text/plain',
        sizeBytes: 6 * 1024 * 1024,
        content: 'A'.repeat(100),
      });
    },
    { message: /exceeds the 5MB size limit/ }
  );
});

// Test Category 3: Successful ingestion creates a source record and calls Hindsight Retain
test('Category 3: Successful ingestion creates a source record and retains into Hindsight', async () => {
  const clientId = randomUUID();
  const bankId = `client:${clientId}`;
  createClientRecord({
    id: clientId,
    name: 'Retain Test Client',
    hindsight_bank_id: bankId,
    created_at: new Date().toISOString(),
  });

  // Track retain calls
  let retainCalledWith: any = null;
  const originalRetain = HindsightWrapper.prototype.retainTranscript;
  const originalEnsure = HindsightWrapper.prototype.ensureClientBank;

  HindsightWrapper.prototype.ensureClientBank = async () => {};
  HindsightWrapper.prototype.retainTranscript = async (bId, content, docId, meta) => {
    retainCalledWith = { bId, content, docId, meta };
    return { ok: true };
  };

  try {
    const result = await ingestTranscript(clientId, {
      filename: 'meeting_01.txt',
      contentType: 'text/plain',
      sizeBytes: 150,
      content: 'Client explicitly stated they require light mode themes and reject dark backgrounds.',
    });

    assert.equal(result.success, true);
    assert.equal(result.source.ingestion_status, 'stored');
    assert.equal(retainCalledWith.bId, bankId);
    assert.equal(retainCalledWith.docId, result.source.hindsight_document_id);
    assert.match(retainCalledWith.content, /light mode themes/);

    const storedSource = getSourceRecord(result.source.id);
    assert.ok(storedSource);
    assert.equal(storedSource.ingestion_status, 'stored');
  } finally {
    HindsightWrapper.prototype.retainTranscript = originalRetain;
    HindsightWrapper.prototype.ensureClientBank = originalEnsure;
  }
});

// Test Category 4: Ingestion failure marks the source as failed
test('Category 4: Ingestion failure marks the source as failed with readable error', async () => {
  const clientId = randomUUID();
  const bankId = `client:${clientId}`;
  createClientRecord({
    id: clientId,
    name: 'Failure Test Client',
    hindsight_bank_id: bankId,
    created_at: new Date().toISOString(),
  });

  const originalRetain = HindsightWrapper.prototype.retainTranscript;
  const originalEnsure = HindsightWrapper.prototype.ensureClientBank;

  HindsightWrapper.prototype.ensureClientBank = async () => {};
  HindsightWrapper.prototype.retainTranscript = async () => {
    throw new Error('Connection refused to Hindsight port 8888');
  };

  try {
    const result = await ingestTranscript(clientId, {
      filename: 'failing_meeting.txt',
      contentType: 'text/plain',
      sizeBytes: 80,
      content: 'Some notes that fail retain',
    });

    assert.equal(result.success, false);
    assert.equal(result.source.ingestion_status, 'failed');
    assert.match(result.source.error_message || '', /Connection refused/);

    const stored = getSourceRecord(result.source.id);
    assert.ok(stored, 'Stored source record must exist');
    assert.equal(stored.ingestion_status, 'failed');
    assert.match(stored.error_message || '', /Connection refused/);
  } finally {
    HindsightWrapper.prototype.retainTranscript = originalRetain;
    HindsightWrapper.prototype.ensureClientBank = originalEnsure;
  }
});

// Test Category 5: Question answering resolves only the selected client’s bank
test('Category 5: Question answering queries only the target client bank', async () => {
  const clientAId = randomUUID();
  const bankA = `client:${clientAId}`;
  createClientRecord({
    id: clientAId,
    name: 'Client Alpha',
    hindsight_bank_id: bankA,
    created_at: new Date().toISOString(),
  });

  const clientBId = randomUUID();
  const bankB = `client:${clientBId}`;
  createClientRecord({
    id: clientBId,
    name: 'Client Beta',
    hindsight_bank_id: bankB,
    created_at: new Date().toISOString(),
  });

  let recalledBankId = '';
  const originalRecall = HindsightWrapper.prototype.recallMemories;
  HindsightWrapper.prototype.recallMemories = async (bankId, query) => {
    recalledBankId = bankId;
    return { results: [], formattedContext: '' };
  };

  try {
    await answerClientQuestion(clientAId, 'What tech stack do they use?');
    assert.equal(recalledBankId, bankA, 'Must query Bank A');
    assert.notEqual(recalledBankId, bankB, 'Must never query Bank B');
  } finally {
    HindsightWrapper.prototype.recallMemories = originalRecall;
  }
});

// Test Category 6: Relevant recall results are passed to the LLM
test('Category 6: Relevant recall results are passed to the LLM', async () => {
  const clientId = randomUUID();
  const bankId = `client:${clientId}`;
  createClientRecord({
    id: clientId,
    name: 'LLM Pass Client',
    hindsight_bank_id: bankId,
    created_at: new Date().toISOString(),
  });

  const mockEvidence = [
    {
      id: 'fact-1',
      text: 'Client requires React 19 and Vite for frontend',
      type: 'world',
      occurredStart: '2026-03-01T10:00:00Z',
      sourceChunk: 'We agreed that React 19 with Vite is our standard.',
    },
  ];

  const originalRecall = HindsightWrapper.prototype.recallMemories;
  HindsightWrapper.prototype.recallMemories = async () => {
    return {
      results: mockEvidence,
      formattedContext: 'FACTS:\nReact 19 Vite',
    };
  };

  let passedEvidence: any = null;
  let passedQuestion: any = null;
  const mockLlmCaller = async (question: string, evidence: any, context: string) => {
    passedQuestion = question;
    passedEvidence = evidence;
    return { answer: 'The client requires React 19 and Vite.' };
  };

  try {
    const response = await answerClientQuestion(clientId, 'What frontend framework is required?', {
      llmCaller: mockLlmCaller,
    });
    assert.equal(response.hasEvidence, true);
    assert.equal(response.answer, 'The client requires React 19 and Vite.');
    assert.equal(passedQuestion, 'What frontend framework is required?');
    assert.deepEqual(passedEvidence, mockEvidence);
  } finally {
    HindsightWrapper.prototype.recallMemories = originalRecall;
  }
});

// Test Category 7: No-memory case does not hallucinate an answer
test('Category 7: No-memory case stops cleanly without calling the LLM', async () => {
  const clientId = randomUUID();
  createClientRecord({
    id: clientId,
    name: 'Empty Recall Client',
    hindsight_bank_id: `client:${clientId}`,
    created_at: new Date().toISOString(),
  });

  const originalRecall = HindsightWrapper.prototype.recallMemories;
  HindsightWrapper.prototype.recallMemories = async () => {
    return { results: [], formattedContext: '' };
  };

  let llmWasCalled = false;
  const mockLlmCaller = async () => {
    llmWasCalled = true;
    return { answer: 'Hallucinated answer' };
  };

  try {
    const response = await answerClientQuestion(clientId, 'What is their favorite pizza?', {
      llmCaller: mockLlmCaller,
    });
    assert.equal(response.hasEvidence, false);
    assert.equal(response.evidence.length, 0);
    assert.match(response.answer, /No relevant stored client memory found/);
    assert.equal(llmWasCalled, false, 'LLM must NOT be called when no evidence exists');
  } finally {
    HindsightWrapper.prototype.recallMemories = originalRecall;
  }
});

// Test Category 8: Conflicting dated memories are surfaced rather than silently merged
test('Category 8: Conflicting dated memories are both surfaced with chronological dates', async () => {
  const clientId = randomUUID();
  createClientRecord({
    id: clientId,
    name: 'Conflict Client',
    hindsight_bank_id: `client:${clientId}`,
    created_at: new Date().toISOString(),
  });

  const conflictingEvidence = [
    {
      id: 'fact-1',
      text: 'Client approved PostgreSQL on AWS RDS.',
      type: 'world',
      occurredStart: '2026-01-15T10:00:00Z',
      sourceChunk: 'PostgreSQL RDS is approved.',
    },
    {
      id: 'fact-2',
      text: 'Client migrated database requirement to TimescaleDB for IoT analytics.',
      type: 'world',
      occurredStart: '2026-03-20T10:00:00Z',
      sourceChunk: 'We are adopting TimescaleDB instead.',
    },
  ];

  const originalRecall = HindsightWrapper.prototype.recallMemories;
  HindsightWrapper.prototype.recallMemories = async () => {
    return { results: conflictingEvidence, formattedContext: '' };
  };

  let promptWitness = '';
  const mockLlmCaller = async (question: string, evidence: any) => {
    promptWitness = evidence.map((e: any) => `${e.text} (${e.occurredStart})`).join(' | ');
    return {
      answer: 'The client initially approved PostgreSQL on Jan 15, but migrated to TimescaleDB on March 20.',
    };
  };

  try {
    const response = await answerClientQuestion(clientId, 'What database is approved?', {
      llmCaller: mockLlmCaller,
    });
    assert.equal(response.hasEvidence, true);
    assert.equal(response.evidence.length, 2);
    assert.match(promptWitness, /PostgreSQL/);
    assert.match(promptWitness, /TimescaleDB/);
    assert.match(promptWitness, /2026-01-15/);
    assert.match(promptWitness, /2026-03-20/);
  } finally {
    HindsightWrapper.prototype.recallMemories = originalRecall;
  }
});

// Test Category 9: Question/answer is not automatically retained as memory
test('Category 9: Question/answer is never automatically retained into Hindsight', async () => {
  const clientId = randomUUID();
  createClientRecord({
    id: clientId,
    name: 'No Retention Client',
    hindsight_bank_id: `client:${clientId}`,
    created_at: new Date().toISOString(),
  });

  let retainCallCount = 0;
  const originalRetain = HindsightWrapper.prototype.retainTranscript;
  const originalRecall = HindsightWrapper.prototype.recallMemories;

  HindsightWrapper.prototype.retainTranscript = async () => {
    retainCallCount++;
    return { ok: true };
  };
  HindsightWrapper.prototype.recallMemories = async () => {
    return {
      results: [{ id: 'f1', text: 'Some fact', type: 'world' }],
      formattedContext: '',
    };
  };

  const mockLlmCaller = async () => ({ answer: 'Answer text' });

  try {
    await answerClientQuestion(clientId, 'What is the policy?', {
      llmCaller: mockLlmCaller,
    });
    assert.equal(retainCallCount, 0, 'Retain must NOT be called for questions or answers');
  } finally {
    HindsightWrapper.prototype.retainTranscript = originalRetain;
    HindsightWrapper.prototype.recallMemories = originalRecall;
  }
});

// Test Category 10: Hindsight/LLM credentials never appear in client bundles
test('Category 10: Server secrets and API keys never appear in client bundles', () => {
  const pageContent = fs.readFileSync(path.join(process.cwd(), 'src/app/page.tsx'), 'utf8');

  // Verify client page does not reference secret environment variables
  assert.equal(pageContent.includes('process.env.HINDSIGHT_API_KEY'), false);
  assert.equal(pageContent.includes('process.env.GROQ_API_KEY'), false);
  assert.equal(pageContent.includes('process.env.OPENAI_API_KEY'), false);
  assert.equal(pageContent.includes('process.env.ANTHROPIC_API_KEY'), false);
  assert.equal(pageContent.includes('process.env.GEMINI_API_KEY'), false);
  assert.equal(pageContent.includes('process.env.LLM_API_KEY'), false);

  // Verify static build chunks in .next do not contain raw secrets
  const staticDir = path.join(process.cwd(), '.next/static');
  if (fs.existsSync(staticDir)) {
    const files = fs.readdirSync(staticDir, { recursive: true });
    for (const file of files) {
      if (typeof file === 'string' && file.endsWith('.js')) {
        const fullPath = path.join(staticDir, file);
        const code = fs.readFileSync(fullPath, 'utf8');
        assert.equal(code.includes('HINDSIGHT_API_KEY'), false, `Secret keyword in ${file}`);
        assert.equal(code.includes('GROQ_API_KEY'), false, `Secret keyword in ${file}`);
      }
    }
  }
});

// Test Category 11: Dedicated account handover brief surfaces structured continuity evidence
test('Category 11: Dedicated account handover brief surfaces structured continuity evidence', async () => {
  const clientId = randomUUID();
  const bankId = `client:${clientId}`;
  createClientRecord({
    id: clientId,
    name: 'Handoff Test Client',
    hindsight_bank_id: bankId,
    created_at: new Date().toISOString(),
  });

  const mockEvidence = [
    {
      id: 'h1',
      text: 'Client mandates PostgreSQL on AWS Aurora; strictly rejected MongoDB.',
      type: 'world',
      occurredStart: '2026-01-15T10:00:00Z',
      sourceChunk: 'PostgreSQL is non-negotiable; MongoDB was rejected.',
    },
    {
      id: 'h2',
      text: 'Marcus Vance holds sole budget sign-off authority exceeding $10,000.',
      type: 'world',
      occurredStart: '2026-01-15T10:00:00Z',
      sourceChunk: 'Marcus has budget sign-off.',
    },
  ];

  const originalRecall = HindsightWrapper.prototype.recallMemories;
  HindsightWrapper.prototype.recallMemories = async () => {
    return { results: mockEvidence, formattedContext: '' };
  };

  let handoffCalledWithClient = '';
  let handoffEvidencePassed: any = null;
  const mockHandoffCaller = async (clientName: string, evidence: any[]) => {
    handoffCalledWithClient = clientName;
    handoffEvidencePassed = evidence;
    return {
      answer: '### 1. Mandated Architecture\nPostgreSQL on Aurora\n### 2. Explicit Rejections\nMongoDB',
    };
  };

  try {
    const briefResult = await generateClientHandoffBrief(clientId, {
      handoffLlmCaller: mockHandoffCaller,
    });

    assert.equal(briefResult.hasEvidence, true);
    assert.equal(briefResult.clientName, 'Handoff Test Client');
    assert.equal(handoffCalledWithClient, 'Handoff Test Client');
    assert.equal(briefResult.evidence.length, 2);
    assert.match(briefResult.brief, /Mandated Architecture/);
    assert.match(briefResult.brief, /Explicit Rejections/);

    // Empty memory case
    HindsightWrapper.prototype.recallMemories = async () => ({
      results: [],
      formattedContext: '',
    });

    let emptyLlmCalled = false;
    const emptyCaller = async () => {
      emptyLlmCalled = true;
      return { answer: 'Fake brief' };
    };

    const emptyResult = await generateClientHandoffBrief(clientId, {
      handoffLlmCaller: emptyCaller,
    });

    assert.equal(emptyResult.hasEvidence, false);
    assert.equal(emptyResult.evidence.length, 0);
    assert.equal(emptyLlmCalled, false, 'LLM must not be called when bank has zero memories');
    assert.match(emptyResult.message || '', /No relevant stored client memory found/);
  } finally {
    HindsightWrapper.prototype.recallMemories = originalRecall;
  }
});

// Test Category 12: Don't Repeat This retrieves rejections with dates, reasons, and evidence
test('Category 12: Don\'t Repeat This retrieves rejections with explicit reasons and evidence', async () => {
  const clientId = randomUUID();
  const bankId = `client:${clientId}`;
  createClientRecord({
    id: clientId,
    name: 'Don\'t Repeat Test Client',
    hindsight_bank_id: bankId,
    created_at: new Date().toISOString(),
  });

  const mockEvidence = [
    {
      id: 'rej-1',
      text: 'Client strictly rejected third-party analytics cookies due to HIPAA compliance concerns.',
      type: 'world',
      occurredStart: '2026-01-15T10:00:00Z',
      sourceChunk: 'We strictly reject third-party analytics cookies because of HIPAA compliance.',
      documentId: 'doc:trans-1',
    },
    {
      id: 'rej-2',
      text: 'Client rejected MongoDB for all backend services.',
      type: 'experience',
      occurredStart: null, // missing date
      sourceChunk: 'Do not use MongoDB.',
      documentId: 'doc:trans-2',
    },
    {
      id: 'irr-1',
      text: 'Meeting took place in the central conference room.',
      type: 'observation',
      occurredStart: '2026-01-15T10:00:00Z',
      documentId: 'doc:trans-1',
    },
  ];

  let retainCount = 0;
  const originalRetain = HindsightWrapper.prototype.retainTranscript;
  const originalRecall = HindsightWrapper.prototype.recallMemories;

  HindsightWrapper.prototype.retainTranscript = async () => {
    retainCount++;
    return { ok: true };
  };

  HindsightWrapper.prototype.recallMemories = async () => {
    return { results: mockEvidence, formattedContext: '' };
  };

  try {
    const res = await getDontRepeatItems(clientId);

    assert.equal(res.hasEvidence, true);
    assert.equal(res.clientName, 'Don\'t Repeat Test Client');
    assert.equal(res.items.length, 2, 'Should only include explicit rejections, excluding room observation');

    // Item 1: Explicit reason extracted, date preserved
    const item1 = res.items.find((i) => i.item.includes('third-party analytics'));
    assert.ok(item1);
    assert.equal(item1.date, '2026-01-15T10:00:00Z');
    assert.match(item1.reason, /HIPAA compliance concerns/i);
    assert.equal(item1.status, 'active_rejection');
    assert.ok(item1.evidenceQuote);

    // Item 2: Missing date remains null (no fabricated date), missing reason says not recorded
    const item2 = res.items.find((i) => i.item.includes('MongoDB'));
    assert.ok(item2);
    assert.equal(item2.date, null, 'Missing date must remain null');
    assert.match(item2.reason, /Reason not recorded in available client memory/i);

    // Query must never call retain
    assert.equal(retainCount, 0, 'Retrieving Don\'t Repeat This must not write to Hindsight');

    // Test empty recall
    HindsightWrapper.prototype.recallMemories = async () => ({ results: [], formattedContext: '' });
    const emptyRes = await getDontRepeatItems(clientId);
    assert.equal(emptyRes.hasEvidence, false);
    assert.equal(emptyRes.items.length, 0);
    assert.match(emptyRes.message || '', /No recorded rejected approaches were found/);
  } finally {
    HindsightWrapper.prototype.retainTranscript = originalRetain;
    HindsightWrapper.prototype.recallMemories = originalRecall;
  }
});

// Test Category 13: Decision Timeline chronologically orders decisions and tracks superseded status
test('Category 13: Decision Timeline chronologically orders decisions and tracks superseded status', async () => {
  const clientId = randomUUID();
  const bankId = `client:${clientId}`;
  createClientRecord({
    id: clientId,
    name: 'Timeline Test Client',
    hindsight_bank_id: bankId,
    created_at: new Date().toISOString(),
  });

  const mockEvidence = [
    {
      id: 'dec-later',
      text: 'Client adopted TimescaleDB for time-series telemetry ingest while keeping PostgreSQL for core user records.',
      type: 'world',
      occurredStart: '2026-03-20T14:00:00Z',
      sourceChunk: 'We decided to adopt TimescaleDB for time-series telemetry.',
      documentId: 'doc:rev-1',
    },
    {
      id: 'dec-earlier',
      text: 'Client approved standard PostgreSQL on AWS RDS for all services.',
      type: 'world',
      occurredStart: '2026-01-10T10:00:00Z',
      sourceChunk: 'PostgreSQL on AWS RDS is approved.',
      documentId: 'doc:kick-1',
    },
    {
      id: 'dec-undated',
      text: 'Client mandated weekly sprint retrospectives on Thursdays.',
      type: 'world',
      occurredStart: null, // undated decision
      sourceChunk: 'Weekly sprint retrospectives are mandated.',
      documentId: 'doc:kick-1',
    },
    {
      id: 'not-a-decision',
      text: 'Conference call was attended by six stakeholders.',
      type: 'observation',
      occurredStart: '2026-01-10T10:00:00Z',
      documentId: 'doc:kick-1',
    },
  ];

  let retainCount = 0;
  const originalRetain = HindsightWrapper.prototype.retainTranscript;
  const originalRecall = HindsightWrapper.prototype.recallMemories;

  HindsightWrapper.prototype.retainTranscript = async () => {
    retainCount++;
    return { ok: true };
  };

  HindsightWrapper.prototype.recallMemories = async () => {
    return { results: mockEvidence, formattedContext: '' };
  };

  try {
    const res = await getDecisionTimeline(clientId);

    assert.equal(res.hasEvidence, true);
    assert.equal(res.clientName, 'Timeline Test Client');
    assert.equal(res.decisions.length, 3, 'Should only include decisions, excluding attendance observation');

    // Chronological order: 2026-01-10 decision should be first
    assert.equal(res.decisions[0].date, '2026-01-10T10:00:00Z');
    assert.match(res.decisions[0].statement, /PostgreSQL/);

    // Later decision should be second
    assert.equal(res.decisions[1].date, '2026-03-20T14:00:00Z');
    assert.match(res.decisions[1].statement, /TimescaleDB/);

    // Undated decision should be placed at the end
    assert.equal(res.decisions[2].date, null);

    // Superseded detection: Earlier PostgreSQL decision superseded by TimescaleDB
    assert.equal(res.decisions[0].status, 'superseded');
    assert.match(res.decisions[0].supersededBy || '', /TimescaleDB/);
    assert.equal(res.decisions[1].status, 'current');
    assert.match(res.decisions[1].supersedes || '', /PostgreSQL/);

    // Query must never call retain
    assert.equal(retainCount, 0, 'Retrieving Decision Timeline must not write to Hindsight');

    // Test empty recall
    HindsightWrapper.prototype.recallMemories = async () => ({ results: [], formattedContext: '' });
    const emptyRes = await getDecisionTimeline(clientId);
    assert.equal(emptyRes.hasEvidence, false);
    assert.equal(emptyRes.decisions.length, 0);
    assert.match(emptyRes.message || '', /No recorded decisions found/);
  } finally {
    HindsightWrapper.prototype.retainTranscript = originalRetain;
    HindsightWrapper.prototype.recallMemories = originalRecall;
  }
});

// Test Category 14: Client Isolation across Don't Repeat This, Decision Timeline, and Handoff Brief
test('Category 14: Client Isolation across Don\'t Repeat This, Decision Timeline, and Handoff Brief', async () => {
  const clientAId = randomUUID();
  const bankAId = `client:${clientAId}`;
  createClientRecord({
    id: clientAId,
    name: 'Client Alpha',
    hindsight_bank_id: bankAId,
    created_at: new Date().toISOString(),
  });

  const clientBId = randomUUID();
  const bankBId = `client:${clientBId}`;
  createClientRecord({
    id: clientBId,
    name: 'Client Beta',
    hindsight_bank_id: bankBId,
    created_at: new Date().toISOString(),
  });

  let queriedBank = '';
  const originalRecall = HindsightWrapper.prototype.recallMemories;
  HindsightWrapper.prototype.recallMemories = async (bId) => {
    queriedBank = bId;
    if (bId === bankAId) {
      return {
        results: [
          {
            id: 'alpha-rej',
            text: 'Client strictly rejected Redis cache due to memory costs.',
            type: 'world',
            occurredStart: '2026-02-01T10:00:00Z',
          },
          {
            id: 'alpha-dec',
            text: 'Client approved DynamoDB for session state.',
            type: 'world',
            occurredStart: '2026-02-01T10:00:00Z',
          },
        ],
        formattedContext: '',
      };
    }
    // Client B bank has no data
    return { results: [], formattedContext: '' };
  };

  try {
    // Querying Client B must query Bank B, never Bank A
    const drB = await getDontRepeatItems(clientBId);
    assert.equal(queriedBank, bankBId);
    assert.equal(drB.hasEvidence, false);
    assert.equal(drB.items.length, 0);

    const tlB = await getDecisionTimeline(clientBId);
    assert.equal(queriedBank, bankBId);
    assert.equal(tlB.hasEvidence, false);
    assert.equal(tlB.decisions.length, 0);

    const hbB = await generateClientHandoffBrief(clientBId);
    assert.equal(queriedBank, bankBId);
    assert.equal(hbB.hasEvidence, false);

    // Querying Client A queries Bank A
    const drA = await getDontRepeatItems(clientAId);
    assert.equal(queriedBank, bankAId);
    assert.equal(drA.hasEvidence, true);
    assert.equal(drA.items.length, 1);
    assert.match(drA.items[0].item, /Redis/);
  } finally {
    HindsightWrapper.prototype.recallMemories = originalRecall;
  }
});

