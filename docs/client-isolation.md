# Client Memory Isolation Specification

This document explains how Viora prevents cross-client data contamination, detailing bank identifier resolution, storage boundaries, query routing, and automated isolation verification.

---

## 1. The Multi-Client Agency Problem

Agencies manage accounts for multiple clients, frequently in competing industries (e.g., competing retail brands or financial services). If Client A's pricing model, technology stack, or proprietary constraints leak into Client B's workspace, the agency faces immediate breach of contract, NDA violations, and legal liability.

Many basic AI implementations store all documents in a single shared vector database index with metadata filters (`where client = 'client_a'`). A minor coding mistake, unhandled null parameter, or injection vulnerability in metadata filters can instantly cause cross-tenant memory leakage.

Viora rejects shared vector spaces in favor of **hard, physical memory bank isolation**.

---

## 2. Bank Identifier Generation & Storage

When a new client is provisioned in Viora:

```typescript
// src/app/api/clients/route.ts
const clientId = randomUUID();
const hindsightBankId = `client:${clientId}`;
const now = new Date().toISOString();

const client = {
  id: clientId,
  name,
  hindsight_bank_id: hindsightBankId,
  created_at: now,
};

// 1. Provision isolated bank in Hindsight
const hindsight = getHindsightClient();
await hindsight.ensureClientBank(hindsightBankId, name);

// 2. Persist trusted mapping in SQLite
createClientRecord(client);
```

### Key Architectural Invariants:
1. **Deterministic Bank Naming:** Every client is assigned a unique identifier following the pattern `client:<uuid>` (e.g., `client:c8f12a-meridian`).
2. **Server-Side Bank ID Resolution:** The browser client only submits the application `clientId`. The server securely queries the trusted SQLite database to resolve `hindsight_bank_id`.
3. **No Client-Side Bank Forgery:** A malicious or compromised browser client cannot submit an arbitrary `bankId` header or parameter.

---

## 3. Query Routing Isolation

When an account manager queries client context:

```typescript
// src/lib/retrieval.ts
export async function answerClientQuestion(clientId: string, question: string) {
  // 1. Resolve client and bank from trusted SQLite record
  const client = getClientRecord(clientId);
  if (!client) {
    throw new Error(`Client with ID '${clientId}' was not found.`);
  }

  // 2. Query Hindsight Recall strictly against client.hindsight_bank_id
  const recallPayload = await hindsight.recallMemories(client.hindsight_bank_id, question);
  ...
}
```

Hindsight guarantees that searches executed on `client:<uuid_A>` have zero mathematical or structural access to `client:<uuid_B>`.

---

## 4. Automated Proof of Client Isolation

Viora includes automated regression tests in [`tests/core-pipeline.test.ts`](file:///c:/Users/techt/context-relay/tests/core-pipeline.test.ts) (Test Category 5) and [`tests/acceptance-e2e.test.ts`](file:///c:/Users/techt/context-relay/tests/acceptance-e2e.test.ts) (Step K) proving isolation:

### Test Category 5 from Core Pipeline:
```typescript
test('Category 5: Question answering queries only the target client bank', async () => {
  const clientAId = randomUUID();
  const bankA = `client:${clientAId}`;
  createClientRecord({ id: clientAId, name: 'Client Alpha', hindsight_bank_id: bankA, created_at: new Date().toISOString() });

  const clientBId = randomUUID();
  const bankB = `client:${clientBId}`;
  createClientRecord({ id: clientBId, name: 'Client Beta', hindsight_bank_id: bankB, created_at: new Date().toISOString() });

  let recalledBankId = '';
  HindsightWrapper.prototype.recallMemories = async (bankId, query) => {
    recalledBankId = bankId;
    return { results: [], formattedContext: '' };
  };

  await answerClientQuestion(clientAId, 'What tech stack do they use?');
  assert.equal(recalledBankId, bankA, 'Must query Bank A');
  assert.notEqual(recalledBankId, bankB, 'Must never query Bank B');
});
```

### Acceptance E2E Cross-Client Verification:
In `tests/acceptance-e2e.test.ts`:
- Real Client Alpha ingests architectural transcripts mandating PostgreSQL and rejecting MongoDB.
- Real Client Beta is created with zero transcripts.
- Asking Client Beta the identical database question returns:
  `hasEvidence: false`, `evidence.length === 0`, and answer: `"No relevant stored client memory found regarding your question."`
- Client Beta receives zero leakage from Client Alpha.
