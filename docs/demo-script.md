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

### Segment 5: Executive Audio Briefing & Persistence (2:10 – 2:40)
- **Visual:** In the Report Dashboard, the user clicks **"Listen to Executive Briefing"** on the `AudioBriefingPlayer`. An audio waveform loads and plays a synthesized executive summary generated via ElevenLabs (`POST /api/reports/:id/audio`).
- **Action:** User copies the verified share link with the cryptographic `viewToken`, opens a private window or refreshes the page, and demonstrates instantaneous retrieval of the persistent report from MongoDB Atlas with full cryptographic provenance.
- **Voiceover:**
  > "For hiring managers and recruiters on the go, Parakh generates an executive audio briefing using ElevenLabs. The briefing is strictly grounded in verified report findings — zero hallucination, with complete playback controls.
  > 
  > Every assessment report is persistently stored in MongoDB Atlas with native TTL lifecycle management and compound query indexing. The report is accessible via a secure 256-bit token with O(1) retrieval speed."

---

### Segment 6: Sponsor Observability, Tracing & Outro (2:40 – 3:00)
- **Visual:** Sentry dashboard view showing the live assessment trace with distinguishable spans:
  - `assessment.repo_ingestion`
  - `assessment.evidence_retrieval`
  - `assessment.citation_validation`
  - `assessment.model_inference`
  - `assessment.provenance_signing`
  - `assessment.report_persistence`
  Notice prompt truncation and source buffer omission verifying zero secret or source leakage.
- **Voiceover:**
  > "Under the hood, Parakh instruments full assessment lifecycle tracing with Sentry Agent Tracing. Every retrieval step, model call, citation check, and cryptographic signature is measurable with strict data minimization — private repository source buffers and API keys are scrubbed before network egress.
  > 
  > Parakh: Built with Google AI Studio and Gemma, MongoDB Atlas, Sentry Agent Tracing, ElevenLabs, and Render. Prove your skills. Back every claim. Open-source under Apache-2.0."
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
