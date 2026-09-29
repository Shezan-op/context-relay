# Security Architecture & Boundary Analysis

This document details the security boundaries, credential isolation mechanisms, sanitization routines, and honest security limitations of ContextRelay.

---

## 1. Threat Model & Security Boundaries

ContextRelay processes proprietary client conversation transcripts. The primary security risks are:
1. **Credential Exposure:** Leaking API tokens (Hindsight, Groq, OpenAI, Anthropic, Gemini) to the browser.
2. **Cross-Tenant Data Contamination:** One client accessing another client's proprietary memories.
3. **Memory Injection & Memory Drift:** Malicious user queries corrupting the permanent institutional knowledge graph.
4. **Denial-of-Service & Buffer Exhaustion:** Large or malicious file uploads crashing server memory.

---

## 2. Server-Side Secret Isolation

All upstream service credentials are isolated strictly to server-side execution:
- `HINDSIGHT_API_KEY`
- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

### Automated Build Verification:
In [`tests/core-pipeline.test.ts`](file:///c:/Users/techt/context-relay/tests/core-pipeline.test.ts) (Test Category 10), ContextRelay programmatically inspects the source code of `src/app/page.tsx` as well as compiled `.next/static` production build chunks. The test verifies that secret environment variable names never appear in client bundles:

```typescript
test('Category 10: Server secrets and API keys never appear in client bundles', () => {
  const pageContent = fs.readFileSync(path.join(process.cwd(), 'src/app/page.tsx'), 'utf8');
  assert.equal(pageContent.includes('process.env.HINDSIGHT_API_KEY'), false);
  assert.equal(pageContent.includes('process.env.GROQ_API_KEY'), false);
  assert.equal(pageContent.includes('process.env.OPENAI_API_KEY'), false);
  ...
});
```

---

## 3. Memory Injection Prevention

In ContextRelay, **user questions and generated answers are NEVER retained into Hindsight**:
- The Hindsight Retain API is invoked exclusively during transcript file ingestion.
- Submitting questions via `/api/query` or generating briefs via `/api/handoff` executes read-only recall operations.
- This architectural constraint guarantees that prompt injection attempts or transient conversational lookups can never corrupt the durable client memory graph.

---

## 4. Input Validation & DoS Prevention

1. **Extension Whitelisting:** Ingestion strictly accepts `.txt` and `.md` extensions.
2. **Payload Size Guard:** Both file byte size and string lengths are bounded to 5MB (`MAX_FILE_SIZE = 5 * 1024 * 1024`).
3. **Empty String Rejection:** Files with whitespace-only content are rejected with HTTP 422 before reaching Hindsight.
4. **Sanitization of Error Messages:** Ingestion errors strip raw tokens and internal credentials using regular expression masking (`err.replace(/([A-Za-z0-9_-]{20,})/g, '***')`) before writing to SQLite or returning error messages to clients.

---

## 5. Honest Current Security Limitations

To maintain architectural transparency:
- **No User Authentication (AuthN/AuthZ):** The MVP operates as an internal single-agency workspace without user accounts, passwords, or multi-user login sessions.
- **No Role-Based Access Control (RBAC):** Any user with access to the local port can create clients and query client memories.
- **Unencrypted SQLite at Rest:** SQLite database file `context_relay.sqlite` is stored unencrypted on the host file system. Disk-level encryption (BitLocker, LUKS) is assumed.
- **Plaintext Transcripts in Transit to Hindsight:** Communication between ContextRelay and Hindsight runs over standard HTTP if hosted on `localhost:8888`. Production deployment requires TLS termination (`https://`).
