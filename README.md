# ContextRelay

**Durable Client Memory for Agency Account Continuity**

ContextRelay is a single-workspace web application that transforms real client meeting transcripts into durable institutional memory using Hindsight, and uses that memory to answer account questions so new team members do not repeat old mistakes or re-ask settled questions.

---

## The One Problem It Solves

When an agency account manager leaves or rolls off an account, vital client knowledge—brand preferences, design constraints, technical decisions, key stakeholder roles, and past rejections—vanishes with them. The next person on the account inevitably repeats old mistakes or asks the client questions they already answered months ago.

ContextRelay preserves client institutional context by automatically extracting structured business knowledge from real meeting transcripts into isolated Hindsight memory banks, and retrieving verifiable evidence to answer questions for current and incoming team members.

---

## How the Pipeline Works

```
INPUT
  ↓ Real Client Transcript File (.txt or .md)
INGEST
  ↓ Server validates file and records metadata in SQLite
HINDSIGHT RETAIN
  ↓ Hindsight extracts durable business facts, links entities, and indexes dates
CLIENT MEMORY BANK
  ↓ Isolated bank (`client:<uuid>`) stores client knowledge graph
USER QUERY
  ↓ Account manager asks a client question
HINDSIGHT RECALL
  ↓ Multi-strategy recall (vector, keyword, graph, temporal) returns ranked facts & chunks
APPLICATION LLM
  ↓ LLM synthesizes a grounded answer strictly from retrieved evidence
OUTPUT + EVIDENCE
  ↓ UI displays direct answer with verifiable quotes, dates, and source snippets
```

---

## Zero Demo Data / Zero Seed Guarantee

ContextRelay starts **100% empty**:
- Zero preloaded clients
- Zero fake transcripts
- Zero seeded memories or synthetic chats
- Zero hardcoded demo metrics
- The application only ingests and reflects real user-provided data.

---

## Prerequisites

- **Node.js**: v20 or higher (v24 LTS recommended)
- **Hindsight Server**: Running locally or remotely (e.g. `http://localhost:8888`)
- **LLM API Key**: Groq (recommended for speed), OpenAI, Anthropic, or Gemini

---

## Environment Variables

Copy `.env.example` to `.env.local` and set your credentials:

```bash
cp .env.example .env.local
```

### Required Configuration:

```env
# Hindsight API Configuration
HINDSIGHT_API_URL=http://localhost:8888
# If your Hindsight instance requires an API token, specify it:
HINDSIGHT_API_KEY=

# Application LLM Provider (choose: groq, openai, anthropic, or gemini)
LLM_PROVIDER=groq

# API Key for the chosen provider
GROQ_API_KEY=gsk_your_groq_api_key_here
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GEMINI_API_KEY=AIza...

# LLM Model Name (optional, defaults to provider standard: llama-3.3-70b-versatile for Groq)
LLM_MODEL=llama-3.3-70b-versatile

# SQLite Database File Path (optional, defaults to ./context_relay.sqlite)
DATABASE_PATH=./context_relay.sqlite
```

---

## Installation & Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize Database & Start Dev Server:**
   ```bash
   npm run dev
   ```

3. **Open ContextRelay:**
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## How to Use ContextRelay

### 1. Create Your First Real Client
1. On the home page, click **"New Client"**.
2. Enter the real name of your client (e.g., `Acme Innovations`).
3. Click **"Create Client"**.
4. The server creates a dedicated SQLite record and provisions an isolated Hindsight memory bank (`client:<uuid>`).

### 2. Upload a Real Meeting Transcript
1. In the client workspace, click **"Upload Transcript"**.
2. Select your actual meeting transcript file (`.txt` or `.md`).
   - Example: `YOUR_REAL_TRANSCRIPT.txt`
3. Click **"Upload"**.
4. The server validates the file and calls Hindsight Retain. Hindsight extracts structured facts, resolves entities, and attaches temporal markers.
5. The status transitions from `processing` to **`stored`**.

### 3. Ask a Client Question
1. In the query box, enter a question requiring client context:
   - Example: *"What visual constraints or design preferences did the client specify?"*
2. Click **"Ask"**.
3. ContextRelay queries Hindsight Recall, retrieves matching memories and source chunks, and grounds the Application LLM to produce an answer.
4. Review the answer and expand the **Evidence** card to see the exact supporting facts, dates, and transcript quotes.

### 4. Layer Subsequent Meetings
1. As new client meetings occur, upload `YOUR_NEXT_TRANSCRIPT.txt` to the same client workspace.
2. When you query again, ContextRelay retrieves both historical and updated memories, identifying any changed decisions or updated timelines.

---

## Data Storage Breakdown

| Data Store | Purpose | Contents |
|---|---|---|
| **SQLite** | Operational Metadata | Client records (`id`, `name`, `hindsight_bank_id`, `created_at`) and Source records (`id`, `client_id`, `filename`, `size`, `hindsight_doc_id`, `status`). Never stores memory. |
| **Hindsight** | Long-Term Memory | Original document text chunks, structured extracted facts (`world`, `experience`, `observation`), entity knowledge graph, and temporal timestamps. |
| **Browser State** | UI Navigation Only | Active client ID. No secrets, API keys, or memory banks are ever stored in or accessible by the browser. |

---

## What the MVP Does NOT Do

To maintain architectural focus, ContextRelay explicitly excludes:
- Multi-tenancy, user logins, and role-based permissions (single agency workspace).
- Audio recording and automatic meeting bots (ingests text/markdown transcripts).
- Third-party integrations (Slack, Zoom, Google Meet, Salesforce, Notion).
- Retaining conversational user Q&A as memory (prevents memory pollution).
- Secondary vector databases, Redis caches, or complex message brokers.
- Fake seed data, demo accounts, or simulated metrics graphs.

---

## Troubleshooting

- **"Hindsight service unreachable"**: Ensure your Hindsight daemon is running at `HINDSIGHT_API_URL` (test with `curl http://localhost:8888/health`).
- **"LLM API Key missing"**: Ensure that the appropriate environment variable (e.g., `GROQ_API_KEY`) is set in `.env.local` for the selected `LLM_PROVIDER`.
- **"No relevant stored client memory found"**: This occurs normally when a query has no matching evidence in the uploaded transcripts. ContextRelay refuses to hallucinate an answer when memory does not exist.
- **Upload rejected**: Ensure the file has a `.txt` or `.md` extension, is valid UTF-8, is non-empty, and is under 5MB.
