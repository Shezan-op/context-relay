# Viora Scenarios: Three Stories of Client Continuity

---

## Scenario 1: The Account Manager Leaves

### 1. What Happened
Jordan Lee served as the lead Account Director for Meridian Logistics for nine months. During the kickoff meeting on January 15, 2026, Meridian's VP of Technology, Marcus Vance, laid out strict architectural rules: all infrastructure must run on AWS Aurora PostgreSQL in `us-east-1`, and MongoDB was strictly forbidden due to enterprise compliance audit failures. In July, Jordan departed the agency to join a tech startup. Incoming Account Manager Taylor Cole inherited Meridian Logistics with zero personal knowledge of Jordan's early conversations.

### 2. What Entered Viora
The raw text transcript of the kickoff meeting: `meeting_1_kickoff_2026_01_15.txt`.

### 3. What Hindsight Retained
- **Fact 1 (`world`):** "Client requires PostgreSQL on AWS Aurora Serverless v2 in us-east-1." (Date: 2026-01-15)
- **Fact 2 (`world`):** "Client enterprise compliance team strictly rejected MongoDB due to audit requirements." (Date: 2026-01-15)
- **Fact 3 (`world`):** "Marcus Vance holds sole sign-off authority for budget alterations exceeding $10,000." (Date: 2026-01-15)
- **Source Chunks:** Verbatim conversation quotes from Marcus Vance and Jordan Lee.

### 4. What the New Person Asked
Taylor Cole asked Viora:  
*"What database technologies did the client reject or mandate for their enterprise portal?"*

### 5. What Hindsight Recalled
Hindsight executed multi-strategy recall on Meridian's isolated memory bank (`client:<uuid>`) and returned Fact 1 and Fact 2, along with the source chunk from `meeting_1_kickoff_2026_01_15.txt`.

### 6. What Evidence Came Back
- **Fact:** Client enterprise compliance team strictly rejected MongoDB due to audit requirements.
- **Date:** January 15, 2026
- **Verbatim Quote:** *"For our primary database, it must be PostgreSQL deployed on AWS Aurora Serverless v2. We had a previous vendor propose MongoDB, but our enterprise compliance team strictly rejected MongoDB due to audit requirements. PostgreSQL is non-negotiable."*

### 7. What the Final Answer Was
*"The client mandated PostgreSQL deployed on AWS Aurora Serverless v2 in the us-east-1 region. They explicitly and strictly rejected MongoDB due to enterprise compliance audit requirements."*

### 8. Why This Prevented Knowledge Loss
Taylor's engineering lead had suggested proposing MongoDB for rapid prototyping. Because Taylor queried Viora before the steering meeting, Taylor shut down the MongoDB proposal internally and presented Aurora PostgreSQL. The client saw a seamless transition with zero repeated mistakes.

---

## Scenario 2: The Client Changes Their Mind

### 1. What Happened
During the January kickoff, Meridian established an aggressive portal launch deadline: May 15, 2026. Two months later, during the March 20 midpoint review, Product Director Elena Rostova announced that executive compliance audit windows had shifted, officially moving the launch deadline to June 30, 2026 to allow six additional weeks for end-to-end load testing. When a new project manager joined the team in April, agency files contained contradictory notes: older briefs referenced May 15, while newer email threads mentioned June.

### 2. What Entered Viora
Two meeting transcripts:
1. `meeting_1_kickoff_2026_01_15.txt`
2. `meeting_2_midpoint_review_2026_03_20.txt`

### 3. What Hindsight Retained
- **January Memory:** "Beta portal launch scheduled for May 15, 2026." (Date: 2026-01-15)
- **March Memory:** "Official portal launch date moved from May 15, 2026 to June 30, 2026 to provide six additional weeks for end-to-end load testing." (Date: 2026-03-20)
- Both memories coexist in the client's bank, preserving their chronological anchors.

### 4. What the New Person Asked
The new project manager asked:  
*"What is the client's launch deadline, and has it changed?"*

### 5. What Hindsight Recalled
Hindsight recalled both the January 15 commitment and the March 20 schedule update, linking them to their respective document sources.

### 6. What Evidence Came Back
- **Evidence 1 (Jan 15, 2026):** Elena Rostova: *"We have committed to our executive board that the beta portal will launch on May 15, 2026."*
- **Evidence 2 (Mar 20, 2026):** Elena Rostova: *"Consequently, our official portal launch date has been moved from May 15, 2026 to June 30, 2026. This gives us six additional weeks for end-to-end load testing."*

### 7. What the Final Answer Was
*"The portal launch was originally scheduled for May 15, 2026 during the January 15 kickoff. On March 20, 2026, the client officially updated the launch deadline to June 30, 2026 to accommodate a shifted audit window and provide six additional weeks for load testing."*

### 8. Why This Prevented Knowledge Loss
Instead of forcing the design and engineering teams into an emergency, unneeded sprint crunch to hit an obsolete May 15 deadline, the new project manager scheduled development milestones accurately against the client's true June 30 date.

---

## Scenario 3: The New Person Makes a Decision

### 1. What Happened
A new creative director and account manager needed to invoice $4,200 for an unanticipated set of custom micro-interaction icons and UI illustrations. In the agency's initial kickoff, VP of Technology Marcus Vance stated that he held sole budget authority. However, in the March review, Marcus delegated sprint design adjustments up to $5,000 directly to Product Director Elena Rostova to prevent project bottlenecks. Without this context, the new account manager was about to send the invoice and approval request directly to the VP, who was traveling overseas.

### 2. What Entered Viora
Two meeting transcripts:
1. `meeting_1_kickoff_2026_01_15.txt`
2. `meeting_2_midpoint_review_2026_03_20.txt`

### 3. What Hindsight Retained
- **Fact 1 (Kickoff):** "Marcus Vance holds sole sign-off authority for budget alterations exceeding $10,000." (Date: 2026-01-15)
- **Fact 2 (Midpoint):** "Elena Rostova is delegated budget sign-off authority for design assets and minor feature scope adjustments up to $5,000; Marcus Vance retains approval for amounts exceeding $5,000." (Date: 2026-03-20)

### 4. What the New Person Asked
The new account manager asked:  
*"Who has sign-off authority for approving a $4,200 design asset invoice?"*

### 5. What Hindsight Recalled
Hindsight recalled the March 20 governance delegation fact along with Marcus Vance's original January threshold.

### 6. What Evidence Came Back
- **Fact:** Elena Rostova is delegated budget sign-off authority for design assets and minor feature scope adjustments up to $5,000.
- **Date:** March 20, 2026
- **Verbatim Quote:** *"To eliminate bottlenecks, Elena Rostova is now officially delegated budget sign-off authority for design assets and minor feature scope adjustments up to $5,000. Anything above $5,000 still requires my explicit approval."*

### 7. What the Final Answer Was
*"Elena Rostova has the authority to approve this invoice. On March 20, 2026, Marcus Vance officially delegated sign-off authority for design assets and minor scope adjustments up to $5,000 to Elena Rostova. Anything exceeding $5,000 still requires Marcus Vance's approval."*

### 8. Why This Prevented Knowledge Loss
Instead of waiting three weeks for Marcus to return from international travel or irritating him with an invoice he had already delegated, the account manager routed the request directly to Elena. Elena signed off that afternoon, and the creative sprint proceeded without interruption.
