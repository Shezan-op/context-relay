# MASTER BUILD PROMPT. VIORA

You are the principal product architect, senior full-stack engineer, Hindsight engineer, and QA engineer responsible for building this product from an empty repository.

Product name: Viora

Your job is NOT to invent a bigger product. Your job is to build one small, working product correctly from first principles.

The product solves one problem: agency-client knowledge disappears when the person who handled the account leaves, so the next person repeats old mistakes or asks the client the same questions again.

Viora turns real client meeting transcripts into durable client memory using Hindsight, then retrieves that memory later to answer questions for the next account manager.

The core pipeline MUST remain understandable as:

INPUT
  ↓
INGEST
  ↓
HINDSIGHT RETAIN
  ↓
HINDSIGHT MEMORY
  ↓
HINDSIGHT RECALL
  ↓
LLM ANSWER
  ↓
OUTPUT + EVIDENCE

Do not add another pipeline unless a requirement below makes it unavoidable.

----------------------------------------------------------------
0. ABSOLUTE RULES
----------------------------------------------------------------

1. DO NOT write, modify, generate, or suggest production code until the complete 160-question AI PROJECT CLARITY GATE below has been answered.

2. Answer every single question. Do not skip, merge, shorten, or say “covered above.” Every question gets a direct answer.

3. Use the product definition and constraints in this prompt as the source of truth. Ask me a clarification question only if something genuinely cannot be determined from this prompt. Do not ask questions merely because a technical choice exists; choose the simplest reasonable implementation.

4. Before coding, create `PROJECT_CLARITY.md` containing the complete answers, the final one-paragraph product definition, the final architecture diagram, the exact data flow, and the MVP boundary.

5. Then create `ARCHITECTURE.md` containing the final implementation architecture. It must match the clarity gate exactly.

6. Only after those documents are complete may you start implementing.

7. Do not introduce unnecessary agents. There is ONE application agent behavior: answer client-context questions using Hindsight memory and the LLM. There is no multi-agent system.

8. Do not introduce a vector database, Redis, Kafka, queues, event buses, LangChain, LlamaIndex, a separate RAG framework, a graph database, or another memory database. Hindsight is the memory system.

9. Do not build a Chrome extension, browser extension, email integration, Slack integration, calendar integration, CRM integration, meeting bot, audio transcription service, mobile app, notification system, or background monitoring system in the MVP.

10. Do not build authentication, team permissions, billing, organizations, subscriptions, or multi-tenant administration in the MVP. Treat the product as one agency workspace.

11. Do not seed the application with demo data.

12. There must be ZERO preloaded clients, transcripts, memories, answers, conversations, example records, fake accounts, fake testimonials, fake metrics, or fake activity.

13. The first launch must open in an empty state.

14. Do not create a seed script that inserts fake runtime data.

15. Do not hard-code fake client names or fake transcript content into the UI.

16. Generic empty-state text such as “Create a client” or “Upload a transcript” is allowed. Fake business content is not.

17. Tests may use ephemeral test strings internally, but those strings must never be seeded into the runtime application or shown to users.

18. Never expose Hindsight API keys or LLM keys to the browser.

19. Never log full client transcripts, secrets, API keys, or raw sensitive content to server logs.

20. Never invent a memory. If Hindsight does not return useful evidence, the product must say that it does not have stored evidence instead of guessing.

21. Never let the LLM become the memory store. The LLM generates the final answer from retrieved memory. Hindsight stores and retrieves durable memory.

22. Never use the LLM to decide manually selected “important” facts before storing them. The user must NOT have to tell the system what is important.

23. The application should send the transcript to Hindsight Retain with a precise mission describing what should become durable memory. Hindsight performs memory extraction according to its supported current API/configuration.

24. Verify the CURRENT official Hindsight SDK/API documentation before implementation. Do not invent method names, parameters, environment variables, or response shapes from memory.

25. Pin the actual Hindsight SDK version used by the project.

26. Use the smallest current stable full-stack stack that supports a clean single-repository web application. Preferred baseline: Next.js + TypeScript for UI and server routes, with a minimal SQLite database for app metadata. Do not add an ORM unless it materially reduces complexity. Direct SQL is acceptable.

27. Use Hindsight as the source of truth for long-term client memory. SQLite is NOT the memory store.

28. SQLite stores only application metadata needed to operate the UI: clients, source-upload metadata, and the mapping between app records and Hindsight document IDs/bank IDs.

29. The original transcript is retained by Hindsight as the source document. Durable extracted facts become Hindsight memories. Do not duplicate full transcripts into SQLite unless the current Hindsight integration absolutely requires it.

30. Use one isolated Hindsight memory bank per client. Use a stable internal client ID in the bank ID, such as `client:<uuid>`. Never mix two clients inside the same memory bank.

31. A client must be created before transcript ingestion because the active client determines which Hindsight bank receives the transcript.

32. A client creation form asks only for the client name. Nothing else is required.

33. The core ingestion input is a client meeting transcript file. MVP accepted file types: `.txt` and `.md`.

34. The system must also support the same ingestion service receiving text programmatically from the server for testing, but the UI does not need multiple ingestion paths.

35. Do not add audio recording or transcription. The transcript already exists before Viora receives it.

36. Do not make the user manually select which facts to remember.

37. Do not store every conversational question/answer in memory. The MVP stores durable client knowledge from source transcripts only. This prevents memory pollution from repetitive user queries.

38. The user asks the product questions about the selected client. The application calls Hindsight Recall against that client’s bank.

39. Hindsight Recall is the retrieval layer. Do not add a separate semantic search layer.

40. Retrieved Hindsight memories and source chunks are passed to the LLM as grounded context.

41. The LLM answers only from retrieved evidence. It must not use unsupported world knowledge to fill gaps.

42. Every factual answer must have a visible evidence section showing the memory/source information used when available.

43. When memories conflict, do not silently merge them. Prefer the newest explicit source when the dates are known, and visibly disclose the conflict when it matters.

44. A new transcript does not overwrite old history. It adds new evidence. The system uses temporal information and the final grounding prompt to treat newer explicit evidence as newer client state.

45. If no useful memory is found, the output must explicitly say there is no relevant stored client memory.

46. Never present a probabilistic confidence score invented by the LLM. Evidence and uncertainty are enough.

47. The UI must make the core memory behavior visible. A user should be able to see that a question was answered from stored client memory.

48. Keep the UI clean and minimal. No dashboard bloat. No KPI walls. No decorative AI gimmicks. No fake activity graphs. No unnecessary cards.

49. The app must be understandable in under two minutes by a judge seeing it for the first time.

50. The app must be usable from a fresh install with real user-provided transcript files and a real LLM/Hindsight API configuration.

----------------------------------------------------------------
1. AI PROJECT CLARITY GATE
----------------------------------------------------------------

Before writing code, answer EVERY question below. The answers must describe the exact Viora MVP you are going to build.

========================
1. PRODUCT IN ONE SENTENCE
========================

1. What exactly is this product?

2. What single problem does it solve?

3. Who experiences this problem?

4. What is the simplest possible description of the product that a 10-year-old could understand?

5. What does the user do BEFORE using the product?

6. What does the user do AFTER using the product?

7. What is the one thing this product must do extremely well?

8. What would make this product completely useless if it failed?

========================
2. THE REAL USER FLOW
========================

9. What is the very first thing the user does?

10. What is the first piece of information entering the system?

11. Where exactly does that information come from?

12. How does the system receive it?

13. What happens immediately after receiving it?

14. What does AI do with it?

15. What information does AI extract?

16. What information is ignored?

17. Where is the extracted information stored?

18. Who stores it?

19. What exactly is stored?

20. When does it become permanent memory?

21. What causes the system to retrieve that memory later?

22. Who retrieves it?

23. What does the system do with retrieved information?

24. What does the user actually see?

25. What action does the user take after seeing it?

26. What happens after that action?

========================
3. INPUT
========================

27. What is the exact input?

28. Is the input text, audio, transcript, image, file, API data, browser data, or something else?

29. Is the input manually entered or automatically captured?

30. If automatically captured, exactly where does it come from?

31. At what moment does the system receive it?

32. Does the user have to copy/paste anything?

33. Does the user have to fill out a form?

34. Does the user have to tell the system what is important?

35. If yes, why can't AI determine this automatically?

36. What is the minimum human input required?

37. Can that human input be removed?

If yes, explain how.

========================
4. AI RESPONSIBILITY
========================

38. What exactly does the LLM do?

39. What does the LLM NOT do?

40. Which decisions are deterministic software decisions?

41. Which decisions require AI?

42. What information is sent to the LLM?

43. What does the LLM return?

44. Is the LLM extracting information, summarizing, reasoning, classifying, generating, or doing several of these?

45. Could a normal function do any of this instead?

46. If yes, why is an LLM needed?

47. What happens if the LLM makes a mistake?

48. Can the user see what evidence caused the AI to make its decision?

========================
5. MEMORY
========================

49. What exactly counts as a memory?

50. Give 5 real examples of memories this product should store.

51. Give 5 examples of things it should NOT store.

52. Who decides whether something is worth storing?

53. Can AI decide automatically?

54. Does the user need to approve every memory?

55. If approval is required, why?

56. If approval is NOT required, why is automatic storage safe?

57. Where are memories physically stored?

58. What database or memory system stores them?

59. What is the relationship between the original input and the stored memory?

60. Can the original input be retrieved later?

61. Can a memory be updated?

62. Can a memory become outdated?

63. How does the system know which memory is newer?

64. Can contradictory memories exist?

65. If yes, how are contradictions handled?

========================
6. RETRIEVAL
========================

66. When does the system retrieve memory?

67. What causes retrieval?

68. What does the system ask the memory system?

69. What information is sent into that query?

70. What comes back?

71. How does the system decide which memories matter?

72. Does Hindsight decide this?

73. Does the LLM decide this?

74. Does normal application logic decide this?

75. What happens when no useful memory exists?

76. What happens when the retrieved memory is wrong or irrelevant?

========================
7. OUTPUT
========================

77. What is the actual output of the product?

78. Is it a summary, warning, recommendation, insight, question, notification, dashboard, or something else?

79. What does the user see on screen?

80. Give 3 realistic examples of final outputs.

81. Why is this output useful?

82. What can the user do with the output immediately?

83. Does the output help the user's next action?

84. If the output disappeared, what useful thing would the user lose?

========================
8. AUTOMATION
========================

85. Which parts happen automatically?

86. Which parts require the user?

87. Why does each human step exist?

88. Can any human step be removed?

89. If yes, remove it from the proposed architecture.

90. Is the system collecting information continuously or only when the user triggers it?

91. What should happen without the user explicitly saying "remember this"?

92. What should happen without the user manually entering information?

========================
9. FEEDBACK LOOP
========================

If this product claims to "learn", prove it.

93. What does the system know before the interaction?

94. What new information does it receive during the interaction?

95. What does it store afterward?

96. What changes because of that new information?

97. Show one complete example from beginning to end.

98. What happens in Meeting 1?

99. What gets stored?

100. What happens in Meeting 2?

101. What previous information is retrieved?

102. How does that information change the recommendation?

103. What happens after Meeting 2?

104. How does Meeting 2 improve Meeting 3?

If there is no concrete answer to these questions, do NOT claim the product has a learning loop.

========================
10. THIRD-PARTY SERVICES
========================

For every external service proposed:

105. Why is this service required?

106. What exact job does it perform?

107. Could the product work without it?

108. What information goes into it?

109. What comes back?

110. Who owns the resulting data?

111. Does introducing this service create unnecessary complexity?

112. Is this service solving a real product requirement or simply making the architecture sound sophisticated?

========================
11. DATABASE
========================

113. What data needs permanent storage?

114. Why does each piece of data need permanent storage?

115. What database is being used?

116. Why this database?

117. What are the minimum tables/entities required?

118. What does each table represent in plain English?

119. Who writes to each table?

120. Who reads from each table?

121. What causes each write?

122. What causes each read?

123. What data could simply be derived instead of stored?

124. Are we adding a database because the product needs one, or because "real apps need databases"?

========================
12. ARCHITECTURE
========================

125. Draw the complete system in the simplest possible flow.

Use:

INPUT
↓
PROCESS
↓
STORE
↓
RETRIEVE
↓
OUTPUT

126. What are the absolute minimum components required?

127. What components are optional?

128. What components are unnecessary?

129. What components are being added only for future scalability?

Remove those unless they are required now.

130. Can the entire MVP be explained in one diagram?

131. Can the entire MVP be explained in under 2 minutes?

132. If not, simplify it.

========================
13. MVP BOUNDARY
========================

133. What is the smallest version that proves the idea?

134. What must exist for the demo to work?

135. What does NOT need to exist?

136. What features are explicitly excluded from the MVP?

137. What integrations are explicitly excluded?

138. What automation is explicitly excluded?

139. What infrastructure is explicitly excluded?

140. What should NOT be built even if it sounds cool?

========================
14. HUMAN INVOLVEMENT TEST
========================

For every human interaction in the system, answer:

141. Why does the human have to do this?

142. Could the system do it automatically?

143. If the system can do it automatically, why are we making the human do it?

144. Does this step create real value?

145. Does this step exist only because the architecture is poorly designed?

========================
15. NOTEBOOK TEST
========================

Answer this honestly:

146. Could a human achieve the same result by writing everything in a notebook?

If YES:

147. What does this software automate that the notebook cannot?

148. What does AI discover that the human would otherwise have to manually identify?

149. What does the system remember across time that a normal notebook cannot practically surface?

150. What useful action does the system produce from that memory?

If there is no strong answer, stop and rethink the product.

========================
16. DEMO TEST
========================

151. Show exactly what happens during a 5-minute demo.

152. What does the user click?

153. What information enters the system?

154. What does AI do?

155. What gets stored?

156. What does the user see?

157. Then simulate the next interaction.

158. What does the system remember?

159. What new insight does it produce?

160. Why would a judge understand the value immediately?

========================
17. FINAL SIMPLICITY CHECK
========================

Before coding, provide:

Product
One sentence.

User
One sentence.

Input
One sentence.

AI
One sentence.

Memory
One sentence.

Storage
One sentence.

Retrieval
One sentence.

Output
One sentence.

Human involvement
One sentence.

Core loop
One diagram.

MVP
5-10 bullet points maximum.

Explicitly NOT building
5-10 bullet points maximum.

Then answer:

“If I removed everything except the core value, what would remain?”

That answer defines the MVP.

----------------------------------------------------------------
2. FIXED PRODUCT DECISIONS
----------------------------------------------------------------

After answering the clarity gate, freeze these product decisions unless a genuine contradiction is found.

PRODUCT:
Viora is a single-workspace agency client-memory application. It turns real client meeting transcripts into durable client-specific memory and later uses that memory to answer account questions so new team members do not repeat old mistakes.

USER:
An agency account manager or agency team member responsible for a client account.

PROBLEM:
Important client context exists across conversations and people, but is easily lost when account ownership changes.

INPUT:
A real client meeting transcript in `.txt` or `.md` format, associated with the currently selected client.

MINIMUM HUMAN INPUT:
Create/select the client once, then upload the transcript. The user never selects individual facts to remember.

AI:
Hindsight performs memory extraction during retain according to a narrowly defined client-memory mission. The application LLM answers later questions using retrieved Hindsight memories and source chunks.

MEMORY:
Durable, client-specific business knowledge such as decisions, preferences, constraints, approvals/rejections, stakeholder roles, commitments, prior attempts, reasons, and outcomes.

HINDSIGHT:
One isolated Hindsight bank per client. Use Retain for ingestion and memory creation. Use Recall for retrieval. Do not add a second memory store.

APP DATABASE:
SQLite, only for client registry and source metadata/document mapping. Never use SQLite as semantic memory.

LLM:
Use a current supported LLM provider. The hackathon allows any LLM and its official material recommends fast hosted models such as Groq. Make the provider/model configurable by environment variable. Verify the current provider SDK and model ID before implementation.

OUTPUT:
A grounded natural-language answer with a visible evidence section showing which stored memories/source chunks support the answer. If no useful memory exists, say so.

FEEDBACK LOOP:
Meeting 1 transcript creates memory. Meeting 2 transcript adds new memory. Later question retrieves both relevant past and newer facts, changing the answer when the client context has changed.

----------------------------------------------------------------
3. EXACT HINDSIGHT MEMORY POLICY
----------------------------------------------------------------

Configure Hindsight using the current supported API for a client-memory mission. Do not invent configuration names. If the current Hindsight release supports mission/custom extraction mode, use it. Otherwise use the closest documented supported mechanism.

The memory mission should communicate this intent:

“Extract durable business memory about this specific client. Prioritize explicit client preferences, likes/dislikes, decisions, approvals, rejections, constraints, goals, stakeholder roles, commitments, timelines, previous attempts, outcomes, and the reasons behind decisions when the reason is explicitly stated. Preserve temporal information and the source context. Prefer explicit statements over guesses. Ignore greetings, filler, small talk, transient scheduling chatter, generic conversation, repetitive phrasing, unrelated personal details, secrets, credentials, API keys, and information that has no likely future value for serving this client. Never invent facts.”

Store source provenance with each retained document using the current supported Hindsight fields. Prefer:

- stable document ID tied to the SQLite source record
- client-scoped bank ID
- source context such as `client-transcript`
- source timestamp/date when available
- source title/file name when supported by metadata

Do not send the entire transcript into a second custom LLM extraction pipeline before Retain. Hindsight is the memory extraction layer.

Do not retain every user question and generated answer as memory.

----------------------------------------------------------------
4. MEMORY EXAMPLES. FOR CLARITY ONLY. NEVER SEED THESE
----------------------------------------------------------------

These are examples of the TYPE of information the system should learn. They are not runtime data and must never be inserted into the app as seed data.

Should store:

1. A client explicitly says they do not want corporate-looking visuals.
2. A client approves a particular design direction.
3. A client rejects a direction and explicitly explains why.
4. A specific person is identified as the final approver for a deliverable.
5. A client changes a previously stated preference and the new preference has a date/source.

Should not store:

1. Greetings and pleasantries.
2. “How are you?” small talk.
3. Temporary meeting logistics that have no future client meaning.
4. Passwords, API keys, or secrets.
5. Unrelated personal information that has no legitimate connection to serving the client.

----------------------------------------------------------------
5. EXACT DATA OWNERSHIP AND STORAGE MODEL
----------------------------------------------------------------

SQLite entities must be minimal. Use only what the actual implementation needs.

Minimum target entities:

CLIENT
- id
- name
- hindsight_bank_id
- created_at

SOURCE
- id
- client_id
- original_filename
- content_type
- size_bytes
- meeting_date or source_date when supplied/known
- hindsight_document_id
- ingestion_status
- created_at

Do not add more tables unless a concrete requirement appears in the clarity gate.

What is stored where:

SQLite stores application metadata and the relationship between a client and a Hindsight source document.

Hindsight stores the source document and the durable memory derived from it.

The LLM does not permanently store application memory.

Browser local state may remember non-sensitive UI state such as the currently selected client, but it is not the product’s memory and must never be treated as source of truth.

----------------------------------------------------------------
6. INGESTION PIPELINE. BUILD IN THIS EXACT ORDER
----------------------------------------------------------------

PHASE A. CLIENT CREATION

1. User opens Viora.
2. Empty state is shown if no clients exist.
3. User creates a client by entering the client name.
4. Server creates a SQLite client record.
5. Server creates/ensures a unique Hindsight bank for that client using the current documented Hindsight API.
6. Server saves the stable Hindsight bank ID in SQLite.
7. User is taken to that client’s workspace.

PHASE B. TRANSCRIPT INGESTION

1. User selects the client workspace.
2. User uploads one `.txt` or `.md` transcript.
3. Server validates type, size, and non-empty content.
4. Server reads plain text.
5. Server creates a SQLite SOURCE record with status `processing`.
6. Server calls Hindsight Retain against the client’s bank.
7. Retain must include the source/document ID and the client-memory mission/configuration through the supported current API.
8. Hindsight processes the source and extracts durable memory according to its supported memory pipeline.
9. On successful completion, server marks the SOURCE record `stored`.
10. On failure, mark the SOURCE record `failed`, keep the error safe and human-readable, and do not pretend memory was stored.
11. UI shows a clear result: stored, processing, or failed.
12. Do not insert the transcript or extracted facts into SQLite as a second memory system.

PHASE C. QUESTION / RETRIEVAL

1. User selects a client.
2. User enters a natural-language question.
3. Server identifies the client’s Hindsight bank from trusted SQLite metadata. The browser must never choose an arbitrary bank ID.
4. Server calls Hindsight Recall with the user’s question.
5. Use the current documented options for retrieving source chunks/provenance when available, such as `include_chunks` or its current equivalent.
6. Hindsight performs the memory retrieval.
7. The app receives relevant memory facts and, when supported, source chunks/provenance.
8. If nothing relevant comes back, return a “no stored evidence found” result. Do not call the LLM just to hallucinate an answer.
9. If relevant evidence exists, send ONLY the user question plus the retrieved evidence to the application LLM.
10. LLM produces a grounded answer.
11. UI renders the answer and the evidence used.
12. Do NOT automatically retain the question/answer pair.

PHASE D. MEMORY EVOLUTION

1. A later transcript is uploaded for the same client.
2. That transcript is retained into the same client bank.
3. New durable facts are added.
4. Older facts are not silently destroyed.
5. On future retrieval, the system considers temporal order and explicit newer statements.
6. If a newer statement reverses an older one, the final answer should say the preference changed rather than pretending the old statement never existed.

----------------------------------------------------------------
7. LLM RESPONSIBILITY. KEEP IT SMALL
----------------------------------------------------------------

The application LLM has ONE job: generate a user-facing answer from Hindsight-retrieved evidence.

The application LLM MAY:

- summarize retrieved facts
- connect several retrieved facts
- explain the reason behind a decision when the evidence explicitly contains the reason
- identify a conflict between older and newer evidence
- state uncertainty when evidence is incomplete
- format a concise answer for the user

The application LLM MUST NOT:

- decide which raw transcript facts become long-term memory
- write directly to Hindsight
- choose another client’s memory bank
- invent missing client information
- claim that a preference exists without retrieved evidence
- silently resolve conflicting client preferences without date/source evidence
- use unrelated world knowledge to fill gaps
- retain every question/answer automatically

Deterministic application logic handles:

- client selection
- bank selection
- file validation
- SQLite writes
- Hindsight API calls
- source IDs
- error handling
- access boundaries
- status tracking
- rendering retrieved evidence

----------------------------------------------------------------
8. GROUNDING PROMPT FOR THE APPLICATION LLM
----------------------------------------------------------------

Implement a strong system prompt for the answer-generation LLM. It should communicate:

“You answer questions about a specific client account using only the memory evidence supplied by Viora. The evidence comes from Hindsight. Do not invent facts. If the evidence does not answer the question, clearly say that the stored client memory does not contain enough information. When sources conflict, identify the conflict and prefer the newest explicit statement when dates are available. Preserve the distinction between what the client explicitly said and what is merely inferred. Keep answers useful and direct. After the answer, provide concise evidence references from the supplied source metadata/chunks.”

Use a structured response format if the selected LLM provider supports reliable structured output. Keep the structure minimal. Recommended logical fields:

- answer
- evidence
- conflict_or_uncertainty (optional)

Do not add ten fields just because structured output is available.

If structured output is not reliable with the selected provider, use a robust plain-text contract and render the evidence server-side from known Hindsight result objects.

----------------------------------------------------------------
9. RETRIEVAL POLICY
----------------------------------------------------------------

Use Hindsight Recall as the normal query path.

The query must contain the user’s actual question. Do not generate a second synthetic query unless the current Hindsight integration clearly benefits from it and the change is documented in ARCHITECTURE.md.

Retrieve the smallest useful set of memories needed to answer the question.

Do not blindly dump the whole client memory bank into the LLM.

Use Hindsight’s current documented recall capabilities and result fields. Hindsight’s official documentation describes Recall as multi-strategy retrieval and may combine semantic, keyword, graph, and temporal signals. Use the official current implementation rather than recreating these retrieval mechanisms yourself.

When source chunks are available, use them for provenance and evidence display.

If there is no relevant memory:

- do not invent an answer
- do not generate generic agency advice
- return a clear “No relevant stored client memory found” state

If retrieved memories appear irrelevant:

- do not force them into the answer
- tell the user that stored memory did not contain a reliable answer

If multiple memories conflict:

- preserve both in the evidence section
- prefer the latest explicit statement when date/source order is known
- explain that the client’s preference changed when the evidence supports that conclusion

----------------------------------------------------------------
10. UI. SIMPLE, NOT A DASHBOARD
----------------------------------------------------------------

Build a minimal application with three practical areas, not a collection of decorative pages.

AREA 1. CLIENT LIST / EMPTY STATE

The first screen should show:

- product name
- short explanation of what it does
- list of actual clients
- “Create client” action

When there are no clients, show only a clear empty state. Do not show fake examples.

AREA 2. CLIENT WORKSPACE

Show:

- client name
- upload transcript action
- ingestion status of actual uploaded sources
- a simple question box
- answer area
- evidence area

Do not show an invented memory counter, invented activity graph, or invented “AI confidence” score.

AREA 3. ANSWER + EVIDENCE

The answer should be the primary visual element.

Under it, show the actual evidence returned by Hindsight in a compact way, such as:

- memory text
- source file/date when available
- expandable source chunk when available

The evidence must come from real stored data only.

The UI should make this obvious:

QUESTION → STORED CLIENT MEMORY → ANSWER

Avoid chat-app theatrics. This is a business memory tool, not a generic chatbot.

----------------------------------------------------------------
11. ERROR AND EMPTY STATES
----------------------------------------------------------------

Implement real error states for:

- missing Hindsight configuration
- missing LLM configuration
- invalid transcript type
- empty transcript
- oversized transcript
- Hindsight retain failure
- Hindsight recall failure
- LLM failure
- malformed LLM output if structured output is used
- no clients
- no sources for a client
- no relevant memory

Never display raw API keys, stack traces, internal IDs, or provider secrets to the user.

Errors should tell the user what action to take next.

----------------------------------------------------------------
12. SECURITY AND DATA HYGIENE
----------------------------------------------------------------

1. All Hindsight and LLM API calls happen server-side.
2. API keys stay in environment variables.
3. Validate file types server-side, not only in the browser.
4. Limit upload size.
5. Never log raw transcript bodies.
6. Never log Hindsight credentials or LLM keys.
7. Never place a client’s Hindsight bank ID in editable browser state where the user can freely change it.
8. The server determines the bank ID from the trusted client record.
9. Do not store secrets in Hindsight.
10. The UI must not expose unrelated clients’ evidence.

----------------------------------------------------------------
13. IMPLEMENTATION ORDER
----------------------------------------------------------------

After the clarity gate is approved/finalized, implement in this exact order.

STEP 1. Repository initialization

Create the minimal project structure.

STEP 2. Environment configuration

Create `.env.example` with clearly named placeholders for:

- Hindsight API URL
- Hindsight API key/token as required by the current SDK
- LLM provider key
- LLM model
- SQLite path if configurable

Do not include real credentials.

STEP 3. SQLite layer

Implement only the CLIENT and SOURCE entities required by the clarity gate.

STEP 4. Hindsight client wrapper

Create one small server-only module responsible for:

- ensuring/creating client banks
- retaining transcripts
- recalling memories
- retrieving source chunks/provenance when supported

Do not spread Hindsight calls throughout the UI.

STEP 5. Ingestion service

Implement one service function conceptually equivalent to:

`ingestTranscript(clientId, sourceFile)`

It must:

- validate
- create source record
- retain in Hindsight
- update source status
- return a safe result

STEP 6. Retrieval service

Implement one server function conceptually equivalent to:

`answerClientQuestion(clientId, question)`

It must:

- resolve the client bank
- recall relevant Hindsight memories
- stop cleanly if evidence is absent
- call the LLM only when useful evidence exists
- return answer + evidence

STEP 7. API/server routes

Expose only the endpoints necessary for:

- create/list client
- upload transcript
- get source status/list
- ask a question

Do not create dozens of endpoints.

STEP 8. UI

Wire the UI to those APIs.

STEP 9. Empty and failure states

Verify everything works without fake data.

STEP 10. Testing

Test the full pipeline with ephemeral test content only.

STEP 11. Documentation

Create:

- `README.md`
- `PROJECT_CLARITY.md`
- `ARCHITECTURE.md`
- `DATA_FLOW.md`
- `DEMO_RUNBOOK.md`

----------------------------------------------------------------
14. REQUIRED DATA_FLOW.md CONTENT
----------------------------------------------------------------

Explain the full flow in plain English and one ASCII diagram.

Use exactly this conceptual flow:

REAL CLIENT TRANSCRIPT FILE
        ↓
Next.js upload endpoint
        ↓
Transcript validation
        ↓
SQLite SOURCE metadata
        ↓
Hindsight Retain
        ↓
Hindsight extracts durable client memory
        ↓
Client-specific Hindsight bank
        ↓
User asks a client question
        ↓
Hindsight Recall
        ↓
Relevant memory facts + source chunks
        ↓
Application LLM
        ↓
Grounded answer + evidence
        ↓
UI

Also explain:

- what is stored in SQLite
- what is stored in Hindsight
- what is sent to Hindsight
- what is retrieved from Hindsight
- what is sent to the LLM
- what is returned by the LLM
- what is shown to the user
- what is NOT stored

----------------------------------------------------------------
15. REQUIRED ARCHITECTURE.md CONTENT
----------------------------------------------------------------

Include:

1. Component list.
2. Why each component exists.
3. What would break if that component were removed.
4. What is intentionally NOT in the architecture.
5. Exact Hindsight role.
6. Exact LLM role.
7. Exact SQLite role.
8. Request flow for ingestion.
9. Request flow for question answering.
10. Memory isolation strategy.
11. Conflict handling strategy.
12. Failure handling strategy.
13. Security boundary.

Include one simple architecture diagram.

----------------------------------------------------------------
16. REQUIRED README.md CONTENT
----------------------------------------------------------------

README must explain:

- what Viora is
- the one problem it solves
- how the pipeline works
- prerequisites
- environment variables
- how to install
- how to run locally
- how to create the first real client
- how to upload a real transcript
- how to ask a question
- how Hindsight is used
- how the LLM is used
- what data is stored where
- what the MVP does NOT do
- troubleshooting

Do not include fake sample clients or fake transcript content.

When giving command examples, use placeholders for environment secrets and generic filenames such as `YOUR_REAL_TRANSCRIPT.txt` rather than shipping an example transcript.

----------------------------------------------------------------
17. REQUIRED DEMO_RUNBOOK.md
----------------------------------------------------------------

Create a 5-minute demonstration plan using the user’s REAL transcript data.

Do not generate or include demo seed data.

The runbook should show:

1. Start with an empty Viora installation.
2. Create a real client.
3. Upload a real meeting transcript.
4. Show that Hindsight Retain has been called successfully.
5. Ask a question that requires historical client context.
6. Show the answer and evidence.
7. Upload a later real transcript for the same client.
8. Ask the same or related question again.
9. Show how the answer reflects the newly stored context.
10. Explain in one sentence why this could not be achieved reliably by a plain one-shot chatbot with no persistent memory.

The demo must make the memory behavior visible within roughly 60 seconds of the main retrieval interaction.

----------------------------------------------------------------
18. TESTING REQUIREMENTS
----------------------------------------------------------------

Write tests for the real core behavior.

Minimum test categories:

1. Client creation creates a stable Hindsight bank ID.
2. Transcript validation rejects unsupported/empty files.
3. Successful ingestion creates a source record and calls Hindsight Retain.
4. Ingestion failure marks the source as failed.
5. Question answering resolves only the selected client’s bank.
6. Relevant recall results are passed to the LLM.
7. No-memory case does not hallucinate an answer.
8. Conflicting dated memories are surfaced rather than silently merged.
9. Question/answer is not automatically retained as memory.
10. Hindsight/LLM credentials never appear in browser bundles.

Use dependency injection or small server-side interfaces around Hindsight and LLM only where it makes tests straightforward. Do not build a giant abstraction layer.

----------------------------------------------------------------
19. ACCEPTANCE TEST. THIS MUST PASS BEFORE YOU SAY “DONE”
----------------------------------------------------------------

Start with a completely empty database and no seeded Hindsight memory.

Acceptance test:

A. Create one real client.

B. Upload one real transcript.

C. Verify the app records the source and calls Hindsight Retain.

D. Ask a relevant question.

E. Verify the server calls Hindsight Recall for that client.

F. Verify the LLM receives the retrieved evidence and the user’s question, not an arbitrary unrelated memory store.

G. Verify the UI shows the grounded answer and evidence.

H. Upload a second real transcript for the same client containing newer information.

I. Ask the relevant question again.

J. Verify the newer stored information changes the answer when it legitimately changes the client context.

K. Verify a different client cannot retrieve the first client’s memory.

L. Verify the app never required the user to say “remember this.”

M. Verify the app never required the user to manually select facts to store.

N. Verify no demo/seed data exists.

O. Verify the application still starts cleanly with zero clients.

----------------------------------------------------------------
20. NO-FUCKING-AROUND IMPLEMENTATION PRINCIPLES
----------------------------------------------------------------

When you face a design choice, prefer:

- fewer components
- fewer files
- fewer dependencies
- fewer network calls
- deterministic application logic
- Hindsight for memory
- one LLM call for answer generation when needed
- server-side secrets
- explicit evidence
- simple UI

Do NOT prefer:

- additional agents
- agent supervisors
- event-driven architecture
- microservices
- separate vector search
- giant prompt chains
- autonomous background agents
- complex workflow engines
- fake analytics
- unnecessary caching
- speculative scalability
- features for hypothetical enterprise customers

If a proposed component does not have a clear answer to “what exact product requirement forces this to exist?”, remove it.

----------------------------------------------------------------
21. FINAL BUILD REPORT
----------------------------------------------------------------

After implementation, output a concise final report containing:

1. Product summary.
2. Final architecture diagram.
3. Exact INPUT → STORE → RETRIEVE → OUTPUT pipeline.
4. What Hindsight stores.
5. What Hindsight retrieves.
6. What the LLM does.
7. What SQLite stores.
8. What the UI shows.
9. Files created.
10. Commands to run.
11. Environment variables required.
12. Tests run and their results.
13. Known limitations.
14. Explicit statement that no runtime demo data was seeded.
15. One 60-second explanation of the product for a judge.

Do not say “done” unless the acceptance test passes or you clearly state exactly what is still failing.

----------------------------------------------------------------
22. FINAL PRINCIPLE
----------------------------------------------------------------

The product is NOT:

“a chatbot with memory.”

The product IS:

“a client continuity system that turns real client conversations into durable, client-specific institutional memory and uses that memory to help the next person make the right decision.”

Keep the implementation centered on that sentence.

The final system must be explainable as:

INPUT
↓
REAL CLIENT TRANSCRIPT
↓
HINDSIGHT RETAIN
↓
DURABLE CLIENT MEMORY
↓
HINDSIGHT RECALL
↓
LLM GROUNDED ANSWER
↓
ANSWER + EVIDENCE

Nothing important should be hidden behind an unnecessary architectural layer.

END OF MASTER BUILD PROMPT
