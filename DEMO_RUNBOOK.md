# ContextRelay Demo Runbook (5-Minute Live Walkthrough)

This runbook guides a presenter or evaluator through a live 5-minute demonstration of ContextRelay using **real** meeting transcripts.

> **CRITICAL RULE:**
> No demo data, fake clients, or seeded memories are included. The application starts 100% empty. You will provide your own real `.txt` or `.md` transcript files during this demonstration.

---

## Prerequisites Before Demo

1. ContextRelay application running locally at `http://localhost:3000`.
2. Hindsight API service running and accessible via `HINDSIGHT_API_URL`.
3. Application LLM API key configured in `.env` (Groq, OpenAI, Anthropic, or Gemini).
4. Have two real meeting transcripts ready on your machine:
   - `TRANSCRIPT_1.txt` (An earlier client meeting with initial preferences, constraints, or decisions).
   - `TRANSCRIPT_2.txt` (A later client meeting where a timeline, preference, or decision is updated or changed).

---

## Step-by-Step 5-Minute Demonstration Plan

### Step 1: Start with an Empty Installation (0:00 - 0:30)
1. Open your browser and navigate to `http://localhost:3000`.
2. Notice the clean, minimalist interface:
   - There are **zero** pre-loaded clients.
   - There are **zero** fake metrics, fake chats, or seeded memories.
   - The UI displays an empty state: *"No clients found. Create your first client account to get started."*

### Step 2: Create a Real Client (0:30 - 1:00)
1. Click the **"New Client"** button.
2. Enter the actual name of your client (e.g., `Acme Innovations`).
3. Click **"Create Client"**.
4. The server automatically:
   - Generates a persistent record in SQLite.
   - Provisions an isolated Hindsight memory bank (`client:<uuid>`).
   - Configures the client-memory mission on that bank.
   - Immediately redirects you to the client's dedicated workspace.

### Step 3: Upload First Real Meeting Transcript (1:00 - 1:45)
1. In the client workspace, locate the **"Upload Meeting Transcript"** area.
2. Select your `TRANSCRIPT_1.txt` file and click **"Upload"**.
3. Watch the upload status table:
   - The file appears with status `processing`.
   - ContextRelay validates the file, extracts the text, and calls Hindsight Retain.
   - Hindsight's extraction pipeline chunks the conversation, extracts structured facts, resolves entities, and links them to temporal markers.
   - Within seconds, the status transitions to **`stored`**.

### Step 4: Verify Memory Extraction (1:45 - 2:00)
1. Note the confirmation that the transcript was retained into the client's isolated Hindsight bank without the user having to manually highlight or tag any facts.
2. Emphasize that the user did **not** have to say *"remember this"*; durable business facts were extracted automatically.

### Step 5: Ask a Historical Context Question (2:00 - 2:45)
1. In the **"Query Client Memory"** box, type a question that requires knowledge from Meeting 1:
   - Example: *"What design preferences and visual constraints did the client establish?"*
2. Click **"Ask"** (or press Enter).
3. ContextRelay triggers Hindsight Recall against the client's isolated bank, retrieves ranked facts and source chunks, passes them to the Application LLM, and displays the result.

### Step 6: Inspect Grounded Answer & Verifiable Evidence (2:45 - 3:30)
1. View the **Answer**:
   - The answer directly and concisely answers the question using only facts from `TRANSCRIPT_1.txt`.
2. Inspect the **Evidence Drawer** beneath the answer:
   - Each supporting fact is listed with its extraction type (`world`, `experience`, `observation`).
   - The recorded timestamp and source filename (`TRANSCRIPT_1.txt`) are displayed.
   - Expand the source chunk snippet to verify that the fact matches the exact conversation excerpt.

### Step 7: Upload Later Real Transcript with Updated Context (3:30 - 4:00)
1. In the same client workspace, click **"Upload"** and select `TRANSCRIPT_2.txt` (which contains an updated decision or changed constraint).
2. The server calls Hindsight Retain into the **same** client bank.
3. Once the status shows **`stored`**, new memories have been layered into the existing bank alongside the historical ones. Old history is not overwritten or destroyed.

### Step 8: Ask the Same Question Again (4:00 - 4:45)
1. Re-enter the same question (or a related question):
   - Example: *"What is the client's current requirement for the design palette and deliverables timeline?"*
2. Click **"Ask"**.
3. Observe how the new answer changes:
   - The LLM receives memories from **both** meetings.
   - It identifies the temporal shift: it states the updated requirement from Meeting 2 while noting what had been previously decided in Meeting 1.
   - The Evidence Drawer displays supporting memories from both `TRANSCRIPT_1.txt` and `TRANSCRIPT_2.txt` with their respective dates.

### Step 9: Verify Client Memory Isolation (4:45 - 5:00)
1. Return to the Client List and create a second client (e.g., `Beta Dynamics`).
2. Open Beta Dynamics's workspace (which has no transcripts yet) and ask the same question.
3. Observe that ContextRelay immediately reports:
   - *"No relevant stored client memory found."*
4. Confirm that Client B cannot access or leak memories from Client A.

### Step 10: 60-Second Closing Pitch for Judges
> *"ContextRelay solves agency institutional amnesia: unlike a stateless chatbot that forgets everything once the chat closes, ContextRelay turns real client meetings into an evolving, durable knowledge graph in Hindsight—so whenever an account manager changes, the next person has instant, evidence-grounded recall of every client decision."*
