# Troubleshooting & Operational Diagnostics

This guide provides diagnostic procedures and resolution steps for common operational issues encountered when deploying, configuring, or operating ContextRelay.

---

## 1. Quick Diagnostic Checklist

When encountering errors, verify the following prerequisites:
1. Is `HINDSIGHT_API_KEY` set in `.env.local` or container environment?
2. Is at least one LLM key set (`GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`)?
3. Does the directory `data/` exist and have write permissions for SQLite?
4. Are you running Node.js 18+ or 20+?
5. Do tests pass via `npm test`?

---

## 2. Ingestion & Hindsight Errors

### Issue: "HINDSIGHT_API_KEY is not configured"
- **Symptom:** Ingesting a source fails with HTTP 500 and the message `HINDSIGHT_API_KEY is required`.
- **Cause:** The environment variable is missing or blank in the runtime environment.
- **Fix:** Add `HINDSIGHT_API_KEY=your_key_here` to `.env.local` (local development) or your container deployment configuration. Restart the Next.js server.

### Issue: HTTP 401 Unauthorized from Hindsight API
- **Symptom:** Source ingestion fails; server logs show `Hindsight API returned 401`.
- **Cause:** The provided API key is invalid, revoked, or belongs to an expired workspace.
- **Fix:** Generate a fresh API key from your Hindsight console and update the environment variable.

### Issue: "Invalid file type. Only .txt, .md, and .json files are supported"
- **Symptom:** Uploading a transcript returns HTTP 400.
- **Cause:** Attempting to upload a PDF, DOCX, CSV, or audio file.
- **Fix:** ContextRelay accepts plain text transcripts (`.txt`), Markdown (`.md`), and JSON exports (`.json`). Convert documents to text or Markdown before upload.

### Issue: "File exceeds 2MB limit"
- **Symptom:** Upload is rejected immediately with HTTP 400.
- **Cause:** The transcript file is larger than 2,097,152 bytes.
- **Fix:** Split massive multi-hour transcripts into individual meeting sessions (e.g., `meeting-2026-01-15.txt`, `meeting-2026-01-22.txt`). This improves extraction granularity in Hindsight.

---

## 3. Query & Retrieval Issues

### Issue: "No relevant stored client memory found for this inquiry"
- **Symptom:** The query returns a short, deterministic notification stating that no memories exist.
- **Is this an error?** No. This is ContextRelay's deterministic short-circuit guard (ADR 007). When Hindsight recall yields zero matching facts, the system bypasses the LLM rather than hallucinating an answer.
- **Troubleshooting:**
  1. Check if sources have been ingested for this specific client. If sources show status `pending` or `failed`, the facts were never committed.
  2. Verify you are querying the correct client. ContextRelay strictly isolates memories by bank; Client A's memories cannot be retrieved under Client B.
  3. Formulate the query around business decisions or preferences (e.g., "What was decided about the database?" rather than "Tell me everything").

### Issue: Sparse or Empty Account Handover Brief
- **Symptom:** Clicking "Generate Handover Brief" returns sections stating "No verified facts retained".
- **Cause:** Handover briefs aggregate real memories across decisions, preferences, and rejections. If only one small kickoff transcript was ingested, categories without historical records remain empty.
- **Fix:** Ingest transcripts covering technical reviews, sprint retrospectives, or scope negotiations to build rich institutional context.

---

## 4. LLM Provider Errors

### Issue: "No LLM provider configured"
- **Symptom:** Query returns HTTP 500 with `No LLM provider configured`.
- **Cause:** None of the 4 supported LLM keys (`GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) are present in the environment.
- **Fix:** Provide at least one key in `.env.local`. Groq offers fast inference with `llama-3.3-70b-versatile` as the default.

### Issue: Rate Limit (HTTP 429) from LLM Provider
- **Symptom:** Queries fail during high-frequency requests.
- **Cause:** Exceeding provider token or request per minute (RPM) limits.
- **Fix:** Configure an alternate provider key (e.g., set both `GROQ_API_KEY` and `OPENAI_API_KEY`). The system will utilize the primary detected key; if one is exhausted, comment it out to fall back to the next provider.

---

## 5. SQLite & File System Errors

### Issue: `SQLITE_BUSY: database is locked`
- **Symptom:** Client creation or source upload fails with a locked database error.
- **Cause:** Multiple write processes attempting concurrent transactions on `context_relay.db`, or an open SQLite GUI tool (like DB Browser) holding an exclusive write lock.
- **Fix:** Close external SQLite viewing tools during active ingestion. ContextRelay enables WAL (Write-Ahead Logging) mode on startup, but heavy concurrent writes require sequential queuing.

### Issue: `ENOENT: no such file or directory` in `data/`
- **Symptom:** Server crashes on startup attempting to access `data/context_relay.db`.
- **Cause:** The `data` directory does not exist and permissions prevent automatic creation.
- **Fix:** Create the folder manually: `mkdir -p data`. Ensure the running user has read/write permissions.
