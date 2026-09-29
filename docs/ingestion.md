# Ingestion Pipeline Specification

This document describes the exact implementation of the transcript ingestion pipeline in ContextRelay, detailing validation rules, identifier generation, storage interactions, and error handling.

---

## 1. Overview

The ingestion pipeline converts raw client conversation transcripts into durable business memory stored inside an isolated Hindsight memory bank.

The implementation is located in:
- Route Handler: [`src/app/api/sources/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/sources/route.ts)
- Ingestion Service: [`src/lib/ingestion.ts`](file:///c:/Users/techt/context-relay/src/lib/ingestion.ts)
- Database Layer: [`src/lib/db.ts`](file:///c:/Users/techt/context-relay/src/lib/db.ts)
- Hindsight Wrapper: [`src/lib/hindsight.ts`](file:///c:/Users/techt/context-relay/src/lib/hindsight.ts)

---

## 2. Ingestion Flow Diagram

```
Upload Request (multipart/form-data or application/json)
                       │
                       ▼
            [Parameter Verification]
      ├── Missing clientId? ────────────► Return HTTP 400
      └── Missing file/content? ────────► Return HTTP 400
                       │
                       ▼
       [src/lib/ingestion.ts: ingestTranscript]
                       │
                       ▼
             [1. Client Existence]
      └── Client ID not in SQLite? ─────► Throw Error (404)
                       │
                       ▼
             [2. Extension Check]
      └── Not .txt or .md? ─────────────► Throw Error (422)
                       │
                       ▼
             [3. Content Check]
      └── Empty text? ──────────────────► Throw Error (422)
                       │
                       ▼
             [4. Size Check]
      └── File or string > 5MB? ────────► Throw Error (422)
                       │
                       ▼
      [5. Generate UUIDs & Record Metadata]
      - sourceId = randomUUID()
      - hindsightDocId = "doc:" + sourceId
      - INSERT INTO sources (status: 'processing')
                       │
                       ▼
         [6. Hindsight Bank Verification]
      - ensureClientBank(bankId, clientName)
                       │
                       ▼
         [7. Hindsight Retain Invocation]
      - retainTranscript(bankId, content, docId, metadata)
      - Option: async = false (synchronous execution)
           ├── SUCCESS
           │     ▼
           │  UPDATE sources SET status = 'stored'
           │  Return HTTP 201 { source, success: true }
           │
           └── FAILURE
                 ▼
              Sanitize error message (strip secrets)
              UPDATE sources SET status = 'failed', error_message = ?
              Return HTTP 422 { error, source }
```

---

## 3. Strict Validation Rules

Before any text is transmitted to Hindsight, `ingestTranscript` enforces four mandatory validation barriers:

1. **Client Existence Check:**
   ```typescript
   const client = getClientRecord(clientId);
   if (!client) {
     throw new Error(`Client with ID '${clientId}' not found.`);
   }
   ```
2. **File Extension Whitelist:**
   ```typescript
   const lowerName = filename.toLowerCase();
   if (!lowerName.endsWith('.txt') && !lowerName.endsWith('.md')) {
     throw new Error('Invalid file type. ContextRelay only accepts .txt and .md transcript files.');
   }
   ```
3. **Non-Empty Content Check:**
   ```typescript
   const textContent = (fileInput.content || '').trim();
   if (!textContent) {
     throw new Error('Transcript file is empty. Please provide a file with non-empty text content.');
   }
   ```
4. **File Size Ceiling (5MB):**
   ```typescript
   const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
   if (fileInput.sizeBytes > MAX_FILE_SIZE || textContent.length > MAX_FILE_SIZE) {
     throw new Error(`File exceeds the 5MB size limit. Size: ${Math.round(fileInput.sizeBytes / 1024)} KB.`);
   }
   ```

---

## 4. Metadata Storage Contract

The SQLite database tracks file audit records in the `sources` table:

```sql
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  meeting_date TEXT,
  hindsight_document_id TEXT NOT NULL,
  ingestion_status TEXT NOT NULL CHECK(ingestion_status IN ('processing', 'stored', 'failed')),
  error_message TEXT,
  created_at TEXT NOT NULL
);
```

### Lifecycle States:
- `processing`: Initial state immediately after validation passes and before calling Hindsight.
- `stored`: Successfully decomposed and indexed inside the client's Hindsight bank.
- `failed`: Ingestion failed (network disconnection, invalid encoding, Hindsight rejection).

---

## 5. Hindsight Retain Call Specification

The server calls `HindsightClient.retain` through `src/lib/hindsight.ts`:

```typescript
const response = await this.client.retain(bankId, content, {
  documentId,
  context: 'client-transcript',
  metadata: {
    ...metadata,
    source: 'context-relay-upload',
  },
  async: false, // Process synchronously so ingestion status updates immediately
});
```

- `bankId`: Stable client identifier (`client:<uuid>`).
- `content`: Plain text string of the conversation.
- `documentId`: Deterministic document pointer (`doc:<sourceId>`).
- `context`: Marked as `'client-transcript'`.
- `async: false`: Ensures Hindsight extracts facts and indexes chunks before returning, allowing the UI to reflect `stored` status in real time.

---

## 6. What the Pipeline Does NOT Ingest

To maintain production security and architectural clarity:
- **No Audio/Video Streams:** ContextRelay does not connect to WebRTC or record live phone audio.
- **No Third-Party Connectors:** No automatic polling of Slack channels, Microsoft Teams bots, Zoom recording webhooks, or Salesforce CRMs.
- **No Unsafe Document Formats:** Word documents, PDFs, RTFs, and spreadsheet formats are rejected at the API boundary to prevent parsing ambiguity.
