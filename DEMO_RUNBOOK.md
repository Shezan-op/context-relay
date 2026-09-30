# Viora Demo Runbook (5-Minute Live Walkthrough)

This runbook guides an evaluator through a live 5-minute demonstration of Viora using **real** meeting transcripts.

> **CRITICAL RULE:**
> No demo data, fake clients, or seeded memories are included. The application starts 100% empty. You provide your own real `.txt` or `.md` transcript files during this demonstration.

---

## Prerequisites Before Demo

1. Viora application running locally at `http://localhost:3000`.
2. Hindsight API service running and accessible via `HINDSIGHT_API_URL` (e.g., `http://localhost:8888`).
3. Application LLM API key configured in `.env.local` (Groq, OpenAI, Anthropic, or Gemini).
4. Have two real meeting transcripts ready on your machine:
   - `transcripts/meeting_1_kickoff_2026_01_15.txt` (Kickoff meeting with architectural mandates, rejections, and sign-offs).
   - `transcripts/meeting_2_midpoint_review_2026_03_20.txt` (Midpoint review where timelines and approval delegations shift).

---

## Step-by-Step 5-Minute Demonstration Plan

### Step 1: Start with an Empty Installation (0:00 - 0:30)
1. Open your browser and navigate to `http://localhost:3000`.
2. Notice the clean, minimalist interface:
   - There are **zero** pre-loaded clients.
   - There are **zero** fake metrics, fake chats, or seeded memories.
   - The UI displays an empty state explaining the product truth: *"Prevent Agency-Client Knowledge Loss: When an account manager leaves, years of context walk out with them: what the client hates, what was tried, who approves what. The new person repeats old mistakes."*

### Step 2: Create a Real Client (0:30 - 1:00)
1. Click the **"New Client"** button.
2. Enter the actual name of your client (e.g., `Meridian Logistics`).
3. Click **"Create Client"**.
4. The server automatically:
   - Generates a persistent record in SQLite.
   - Provisions an isolated Hindsight memory bank (`client:<uuid>`).
   - Configures the client-memory mission on that bank.
   - Immediately redirects you to the client's dedicated workspace.

### Step 3: Upload First Real Meeting Transcript (1:00 - 1:45)
1. In the client workspace, locate the **"Client Conversations & Transcripts"** area.
2. Select `transcripts/meeting_1_kickoff_2026_01_15.txt` and upload it.
3. Watch the upload status table:
   - The file appears with status `processing`.
   - Viora validates the file, extracts the text, and calls Hindsight Retain.
   - Hindsight's extraction pipeline chunks the conversation, extracts structured facts, resolves entities, and links them to temporal markers.
   - Within seconds, the status transitions to **`stored`**.

### Step 4: Verify Memory Extraction Without Manual Management (1:45 - 2:00)
1. Note the confirmation that the transcript was retained into the client's isolated Hindsight bank without the user having to manually highlight or tag any facts.
2. Emphasize that the user did **not** have to say *"remember this"*; durable business facts were extracted automatically according to the client-memory mission.

### Step 5: The Account Manager Handover & The Query (2:00 - 2:45)
1. Simulate the handover: Account Director Jordan departs; incoming Account Manager Taylor takes over.
2. In the **"Query Client Institutional Memory"** box, type a continuity question:
   - Example: *"What database technologies did the client reject or mandate?"*
3. Click **"Recall"** (or press Enter).
4. Viora triggers Hindsight Recall against the client's isolated bank, retrieves ranked facts and source chunks, passes them to the Application LLM, and displays the result.

### Step 6: Inspect Grounded Answer & Verifiable Evidence (2:45 - 3:30)
1. View the **Answer**:
   - The answer directly and concisely answers the question using only facts from Meeting 1: *"The client mandated PostgreSQL deployed on AWS Aurora Serverless v2 in us-east-1 and strictly rejected MongoDB due to enterprise compliance audit requirements."*
2. Inspect the **Evidence Drawer** beneath the answer:
   - Each supporting fact is listed with its extraction type (`world`, `experience`, `observation`).
   - The recorded timestamp and source filename are displayed.
   - Expand the source chunk snippet to verify that the fact matches the exact conversation excerpt from Marcus Vance.

### Step 7: Upload Later Real Transcript with Updated Context (3:30 - 4:00)
1. In the same client workspace, click the dropzone and select `transcripts/meeting_2_midpoint_review_2026_03_20.txt` (which contains an updated launch date and delegated approval authority).
2. The server calls Hindsight Retain into the **same** client bank.
3. Once the status shows **`stored`**, new memories have been layered into the existing bank alongside historical ones. Old history is not overwritten or destroyed.

### Step 8: Ask About Changing Decisions Over Time (4:00 - 4:45)
1. Enter a question regarding timeline changes:
   - Example: *"What deadlines or milestones changed over time?"*
2. Click **"Recall"**.
3. Observe how the answer reflects the chronological evolution:
   - The LLM receives memories from **both** meetings.
   - It identifies the temporal shift: it notes the initial May 15, 2026 target from January, and explains that the client officially moved the launch to June 30, 2026 on March 20 for extended load testing.
   - The Evidence Drawer displays supporting memories from both transcripts with their respective dates.

### Step 9: Verify Client Memory Isolation (4:45 - 5:00)
1. Return to the Client List and click **"+ New Client"** to create a second client (e.g., `Beta Dynamics`).
2. Open Beta Dynamics's workspace (which has no transcripts yet) and ask the same database question.
3. Observe that Viora immediately reports:
   - *"No relevant stored client memory found regarding your question."*
4. Confirm that Client B cannot access or leak memories from Meridian Logistics.

### Step 10: 60-Second Closing Pitch
> *"Viora prevents agency-client knowledge loss. When an account manager leaves, years of client context walk out with them: what the client hates, what was tried, who approves what. Viora turns client conversations into durable, client-isolated institutional memory using Hindsight, so incoming team members can continue the relationship where the previous person stopped."*
