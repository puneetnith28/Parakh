# Parakh Product Demonstration Video Script & Walkthrough

> **Title:** Parakh: Prove Your Skills. Back Every Claim.  
> **Target Video Duration:** 2 minutes 45 seconds (165 seconds)  
> **Target Audience:** Hackathon Judges, Freelance Software Engineers, Engineering Managers, Agency Leads  
> **Format:** Screen capture with voiceover narrative  

---

## Storyboard & Script Breakdown

### Segment 1: The Problem & The Value Proposition (0:00 – 0:30)
- **Visual:** Split screen / graphic contrasting two worlds:
  - Left: Generic Upwork/LinkedIn proposals with empty buzzwords ("expert in React and cloud architecture").
  - Right: A client overwhelmed by 80 identical, unverified AI-generated bids.
- **Voiceover:**
  > "Every day, talented freelance developers lose high-stakes contracts to generic proposals stuffed with buzzwords. Meanwhile, clients and engineering managers waste hours interviewing candidates who cannot back up the skills on their resumes.
  > 
  > This is **Parakh** — Hindi for *rigorous test* or *scrutiny*. Parakh is an open-source, evidence-grounded capability assessment platform that proves your technical skills by backing every claim with verified code from your public GitHub projects."

---

### Segment 2: Opportunity Ingestion & Editable Requirements (0:30 – 1:00)
- **Visual:** Browser view of the Parakh dashboard at `localhost:5173` or staging URL. User clicks the newly added **"Load Sample Demo"** button. The brief text box populates with the Billing Microservice RFP, and the GitHub repository field populates.
- **Action:** User clicks "Analyze Capability". The app extracts 6 structured requirements: Frontend, JWT Auth, Database layer, Rate Limiting, Automated Testing, and Containerization.
- **Voiceover:**
  > "Let's see it in action. You start with an actual client brief or RFP document — pasted text or PDF upload. With our one-click demo loader, we ingest an enterprise SaaS billing specification.
  > 
  > Powered by Google Gemma 2, Parakh extracts discrete, testable technical requirements into a structured JSON schema. Crucially, the developer remains in the driver's seat: you can edit categories, adjust priorities, or add custom criteria before touching a line of code."

---

### Segment 3: Secure Repository Ingestion & Commit Pinning (1:00 – 1:35)
- **Visual:** User confirms the requirements and provides the GitHub repository URL. Visual representation of the security pipeline: SSRF validation passes, binary files are filtered out, vendored dependencies are stripped, and the immutable 40-character commit SHA is resolved.
- **Voiceover:**
  > "Next, you provide your GitHub project. Parakh applies strict security safeguards: cloud metadata SSRF vectors and internal IPs are rejected instantly. 
  > 
  > It scans the repository tree, filters out third-party vendor libraries, minified bundles, and secrets, and pins the exact 40-character commit SHA. Your evidence is locked to an immutable cryptographic snapshot."

---

### Segment 4: The Interactive Evidence Map & Deterministic Citations (1:35 – 2:15)
- **Visual:** The dashboard renders the **Evidence Map**. The 6 requirements are color-coded:
  - 4 **Demonstrated** (Emerald badges)
  - 1 **Partially demonstrated** (Amber badge)
  - 1 **Not demonstrated in supplied evidence** (Slate badge)
- **Action:** User clicks on the citation for JWT authentication (`auth/jwt.ts:L42-L68`). A side drawer opens showing the exact snippet with line numbers and a direct GitHub permalink button.
- **Voiceover:**
  > "Here is the core breakthrough: the **Interactive Evidence Map**. 
  > 
  > Unlike conversational LLMs that hallucinate capabilities, Parakh enforces a strict deterministic citation validator. Look at requirement FR-02 for JWT Authentication: it is marked **Demonstrated**, backed by a verified citation in `auth/jwt.ts`, lines 42 through 68. 
  > 
  > Clicking the proof takes you straight to the exact commit permalink on GitHub. If code exists without unit tests, Parakh conservatively caps it at **Partially demonstrated**. If evidence is missing, it is labeled **Not demonstrated in supplied evidence** — an honest statement that the skill was not in this specific repo."

---

### Segment 5: Gap Action Plan & Proposal Generation (2:15 – 2:40)
- **Visual:** Scroll down to the **Gap Resolution Checklist** and **Draft Proposal Kit**.
- **Voiceover:**
  > "Parakh doesn't just evaluate — it prepares you to win the contract. Unmet requirements automatically generate clarifying questions to ask the client and actionable sprint steps.
  > 
  > It drafts a customized proposal where every technical claim is hyperlinked to verified lines of code in your repository. You stand out immediately as the only candidate offering verifiable proof."

---

### Segment 6: Architecture, Sponsor Integrations & Outro (2:40 – 2:55)
- **Visual:** Quick glance at the architecture diagram, Sentry tracing dashboard showing sanitized spans, and terminal displaying the 73 passed tests.
- **Voiceover:**
  > "Built with Google Gemma 2 on Google AI Studio, Mastra agent workflows, MongoDB Atlas persistence, and Sentry tracing with zero-secret leakage.
  > 
  > Parakh: Prove your skills. Back every claim. Open-source under Apache-2.0."
- **Visual:** End screen showing GitHub repo link: `github.com/puneetnith28/Parakh` and Hacktoberfest 2026 badge.

---

## Recording & Asset Production Notes

| Aspect | Specification |
|---|---|
| **Resolution** | 1080p (1920x1080) at 60 FPS |
| **Color Scheme** | Slate-950 Dark Mode (native Parakh UI) |
| **Browser** | Clean Chromium profile without extensions, zoomed to 110% for legibility |
| **Microphone** | High-fidelity cardioid condenser with pop filter |
| **Audio Processing** | Gentle noise gate, -16 LUFS normalized dialogue |
| **Hosting Platform** | YouTube (Unlisted) or Loom, embedded into `README.md` and DEV submission article |
