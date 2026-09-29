# ContextRelay Walkthrough Video Script

**Target Duration:** 3 to 4 minutes  
**Format:** Screen recording with voiceover commentary  
**Tone:** Editorial, measured, technical, authoritative. Zero generic AI hype. No background music swells.

---

## [0:00 - 0:25] Cold Open: The Human Problem

**Visual:**  
Camera focuses on an agency workspace browser or empty terminal. No flashy intro slides. The ContextRelay interface opens with a dark, near-black, minimalist canvas.

**Voiceover:**  
"An account manager leaves an agency after two years with a client.

The contracts remain.

The slide decks remain.

The recordings and transcripts remain in the shared drive.

But the context doesn't.

The new person takes over the account. They don't know what was tried six months ago. They don't know what the client hates. They don't know who actually approves budgets. Within two weeks, they repeat an old mistake or propose something the client already rejected.

ContextRelay exists to prevent that knowledge loss."

---

## [0:25 - 0:55] Step 1: Starting Empty & Provisioning Isolated Memory

**Visual:**  
Mouse cursor hovers over the clean ContextRelay interface. The left sidebar shows zero client accounts. The main workspace displays: "Prevent Agency-Client Knowledge Loss."

**Voiceover:**  
"ContextRelay starts completely clean. There is no fake seed data, no synthetic chats, and no preloaded metrics.

Let's create a client: Meridian Logistics.

When I click 'Create Client', the server creates a local record in SQLite and provisions a dedicated, isolated memory bank in Hindsight, keyed by a stable identifier: `client:<uuid>`.

Every client account in ContextRelay has strict bank isolation. Memory from Meridian Logistics can never leak into another client's bank."

---

## [0:55 - 1:40] Step 2: Ingestion Without Manual Memory Management

**Visual:**  
Presenter navigates to the Meridian Logistics workspace. Clicks the upload dropzone and selects `meeting_1_kickoff_2026_01_15.txt`. The table shows status `processing` for 1-2 seconds, then transitions cleanly to `stored`.

**Voiceover:**  
"Here is the January kickoff meeting transcript between Account Director Jordan Lee and Meridian's executives.

Notice what the account manager does NOT have to do. They don't have to manually highlight text. They don't have to tag keywords. They don't have to type 'remember this.'

They upload the raw conversation transcript.

Behind the scenes, ContextRelay passes the text to Hindsight Retain. Operating under a strict client-memory mission, Hindsight discards the conversational filler, greetings, and pleasantries. It extracts durable facts: client preferences, architectural mandates, explicit rejections, and stakeholder authorities.

The transcript is now stored as permanent institutional memory."

---

## [1:40 - 2:25] Step 3: The Handover & The Query

**Visual:**  
Presenter pauses. A subtle transition indicator appears or cursor moves to the query input.

**Voiceover:**  
"Now, fast forward six months. Jordan Lee has departed the agency.

A new account manager, Taylor Cole, takes over Meridian Logistics. Taylor has a client review meeting in thirty minutes. Instead of reading forty pages of unindexed transcripts, Taylor asks ContextRelay:

*'What database technologies did the client reject or mandate?'*

Let's watch what happens when I hit 'Recall.'"

---

## [2:25 - 3:05] Step 4: Multi-Strategy Recall & Verifiable Evidence

**Visual:**  
The query processes. The Grounded Client Memory Answer renders cleanly, followed by the expanded Evidence Drawer showing individual fact cards with timestamps, entities, and verbatim source chunks.

**Voiceover:**  
"ContextRelay does not guess.

First, it queries Hindsight Recall targeting only Meridian's bank. Hindsight uses multi-strategy retrieval—vector similarity, BM25 keyword matching, entity graph traversal, and temporal markers—to retrieve the exact facts.

Next, the Application LLM evaluates the evidence under a strict grounding prompt. It explains:

'The client mandated PostgreSQL on AWS Aurora Serverless v2 in us-east-1 and strictly rejected MongoDB due to enterprise compliance audit requirements.'

Look beneath the answer. Every statement is grounded in verifiable evidence. We see the fact type, the date (January 15, 2026), and the exact quote from Marcus Vance:

*'Our enterprise compliance team strictly rejected MongoDB due to audit requirements. PostgreSQL is non-negotiable.'*

Taylor now knows never to propose MongoDB."

---

## [3:05 - 3:45] Step 5: Handling Changing Decisions Over Time

**Visual:**  
Presenter uploads `meeting_2_midpoint_review_2026_03_20.txt`. The status updates to `stored`. The presenter submits the query: *"What deadlines or milestones changed over time?"*

**Voiceover:**  
"Client decisions don't stay static. In March, Meridian had a midpoint review where their launch date shifted.

We upload the second transcript. Hindsight retains the new information alongside the historical record—without overwriting or erasing the past.

Now Taylor asks: *'What deadlines or milestones changed over time?'*

ContextRelay recalls both the January 15 commitment and the March 20 update. The grounded answer explains:

'The portal launch was initially scheduled for May 15, 2026. On March 20, 2026, the client officially moved the launch date to June 30, 2026 to allow six additional weeks for end-to-end load testing.'

Both dates appear in the evidence drawer with their respective source meetings."

---

## [3:45 - 4:10] Conclusion: Client Continuity

**Visual:**  
The presenter navigates back to the main workspace, showing the client heading, the bank ID, and the clean institutional record.

**Voiceover:**  
"Without ContextRelay, Taylor would have walked into the meeting unaware of the MongoDB rejection, uncertain about the June launch date, and confused about who approves creative invoices.

With ContextRelay, the relationship continues where the previous account manager left off.

ContextRelay turns client conversations into durable institutional memory. The person may leave. The context stays."
