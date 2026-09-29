# I Built “Don’t Repeat This” With Hindsight

The hardest part of changing an account manager isn't handing over the client list. It's handing over the things nobody thought were important enough to write down.

A client may have rejected an approach six months ago, changed an approval process three times, or quietly established a preference during a meeting. Those facts rarely live in one clean database row. They live in conversations. I built Viora around a simple idea: retain that history in durable memory, then make the memory useful at the exact point where someone is about to make another decision.

The feature I kept coming back to was deliberately named “Don't Repeat This.”

It answers a very practical question: **what has this client already rejected, disliked, tried unsuccessfully, or ruled out?**

That sounds like a search problem. It isn't quite. Search can find old text. What I needed was a memory layer that could preserve client-specific context over time, retrieve the relevant evidence, and let the application reason over that evidence without pretending it knew more than it did.

That is where [Hindsight's agent memory system on GitHub](https://github.com/vectorize-io/hindsight) became central to the architecture.

## What Viora actually does

Viora is a Next.js application backed by SQLite for application records and Hindsight for durable client memory. Each client has a corresponding Hindsight memory bank.

The important distinction is that I don't use Hindsight as my primary application database.

SQLite knows things such as:

* which clients exist
* source files and their metadata
* filenames
* ingestion status
* document IDs
* the relationship between an uploaded source and a client

Hindsight stores the durable knowledge extracted from client conversations.

The flow looks roughly like this:

```text
Transcript
    |
    v
Validate + register source in SQLite
    |
    v
Retain transcript in Hindsight
    |
    v
Client-specific memory bank
    |
    +----------------------+
    |          |           |
    v          v           v
Don't Repeat  Timeline   Handoff
    |          |           |
    +----------+-----------+
               |
               v
        Grounded LLM output
```

The application exposes separate retrieval paths for rejected approaches, decision history, and account handoffs. They share durable memory, but each asks a different question.

## The interesting part is what happens before the LLM

My first instinct with a system like this would be to retrieve some memories, concatenate them, and ask an LLM to summarize them.

I deliberately didn't stop there.

For “Don't Repeat This,” the application asks Hindsight a targeted question:

```ts
const query =
  'What ideas, approaches, technologies, or proposals were rejected, disliked, failed, or ruled out? What should not be repeated?';

const recallPayload = await hindsight.recallMemories(
  client.hindsight_bank_id,
  query
);
```

The query gives Hindsight semantic context about what I am trying to retrieve. But recall results are not automatically accepted as final product output.

I apply another layer of application-level filtering:

```ts
const rejectionRegex =
  /\b(reject|rejects|rejected|rejection|dislike|dislikes|disliked|avoid|avoids|avoided|failed|fails|failure|unsuccessful|do not use|does not use|must not|cannot use|ruled out|stopped using|no longer use|discarded)\b/i;

const rawRejections = recallPayload.results.filter(
  (ev) => rejectionRegex.test(ev.text)
);
```

This is intentionally boring code.

I like boring code here.

Hindsight is responsible for recalling relevant memories. The application still needs deterministic rules for what qualifies as a rejection in this particular feature. That makes the behavior inspectable and prevents a broad retrieved chunk from becoming a rejection simply because another sentence in the same chunk happened to contain rejection language.

That last detail is important enough that I left a comment in the implementation:

```ts
// Filter strictly on fact text to avoid chunk cross-pollution
```

A memory system can retrieve useful context without necessarily returning exactly the structured fact my UI needs. The application has to bridge that gap.

## I also had to deal with the fact that decisions change

A historical rejection isn't necessarily a permanent rejection.

Suppose a client rejects a technology in March and then approves it in July. A naive “don't repeat this” feature could surface the March decision forever.

That is worse than having no memory.

So the retrieval layer looks for later approval evidence and compares it against the original rejection. When the later evidence appears to concern the same concept, the earlier item can be marked as superseded rather than treated as current.

The output therefore carries state:

```ts
let status: RejectionStatus = 'active_rejection';
let currentStatusNote: string | null = null;

if (date) {
  for (const app of approvals) {
    const appDate = app.occurredStart || app.mentionedAt;

    if (appDate && new Date(appDate).getTime() > new Date(date).getTime()) {
      // compare the earlier rejection with the later approval
      // ...
      status = 'superseded_rejection';
      currentStatusNote =
        `Superseded: Position later altered on ${appDate.split('T')[0]}`;
      break;
    }
  }
}
```

This isn't a general-purpose temporal reasoning engine. It is deliberately narrower.

The useful design principle is that I don't ask the LLM to silently decide whether an old fact is still true. I preserve the evidence and make the state transition visible in the application model.

The same idea appears in the decision timeline. Decisions are retrieved, normalized, deduplicated, sorted chronologically, and then compared for possible changes.

That gives me something much more useful than a list of search results: a history in which a reader can distinguish an old decision from a later one.

## Hindsight is the memory layer, not the entire application

One design decision I would keep even in a larger production deployment is the separation between application state and memory.

When a transcript arrives, Viora first validates the client and source:

```ts
const sourceId = randomUUID();
const hindsightDocId = `doc:${sourceId}`;

const sourceRecord: SourceRecord = {
  id: sourceId,
  client_id: clientId,
  original_filename: filename,
  content_type: fileInput.contentType || 'text/plain',
  size_bytes: fileInput.sizeBytes,
  meeting_date: fileInput.meetingDate || null,
  hindsight_document_id: hindsightDocId,
  ingestion_status: 'processing',
  error_message: null,
  created_at: new Date().toISOString(),
};

createSourceRecord(sourceRecord);
```

Only after that does the application ensure the client's Hindsight bank exists and retain the transcript.

If retention succeeds, SQLite records the source as stored. If it fails, the source is marked failed and a readable error is preserved.

That gives me two useful properties: Hindsight can own memory without becoming the source of truth for application bookkeeping, and I can trace recalled memory back to the original document through the Hindsight document ID. That makes evidence much easier to inspect.

## I don't call the LLM when there is no evidence

This is one of the smallest decisions in the code, but it is one of the most important.

For a normal client question, the retrieval path does this:

```ts
const recallPayload = await hindsight.recallMemories(
  client.hindsight_bank_id,
  question
);

if (!recallPayload.results || recallPayload.results.length === 0) {
  return {
    answer: 'No relevant stored client memory found regarding your question.',
    hasEvidence: false,
    evidence: [],
    clientName: client.name,
  };
}
```

Only after evidence exists does the application call the grounded answer generator.

That creates a hard boundary between “the memory system found something” and “the language model generated an answer.”

I prefer that to giving the model an empty context and hoping it behaves conservatively.

It also gives the UI something concrete to communicate: there is either stored evidence for the question or there isn't.

The same principle applies to the handoff flow. It recalls continuity information—preferences, decisions, approvals, rejections, constraints, stakeholder authority, previous attempts, and timeline changes—before invoking the LLM. It then derives the structured “Don't Repeat This” and timeline data from the same memory model, so the handoff isn't just a blob of generated prose.

## What this looks like in practice

Imagine a client has said during previous conversations that a particular campaign approach failed, that a specific visual direction should not be used, and that final creative approval belongs to one stakeholder.

Months later, a new account manager opens the client record.

Instead of asking another person:

> “Did they ever say anything about this?”

they can ask the system directly.

For a question about a general client preference, Viora recalls relevant memories and passes the evidence to the grounded answer generator.

For “Don't Repeat This,” the system narrows the recall results to explicit rejection or failure language, extracts a reason when the source contains one, records the date and source, and checks whether later evidence appears to supersede the rejection.

For a handoff, the same client memory becomes the basis for a structured account brief.

The important part isn't that the LLM can summarize a transcript. Modern language models are already good at that.

The useful behavior comes from being able to ask a question months later and still have the relevant client history available, isolated to the correct client, with enough provenance to understand where the answer came from.

That is the distinction I find useful when thinking about [what agent memory actually means](https://vectorize.io/what-is-agent-memory).

## Why I chose Hindsight for this layer

I could have built a conventional retrieval pipeline around embeddings, a vector database, and application-managed metadata.

That would solve part of the problem.

The problem I was actually trying to solve was broader than nearest-neighbor search. Client relationships accumulate facts, preferences, decisions, failures, changes, and context over time. I wanted a memory system that could handle that history while letting my application ask semantic questions instead of maintaining a growing collection of hand-written SQL queries.

Hindsight gives me that memory boundary.

The application still owns the workflow logic. It decides what constitutes a rejection, how to identify a superseding decision, when to call an LLM, how evidence is displayed, and how source records are tracked.

Hindsight owns the durable recall problem.

The separation is useful because it lets me be opinionated where the product behavior needs to be deterministic without rebuilding the entire memory system myself.

The [Hindsight documentation](https://hindsight.vectorize.io/) is also a useful reference point for understanding the underlying retain/recall model rather than treating memory as a mysterious prompt feature.

## What I learned building it

### 1. Memory retrieval and application semantics are different problems

A memory system can retrieve the right neighborhood of information without knowing exactly how my application should interpret it.

I don't expect Hindsight to know that “rejected,” “failed,” and “ruled out” should become a particular UI object called a rejection.

I encode that application meaning explicitly.

### 2. Provenance matters as much as recall

A generated answer without a traceable source is difficult to trust in a client workflow.

Keeping a Hindsight document ID alongside the SQLite source record gives me a practical bridge from recalled evidence back to the original transcript.

That makes debugging and human verification much easier.

### 3. Historical truth is not the same as current truth

A memory being old doesn't make it useless. But an old decision shouldn't automatically be presented as the current decision.

The timeline and supersession logic exist because client knowledge changes.

This is one of the reasons I prefer showing evidence and dates rather than pretending the memory layer produces an eternal set of facts.

### 4. Empty retrieval should be a first-class state

“No relevant memory found” is a valid result.

It shouldn't automatically become a prompt for the LLM to fill in the gap.

I found it cleaner to make absence explicit and keep generation downstream of successful retrieval.

### 5. Durable memory changes what an assistant can be responsible for

Without durable memory, an assistant is mostly helping with the current interaction.

With durable, client-specific memory, the assistant can participate in continuity.

That doesn't mean it should make decisions on behalf of an account team. It means it can surface the history that a person would otherwise have to reconstruct manually.

That is the part of the system I find most valuable.

I started with a simple question: **what if the next account manager could ask what not to repeat and get an answer grounded in everything the client had already told us?**

The implementation turned out to be less about generating a clever answer and more about building the memory path underneath it: retain the right information, recall it by client, filter it carefully, preserve provenance, detect changes, and only then generate language.

That is why “Don't Repeat This” became the feature I kept coming back to. The interesting part isn't the sentence the model writes.

It's the fact that the system remembers why that sentence matters.
