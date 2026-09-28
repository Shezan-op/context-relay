# PROJECT CLARITY: CONTEXTRELAY

## 1. PRODUCT IN ONE SENTENCE

### 1. What exactly is this product?
ContextRelay is a single-workspace agency client-memory web application that transforms real client meeting transcripts into durable, client-isolated institutional memory using Hindsight, and later retrieves that memory to answer account questions with visible evidence for incoming or current team members.

### 2. What single problem does it solve?
It solves the loss of vital client-specific context, decisions, preferences, and constraints when agency account ownership transfers or when team members rotate off an account.

### 3. Who experiences this problem?
Agency account managers, project managers, creative directors, and engineering leads who inherit client relationships and risk repeating past mistakes or re-asking questions the client already answered.

### 4. What is the simplest possible description of the product that a 10-year-old could understand?
It is a digital brain for a company's client: you give it meeting notes, and whenever you ask what the client likes, hates, or decided, it remembers and shows you the exact words they said.

### 5. What does the user do BEFORE using the product?
The user attends a client meeting, receives or exports a plain text or markdown transcript of the conversation (from Zoom, Teams, Google Meet, Whisper, or Otter), and opens ContextRelay.

### 6. What does the user do AFTER using the product?
The user reads the grounded answer and its cited evidence to brief team members, prepare proposals, avoid rejected approaches, and take confident client actions without bothering the client with repetitive questions.

### 7. What is the one thing this product must do extremely well?
Accurately retain durable client-specific business facts into isolated Hindsight memory banks and retrieve verifiable evidence to ground factual, non-hallucinated answers.

### 8. What would make this product completely useless if it failed?
If it hallucinated client preferences, mixed up memory between different clients, or failed to surface real decisions recorded in previous meeting transcripts.

---

## 2. THE REAL USER FLOW

### 9. What is the very first thing the user does?
The user opens ContextRelay in a web browser and sees the clean dashboard displaying existing clients or an empty state inviting them to create their first client.

### 10. What is the first piece of information entering the system?
A client name string (e.g., "Acme Corporation").

### 11. Where exactly does that information come from?
It is typed by the agency user into the "Create Client" form.

### 12. How does the system receive it?
Via an HTTP POST request to the application's `/api/clients` endpoint.

### 13. What happens immediately after receiving it?
The server creates a record in the local SQLite database, provisions a dedicated Hindsight memory bank keyed by a stable identifier (`client:<uuid>`), configures the bank's client-memory mission, and redirects the user into that client's dedicated workspace.

### 14. What does AI do with it?
When the user subsequently uploads a meeting transcript (`.txt` or `.md`), Hindsight's retain engine chunks the text and uses its LLM fact-extraction pipeline guided by the client-memory mission to extract durable business knowledge.

### 15. What information does AI extract?
Explicit client preferences, decisions, approvals, rejections, constraints, goals, stakeholder roles, commitments, timelines, prior attempts, and stated reasons behind decisions.

### 16. What information is ignored?
Greetings, pleasantries, small talk, scheduling logistics, conversational filler, passwords, API keys, credentials, and unrelated personal details.

### 17. Where is the extracted information stored?
In the client's isolated Hindsight memory bank hosted on the Hindsight server.

### 18. Who stores it?
The Hindsight memory service via its Retain pipeline.

### 19. What exactly is stored?
Structured memory units containing fact statements, classified fact types (`world`, `experience`, `observation`), linked entities, temporal timestamps (`occurred_start`, `mentioned_at`), document IDs, and source chunk provenance.

### 20. When does it become permanent memory?
Immediately upon successful completion of the Hindsight Retain operation for that transcript document.

### 21. What causes the system to retrieve that memory later?
The user navigates to the client workspace, types a natural-language question into the query box, and submits it.

### 22. Who retrieves it?
The ContextRelay server calls the Hindsight API's Recall endpoint targeting that client's isolated bank ID.

### 23. What does the system do with retrieved information?
The server verifies that relevant evidence exists; if found, it formats the retrieved facts and source chunks into a grounded context prompt for the application LLM to synthesize a concise answer. If no evidence is found, it bypasses the LLM and returns a "No stored memory found" state.

### 24. What does the user actually see?
The user sees the direct natural-language answer prominently displayed, followed by an explicit "Evidence" drawer showing the recalled memories, event dates, source filenames, and verbatim source chunks.

### 25. What action does the user take after seeing it?
The user executes their client task (e.g., drafts the creative brief, approves a technical spec, aligns delivery timelines) with certainty based on historical client decisions.

### 26. What happens after that action?
The user proceeds with their agency workflow. Crucially, the query and answer are NOT saved into Hindsight, preventing memory pollution from transient user lookups.

---

## 3. INPUT

### 27. What is the exact input?
Two inputs:
1. Client Name string (e.g., "Northwind Health").
2. Real client meeting transcript file in `.txt` or `.md` format.

### 28. Is the input text, audio, transcript, image, file, API data, browser data, or something else?
A text/markdown document file containing a conversation transcript.

### 29. Is the input manually entered or automatically captured?
Manually uploaded by the user from their local machine.

### 30. If automatically captured, exactly where does it come from?
Not automatically captured in MVP; transcripts are generated by the agency's existing meeting transcription tools prior to upload.

### 31. At what moment does the system receive it?
When the user selects the file in the client workspace upload component and clicks upload.

### 32. Does the user have to copy/paste anything?
No; they upload the `.txt` or `.md` file directly.

### 33. Does the user have to fill out a form?
Only a single-field input: "Client Name" during client creation. Transcript upload is a direct file picker.

### 34. Does the user have to tell the system what is important?
No. The user never selects facts or tags what to remember.

### 35. If yes, why can't AI determine this automatically?
AI determines this automatically. Hindsight's retain engine evaluates importance based on the configured client-memory mission.

### 36. What is the minimum human input required?
1. Enter client name once.
2. Upload the transcript file.
3. Type the question when looking up client context.

### 37. Can that human input be removed? If yes, explain how.
In the MVP, this human input represents the minimal essential boundary. Client creation defines the memory boundary; file upload supplies the source material; question input expresses user intent. While background meeting bots could theoretically automate upload in future iterations, doing so in MVP would add unnecessary complexity and failure modes.

---

## 4. AI RESPONSIBILITY

### 38. What exactly does the LLM do?
Two separate LLM roles exist:
1. **Hindsight LLM (Internal to Hindsight server):** Analyzes transcript chunks during Retain to extract structured facts, entities, and temporal attributes according to the retain mission.
2. **ContextRelay Application LLM:** Receives the user question and the retrieved Hindsight memories/chunks, and synthesizes a direct, truthful answer with evidence citations.

### 39. What does the LLM NOT do?
The application LLM does NOT extract memories from raw files, does NOT write to Hindsight, does NOT select bank IDs, does NOT invent missing information, does NOT perform search, and does NOT retain conversations.

### 40. Which decisions are deterministic software decisions?
1. Client and bank ID mapping (`client:<uuid>`).
2. Transcript file type, size, and non-empty validation.
3. SQLite metadata insertion and status updates.
4. Calling Hindsight Retain and Recall endpoints.
5. Evaluating whether recall returned any results before calling the LLM.
6. Rendering evidence objects and error banners.

### 41. Which decisions require AI?
1. Extracting semantic business knowledge, entity relations, and dates from unstructured dialogue (Hindsight).
2. Multi-strategy retrieval ranking across semantic, BM25, graph, and temporal dimensions (Hindsight).
3. Synthesizing natural-language explanations that resolve temporal shifts or acknowledge evidentiary limits (Application LLM).

### 42. What information is sent to the LLM?
Only the system grounding instructions, the user's specific question, and the list of recalled Hindsight facts with their associated source metadata and text chunks.

### 43. What does the LLM return?
A concise, grounded answer text referencing the provided evidence, noting any timeline conflicts or stating if evidence is incomplete.

### 44. Is the LLM extracting information, summarizing, reasoning, classifying, generating, or doing several of these?
The application LLM performs grounded reasoning, synthesis, and text generation over retrieved facts. Hindsight's retain LLM performs information extraction and classification.

### 45. Could a normal function do any of this instead?
A normal function handles deterministic routing, validation, and storage. It cannot comprehend conversational subtleties or compose natural language answers from disparate unstructured dialogue snippets.

### 46. If yes, why is an LLM needed?
An LLM is required to understand conversational nuances (e.g., detecting that "let's steer clear of dark palettes" is a visual constraint) and to summarize complex multi-meeting histories in response to arbitrary questions.

### 47. What happens if the LLM makes a mistake?
The user does not rely on blind trust: the explicit Evidence section right beneath the answer displays the exact facts and source excerpts used, enabling instant manual verification.

### 48. Can the user see what evidence caused the AI to make its decision?
Yes. Every factual answer includes an attached Evidence list displaying fact texts, dates, filenames, and source quotes.

---

## 5. MEMORY

### 49. What exactly counts as a memory?
A durable, client-specific business statement extracted from a meeting transcript: decisions, preferences, constraints, approvals, rejections, stakeholder roles, commitments, timelines, previous attempts, and explicit reasons.

### 50. Give 5 real examples of memories this product should store.
1. "Client explicitly forbids using dark backgrounds or corporate stock imagery in website mockups."
2. "VP of Marketing Sarah Jenkins holds final sign-off authority on all branding deliverables."
3. "Client rejected the three-tier subscription model on March 15 because their enterprise cycle requires custom invoicing."
4. "All technical documentation must adhere to standard OpenAPI 3.1 specifications."
5. "Client agreed to extend the beta testing window by three weeks to accommodate internal security reviews."

### 51. Give 5 examples of things it should NOT store.
1. "Good morning everyone, can you hear me okay?"
2. "Dave mentioned he was stuck in traffic for 20 minutes before joining."
3. "The database password is Admin_2026! and AWS key is AKIA..."
4. "The marketing director is taking a vacation to Hawaii next month."
5. "Let's reschedule our sync from Thursday 2pm to Friday 10am."

### 52. Who decides whether something is worth storing?
Hindsight's fact extraction pipeline, guided by the explicit `retain_mission` configured for each client bank.

### 53. Can AI decide automatically?
Yes. Guided by the client-memory mission, Hindsight's extraction engine identifies durable business knowledge and ignores transient chatter.

### 54. Does the user need to approve every memory?
No. Requiring manual approval for dozens of facts per meeting creates friction that defeats the purpose of an automated memory system.

### 55. If approval is required, why?
Approval is NOT required.

### 56. If approval is NOT required, why is automatic storage safe?
Automatic storage is safe because memories are strictly isolated within the client's bank, traceable to the source document, and every answer displays its supporting evidence so any misinterpretation can be caught immediately.

### 57. Where are memories physically stored?
In the Hindsight server's persistent storage engine (database, vector index, and knowledge graph).

### 58. What database or memory system stores them?
Hindsight.

### 59. What is the relationship between the original input and the stored memory?
The original transcript is stored as a logical Hindsight document (`document_id`). Memory facts and chunks extracted from that document maintain direct references to the parent `document_id` and chunk index.

### 60. Can the original input be retrieved later?
Yes. Hindsight preserves document chunks which are retrieved during recall via `include: { chunks: {} }`.

### 61. Can a memory be updated?
Yes. Retaining with the same `document_id` replaces/updates previous extractions for that document. Ingesting subsequent transcripts adds new memories that update the client's historical timeline.

### 62. Can a memory become outdated?
Yes. Clients frequently change their minds, switch technical directions, or update preferences across successive meetings.

### 63. How does the system know which memory is newer?
Each retained item and extracted fact records temporal metadata (`occurred_start`, `mentioned_at`, and source upload timestamp).

### 64. Can contradictory memories exist?
Yes. For instance, Meeting 1 may specify "React frontend" while Meeting 4 specifies "Migrating frontend to Next.js".

### 65. If yes, how are contradictions handled?
Both memories remain preserved with their respective dates. When answering, the application LLM identifies the chronological progression, highlights that the preference shifted, and prioritizes the newest explicit statement.

---

## 6. RETRIEVAL

### 66. When does the system retrieve memory?
When the user submits a question in the client workspace.

### 67. What causes retrieval?
The submission of the question form triggers an HTTP POST request to `/api/query`.

### 68. What does the system ask the memory system?
It executes a Hindsight Recall query containing the user's natural language question and requests matching facts, entities, and source chunks.

### 69. What information is sent into that query?
The bank ID (`client:<uuid>`), the query string, requested fact types (`world`, `experience`, `observation`), `max_tokens`, `budget`, and include options (`include: { chunks: {}, entities: {} }`).

### 70. What comes back?
A `RecallResponse` object containing an array of ranked `results` (facts with text, type, context, timestamp, chunk_id, document_id) plus matching `chunks` and `entities`.

### 71. How does the system decide which memories matter?
Hindsight's multi-strategy engine runs vector similarity, BM25 keyword matching, graph traversal, and temporal proximity in parallel, then fuses and reranks them using reciprocal rank fusion (RRF) and cross-encoder reranking.

### 72. Does Hindsight decide this?
Yes. Hindsight is the sole retrieval and ranking authority.

### 73. Does the LLM decide this?
No. The LLM only receives memories that Hindsight has already retrieved and ranked.

### 74. Does normal application logic decide this?
Deterministic code checks that the retrieved memory array is non-empty before invoking the LLM.

### 75. What happens when no useful memory exists?
The system bypasses the LLM entirely and immediately returns a clean state: "No relevant stored client memory found."

### 76. What happens when the retrieved memory is wrong or irrelevant?
If retrieved facts do not address the prompt, the application LLM's system instructions mandate that it state that the stored client memory lacks sufficient information to answer the question.

---

## 7. OUTPUT

### 77. What is the actual output of the product?
A grounded natural-language answer accompanied by an evidence drawer showing the exact supporting memories, timestamps, and source document excerpts.

### 78. Is it a summary, warning, recommendation, insight, question, notification, dashboard, or something else?
A grounded factual answer with verifiable provenance evidence.

### 79. What does the user see on screen?
1. The user's submitted question.
2. The synthesized answer text.
3. An expandable/visible Evidence card containing each supporting memory, its timestamp/date, source file, and verbatim transcript chunk.

### 80. Give 3 realistic examples of final outputs.
**Example 1:**
- **Answer:** "Acme Corp requires all user interface components to use light mode surfaces and warm neutral colors. Dark mode themes and saturated neon accents were explicitly prohibited by Sarah Jenkins on 2026-03-12."
- **Evidence:** Memory: "Client forbids dark backgrounds or neon colors; requires warm neutral tones" (Source: kickoff-transcript.txt, 2026-03-12).

**Example 2:**
- **Answer:** "The client originally approved a bi-weekly sprint review cycle in January, but shifted to weekly syncs on February 28 to meet an accelerated launch deadline of June 1."
- **Evidence:**
  - Memory 1: "Approved bi-weekly sprint reviews" (Source: meeting-01.txt, 2026-01-15)
  - Memory 2: "Changed meeting cadence to weekly due to June 1 launch deadline" (Source: meeting-04.txt, 2026-02-28)

**Example 3:**
- **Answer:** "No relevant stored client memory found regarding European data residency requirements. The uploaded transcripts do not contain discussions about EU server locations."
- **Evidence:** None.

### 81. Why is this output useful?
It provides definitive institutional context in seconds, eliminating guesswork and preventing the agency from repeating previously rejected proposals.

### 82. What can the user do with the output immediately?
Directly guide work (e.g., adjust a design palette, revise a project schedule, draft a technical proposal) with confidence that it aligns with past client decisions.

### 83. Does the output help the user's next action?
Yes, it ensures the user's immediate client deliverable respects established client constraints.

### 84. If the output disappeared, what useful thing would the user lose?
The user would lose the ability to instantly recall critical past agreements, forcing them to manually read hours of transcripts or risk asking the client an embarrassing duplicate question.

---

## 8. AUTOMATION

### 85. Which parts happen automatically?
1. Splitting transcripts and extracting structured facts, entities, and dates (Hindsight).
2. Knowledge graph construction and entity linking (Hindsight).
3. Multi-strategy retrieval and reranking on queries (Hindsight).
4. Grounded answer generation from retrieved context (Application LLM).

### 86. Which parts require the user?
1. Creating the client profile (entering client name).
2. Uploading the transcript file.
3. Submitting the context question.

### 87. Why does each human step exist?
- Client creation establishes account boundaries and security isolation.
- Upload provides authentic meeting source data.
- Question input specifies what client context is needed.

### 88. Can any human step be removed?
No. In the MVP scope, these three steps represent the irreducible core of human interaction.

### 89. If yes, remove it from the proposed architecture.
All non-essential human steps (manual tagging, memory curation, query reformulation, manual chunking) have already been removed.

### 90. Is the system collecting information continuously or only when the user triggers it?
Only when triggered by user upload. No continuous recording or background scraping occurs.

### 91. What should happen without the user explicitly saying "remember this"?
All durable business facts, constraints, decisions, and roles in an uploaded transcript are automatically extracted and retained by Hindsight.

### 92. What should happen without the user manually entering information?
Entity resolution, timestamp extraction, relationship mapping, and fact indexing happen completely automatically upon file ingestion.

---

## 9. FEEDBACK LOOP

### 93. What does the system know before the interaction?
It knows only the facts previously retained in the specific client's memory bank (or nothing if the bank is newly created).

### 94. What new information does it receive during the interaction?
The complete text of a new client meeting transcript.

### 95. What does it store afterward?
New structured memories extracted from the transcript, with temporal anchors and document references.

### 96. What changes because of that new information?
The client's institutional memory expands; future recall queries will surface both the historical and updated facts.

### 97. Show one complete example from beginning to end.
- **Meeting 1 (Jan 10):** Client states: "Our database must remain PostgreSQL on AWS RDS; do not use MongoDB."
  - *Ingestion:* Fact retained: "Client requires PostgreSQL on AWS RDS; rejects MongoDB."
  - *Query:* "What database does the client require?"
  - *Output:* "The client requires PostgreSQL on AWS RDS and specifically rejected MongoDB (Meeting 1, Jan 10)."
- **Meeting 2 (March 15):** Client states: "Due to high-throughput IoT analytics requirements, we have decided to adopt TimescaleDB for time-series data while keeping PostgreSQL for core user records."
  - *Ingestion:* Fact retained: "Adopted TimescaleDB for time-series IoT data; retained PostgreSQL for core user records (Meeting 2, March 15)."
  - *Query:* "What database does the client require?"
  - *Output:* "The client uses PostgreSQL for core user records, but adopted TimescaleDB on March 15 for time-series IoT analytics to handle high-throughput demands."

### 98. What happens in Meeting 1?
Initial requirements, technical stack choices, and project boundaries are established.

### 99. What gets stored?
Initial durable facts regarding technology choices, stakeholder responsibilities, and constraints.

### 100. What happens in Meeting 2?
Progress is reviewed, certain architectural choices are refined or updated, and new timelines are agreed upon.

### 101. What previous information is retrieved?
When a query is run after Meeting 2, Hindsight retrieves memories from both Meeting 1 and Meeting 2.

### 102. How does that information change the recommendation?
The LLM compares the dates of the retrieved memories, recognizes the pivot or refinement made in Meeting 2, and produces an answer reflecting current reality while noting the past decision.

### 103. What happens after Meeting 2?
The agency team executes work based on the updated direction without making obsolete assumptions.

### 104. How does Meeting 2 improve Meeting 3?
The team enters Meeting 3 fully aligned on all decisions made in Meetings 1 and 2, preventing repetitive circular discussions.

---

## 10. THIRD-PARTY SERVICES

### 105. Why is this service required?
Two services are required:
1. **Hindsight API:** Required as the dedicated long-term biomimetic memory engine.
2. **LLM Provider (e.g. Groq / OpenAI / Gemini):** Required to synthesize clear, grounded natural-language answers from retrieved facts.

### 106. What exact job does it perform?
- **Hindsight:** Ingestion chunking, fact extraction, entity resolution, temporal mapping, multi-strategy recall (vector, keyword, graph, temporal), and reranking.
- **LLM Provider:** Takes retrieved evidence and user question, generates grounded natural-language response.

### 107. Could the product work without it?
No. Without Hindsight, building custom vector databases, graph databases, BM25 indices, and entity resolution would add thousands of lines of fragile code. Without the LLM, synthesizing human-readable answers from structured facts is impossible.

### 108. What information goes into it?
- Into Hindsight: Transcript text, document ID, client bank ID, and retain mission.
- Into LLM: User question, system grounding prompt, and recalled facts/chunks.

### 109. What comes back?
- From Hindsight: Ranked recall results (facts, types, context, dates, chunk IDs) and chunks.
- From LLM: Grounded natural-language answer text.

### 110. Who owns the resulting data?
The agency / user owns all transcript content and memory data.

### 111. Does introducing this service create unnecessary complexity?
No. It drastically simplifies the system by replacing an entire bespoke RAG/vector/graph infrastructure with a single unified memory engine.

### 112. Is this service solving a real product requirement or simply making the architecture sound sophisticated?
It directly solves the core product requirement: turning unstructured conversation into durable, retrievable client memory.

---

## 11. DATABASE

### 113. What data needs permanent storage?
1. Client records (ID, name, Hindsight bank ID, timestamp).
2. Source upload records (ID, client ID, filename, content type, size, Hindsight document ID, ingestion status, timestamp).

### 114. Why does each piece of data need permanent storage?
- Client records allow the application to list clients, navigate workspaces, and route queries to the correct isolated Hindsight bank.
- Source records track upload history, display processing/stored status to the user, and map uploaded files to Hindsight document IDs.

### 115. What database is being used?
SQLite.

### 116. Why this database?
SQLite is embedded, zero-configuration, lightning fast, requires no separate database daemon, and provides rock-solid ACID transactions for lightweight application metadata.

### 117. What are the minimum tables/entities required?
Exactly two tables: `clients` and `sources`.

### 118. What does each table represent in plain English?
- `clients`: The portfolio of client accounts managed by the agency workspace.
- `sources`: The meeting transcript files uploaded for each client.

### 119. Who writes to each table?
The Next.js server-side API routes (`/api/clients` and `/api/sources`).

### 120. Who reads from each table?
The Next.js server-side API routes and page renderers when listing clients, loading workspace status, and verifying bank IDs.

### 121. What causes each write?
- Form submission to create a client inserts into `clients`.
- Uploading a transcript file inserts into `sources`, and completion updates the status.

### 122. What causes each read?
- Loading the home page reads `clients`.
- Loading a client workspace reads `clients` and `sources`.
- Submitting a query reads `clients` to look up `hindsight_bank_id`.

### 123. What data could simply be derived instead of stored?
Memory counts, fact details, entity relationships, and answer texts are derived live from Hindsight and the LLM, and are NOT duplicated in SQLite.

### 124. Are we adding a database because the product needs one, or because "real apps need databases"?
The product strictly needs a reliable metadata store to persist client identities and map them to their dedicated Hindsight banks across browser sessions.

---

## 12. ARCHITECTURE

### 125. Draw the complete system in the simplest possible flow.

```
INPUT
  │
  ▼
[User uploads .txt / .md transcript to Next.js API]
  │
  ▼
PROCESS
  │
  ▼
[Validate file & record metadata in SQLite `sources`]
  │
  ▼
STORE
  │
  ▼
[Send transcript to Hindsight Retain with Client Mission]
  │
  ▼
[Hindsight extracts facts & stores in Bank: `client:<uuid>`]
  │
  ▼
RETRIEVE
  │
  ▼
[User asks client question -> Hindsight Recall queries Bank]
  │
  ▼
[Ranked facts & source chunks returned]
  │
  ▼
OUTPUT
  │
  ▼
[Application LLM synthesizes answer -> UI displays Answer + Evidence]
```

### 126. What are the absolute minimum components required?
1. Next.js Web Application (React UI + Server API routes).
2. SQLite Database (Client & Source metadata).
3. Hindsight Memory Server (Long-term client memory).
4. Application LLM API (Grounded answer generation).

### 127. What components are optional?
None. Every listed component serves a non-redundant, mandatory role.

### 128. What components are unnecessary?
Redis, vector databases, message queues (Kafka/RabbitMQ), LangChain, LlamaIndex, background worker microservices, authentication systems, multi-agent orchestrators.

### 129. What components are being added only for future scalability?
None. The architecture is strictly scoped to the immediate MVP.

### 130. Can the entire MVP be explained in one diagram?
Yes, the 5-stage ASCII diagram above fully explains the entire system architecture.

### 131. Can the entire MVP be explained in under 2 minutes?
Yes: "ContextRelay turns client meeting transcripts into durable institutional memory. When you upload a transcript, Hindsight extracts business facts into a private bank for that client. When an account manager asks a question, Hindsight recalls the relevant facts, and our LLM answers with direct quotes and evidence."

### 132. If not, simplify it.
Already maximally simplified.

---

## 13. MVP BOUNDARY

### 133. What is the smallest version that proves the idea?
An app where an agency can create a client, upload a real meeting transcript, store durable memory in Hindsight, and ask a question to receive a factual answer supported by real evidence.

### 134. What must exist for the demo to work?
1. Client creation flow.
2. Isolated Hindsight memory bank per client.
3. Transcript upload and validation (`.txt`, `.md`).
4. Hindsight Retain integration with client mission.
5. Hindsight Recall integration with chunk/entity retrieval.
6. Grounded LLM answer generation with strict abstention on empty evidence.
7. Clean UI displaying Answer and Evidence.

### 135. What does NOT need to exist?
User authentication, billing, permissions, audio recording, calendar bots, email scrapers, conversational chat memory storage, analytics charts, PDF export.

### 136. What features are explicitly excluded from the MVP?
Chat history memory retention, multi-agent debate, custom prompt editors, automated notification digests, team permission matrices.

### 137. What integrations are explicitly excluded?
Slack, Zoom bot, Google Meet bot, Microsoft Teams bot, Salesforce, HubSpot, Jira, Notion.

### 138. What automation is explicitly excluded?
Autonomous background meeting listening, continuous calendar sync, scheduled email reports.

### 139. What infrastructure is explicitly excluded?
Docker Swarm/Kubernetes clusters, distributed caches, separate worker servers, message brokers.

### 140. What should NOT be built even if it sounds cool?
A multi-agent consensus panel, synthetic AI confidence meters, simulated agency metrics graphs, or pre-seeded fake client portfolios.

---

## 14. HUMAN INVOLVEMENT TEST

### 141. Why does the human have to do this?
- **Create client:** The human defines the client business entity and organizational boundary.
- **Upload transcript:** The human provides authentic source documentation.
- **Ask question:** The human articulates the specific business knowledge needed.

### 142. Could the system do it automatically?
A bot could record calls in an enterprise suite, but for the MVP, manual upload ensures complete user control, privacy, and zero third-party platform lock-in.

### 143. If the system can do it automatically, why are we making the human do it?
To keep the MVP reliable, transparent, secure, and focused entirely on the memory retrieval pipeline rather than audio transcription plumbing.

### 144. Does this step create real value?
Yes. It guarantees that only genuine, intended client transcripts enter the memory system.

### 145. Does this step exist only because the architecture is poorly designed?
No. It exists because establishing intentional client boundaries is good system design.

---

## 15. NOTEBOOK TEST

### 146. Could a human achieve the same result by writing everything in a notebook?
In theory, yes; in practice, across 20 clients, 50 meetings each, and staff turnover, handwritten notebooks are lost, fragmented, and never cross-referenced by replacement team members.

### 147. What does this software automate that the notebook cannot?
Instant multi-strategy semantic, keyword, graph, and temporal search across thousands of pages of dialogue in milliseconds.

### 148. What does AI discover that the human would otherwise have to manually identify?
Subtle cross-meeting connections, implicit constraints, and evolving client preferences recorded months apart across different attendees.

### 149. What does the system remember across time that a normal notebook cannot practically surface?
Exact chronological decision shifts, stakeholder sign-offs, and verbatim rationales that human memory conflates or misattributes over time.

### 150. What useful action does the system produce from that memory?
An immediate, evidence-grounded answer that prevents an agency team member from making an obsolete proposal or re-asking a settled question.

---

## 16. DEMO TEST

### 151. Show exactly what happens during a 5-minute demo.
1. Start with an empty ContextRelay instance (0 clients, 0 memories).
2. Create client "Apex Logistics".
3. Upload real meeting transcript 1 (`apex_kickoff.txt`).
4. Show ingestion status update to "Stored".
5. Ask question: "What are Apex's requirements for their driver mobile app?"
6. Review the grounded answer and verify the cited evidence card.
7. Upload meeting transcript 2 (`apex_q2_review.txt`) where the client updates their offline sync requirement.
8. Ask the same question: "What are Apex's requirements for their driver mobile app?"
9. Verify that the answer highlights the updated offline sync architecture while citing both meetings.
10. Conclude with an explanation of client memory isolation and zero hallucination.

### 152. What does the user click?
"Create Client" -> "Upload Transcript" -> "Ask".

### 153. What information enters the system?
Client name, transcript text files, and user questions.

### 154. What does AI do?
Hindsight extracts durable memories into the client's bank. On recall, Hindsight retrieves ranked facts and chunks; the LLM generates a grounded answer.

### 155. What gets stored?
SQLite stores client and file metadata. Hindsight stores durable facts, entities, and text chunks.

### 156. What does the user see?
A clean, focused interface displaying client workspaces, source file statuses, synthesized answers, and explicit evidence drawers.

### 157. Then simulate the next interaction.
The user uploads Transcript 2 containing updated information and re-queries the system.

### 158. What does the system remember?
Both the initial requirements from Transcript 1 and the revised decisions from Transcript 2.

### 159. What new insight does it produce?
It synthesizes that the client pivoted or refined their requirement, providing the new policy and citing the historical change.

### 160. Why would a judge understand the value immediately?
Because every agency has lost a major client or wasted billable hours due to lost context during staff turnover; ContextRelay visibly solves that exact pain in under 60 seconds with clear proof.

---

## 17. FINAL SIMPLICITY CHECK

### Product
ContextRelay is a single-workspace agency client-memory web application that turns real meeting transcripts into durable institutional memory using Hindsight to answer account questions.

### User
Agency account managers, project managers, and leads managing client relationships across team transitions.

### Input
A client name and plain text or markdown meeting transcript files (`.txt`, `.md`).

### AI
Hindsight extracts and retrieves structured memories; an application LLM synthesizes grounded answers exclusively from recalled evidence.

### Memory
Durable, client-specific business knowledge including decisions, preferences, constraints, stakeholder roles, and outcomes.

### Storage
SQLite stores client and source metadata; Hindsight stores long-term memory documents, facts, and graphs.

### Retrieval
Multi-strategy Hindsight Recall (semantic, keyword, graph, temporal) executed on the client's isolated bank.

### Output
A concise natural-language answer with an explicit evidence section showing supporting memories, timestamps, and source chunks.

### Human involvement
Create client, upload transcript file, ask question.

### Core loop
```
INPUT (Transcript File)
  ↓
INGEST (Validate & Record)
  ↓
HINDSIGHT RETAIN (Extract Facts & Entities)
  ↓
HINDSIGHT RECALL (Retrieve Evidence)
  ↓
LLM ANSWER (Ground in Evidence)
  ↓
OUTPUT + EVIDENCE (Render in UI)
```

### MVP Scope
- Clean empty state with zero seeded data.
- Client creation with isolated Hindsight bank ID (`client:<uuid>`).
- Client-memory mission configured on bank.
- Transcript file upload (`.txt`, `.md`) with validation.
- Ingestion status tracking in SQLite (`processing`, `stored`, `failed`).
- Hindsight Retain integration.
- Hindsight Recall integration with chunk/entity support.
- Grounded application LLM answering with strict abstention on empty memory.
- UI displaying direct answer and verifiable evidence card.
- Comprehensive test suite validating pipeline end-to-end.

### Explicitly NOT Building
- User authentication, multi-tenant billing, and team permissions.
- Audio recording and automatic transcription bots.
- Slack, Zoom, Google Meet, or CRM integrations.
- Conversational chat history retention in Hindsight.
- Secondary vector databases, Redis caches, or message queues.
- Multi-agent debate or supervisor architectures.
- Seed data, fake clients, or synthetic activity graphs.

### Core Value Question
**“If I removed everything except the core value, what would remain?”**
Uploading a client meeting transcript, storing durable client memory in Hindsight, and asking a question to get an evidence-backed answer. That is the exact ContextRelay MVP.
