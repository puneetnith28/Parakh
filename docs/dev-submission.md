---
title: "Parakh: Prove Your Skills. Back Every Claim."
published: false
description: "An open-source, evidence-grounded capability assessment platform that turns freelance client briefs and GitHub repositories into verifiable, citation-backed proof."
tags: devchallenge, hacktoberfest, ai, opensource
cover_image: https://raw.githubusercontent.com/puneetnith28/Parakh/main/docs/assets/02-evidence-map.svg
canonical_url: https://github.com/puneetnith28/Parakh
---

*This article is submitted for the Hacktoberfest 2026 / DEV Challenge: Side Hustle Track.*

---

## ⚡ The Problem: The High-Stakes Dilemma of Modern Freelancing

Every software engineer who has tried freelancing or agency consulting knows the sting: you spend hours crafting a proposal for an enterprise RFP or high-value contract, only to be drowned out by dozens of applicants submitting generic, AI-generated proposals promising the moon.

Meanwhile, clients and hiring managers are equally exhausted. In an era where conversational AI can generate fluent resumes and buzzword-laden cover letters in seconds, **words have never been cheaper — and proof has never been rarer.**

How do you prove that you actually have production experience with multi-tenant database migrations, JWT refresh token rotation, or API rate limiting?

Enter **Parakh (परख)** — Hindi for *rigorous test*, *examination*, or *in-depth scrutiny*.

Parakh is an open-source, evidence-grounded developer capability assessment platform. It takes a client brief (pasted text or PDF) and your public GitHub repository, extracts the discrete technical requirements, retrieves relevant candidate code and tests, and generates an interactive **Evidence Map** where **every single claimed capability is backed by a deterministic, line-level citation linking directly to an immutable commit SHA on GitHub.**

---

## 🚀 Live Demo & Repository

- **GitHub Repository:** [https://github.com/puneetnith28/Parakh](https://github.com/puneetnith28/Parakh) *(Apache-2.0)*
- **Live Interactive App:** [https://parakh-web.onrender.com](https://parakh-web.onrender.com)
- **API Health Endpoint:** [https://parakh-api.onrender.com/api/health](https://parakh-api.onrender.com/api/health)
- **Video Walkthrough Guide:** [docs/demo-script.md](https://github.com/puneetnith28/Parakh/blob/main/docs/demo-script.md)

---

## 🛠️ How It Works: The 5-Step Verification Flow

Parakh does not ask the model to "grade a candidate." Instead, it uses a disciplined, multi-stage pipeline:

```text
┌─────────────────┐       ┌─────────────────┐
│  Client Brief   │       │   GitHub Repo   │
│   (PDF / Text)  │       │ (Public Source) │
└────────┬────────┘       └────────┬────────┘
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│ Gemma 2 Extract │       │ SSRF / SHA Pin  │
│  (Zod Schema)   │       │ & AST Ingestion │
└────────┬────────┘       └────────┬────────┘
         │                         │
         └───────────┬─────────────┘
                     ▼
       ┌───────────────────────────┐
       │ Mastra Agent Orchestration│
       │  (Candidate Retrieval)    │
       └─────────────┬─────────────┘
                     ▼
       ┌───────────────────────────┐
       │  Deterministic Citation   │
       │    Validator (Zero LLM)   │
       └─────────────┬─────────────┘
                     ▼
       ┌───────────────────────────┐
       │   Interactive Evidence    │
       │  Map & Proposal Assistant │
       └───────────────────────────┘
```

### 1. Ingest Opportunity Brief
Upload a client RFP (PDF or raw text). Parakh uses **Google Gemma 2** to parse ambiguous client prose into discrete, testable technical requirements (e.g., `FR-01: React 18 SPA Architecture`, `FR-02: JWT Auth & RBAC`).

### 2. Developer-in-the-Loop Review
Before any code is scanned, developers can edit, re-categorize, prioritize, or add custom requirements directly in the interactive editor.

### 3. Secure GitHub Ingestion
Parakh resolves the repository, enforces strict SSRF and network boundary guards, excludes vendored or binary files, and pins the exact **40-character commit SHA** to guarantee immutable evidence permalinks.

### 4. Zero-Tolerance Citation Grounding
This is Parakh's core ethical guarantee: **a requirement can NEVER be labeled "Demonstrated" unless the citation validator verifies that the candidate code file exists in the repository, the cited line numbers fall strictly within file bounds, and passing automated tests substantiate the implementation.**
- Missing tests? Automatically downgraded to **Partially demonstrated**.
- Code not in repository? Transparently labeled **Not demonstrated in supplied evidence** (indicating absence of evidence, *never* that the developer is incompetent).

### 5. Evidence Map & Proposal Generation
Explore the interactive Evidence Map, inspect line-level code proofs in a slide-out inspector, view actionable sprint steps for unaddressed skills, and generate an evidence-backed proposal draft ready to send to the client.

---

## 🏛️ Architecture & Sponsor Integration Highlights

Parakh was built with profound architectural discipline across all 100 planned steps:

### 1. Google AI Studio & Google Gemma 2
- Powers bounded requirement extraction and capability synthesis via Google AI Studio API.
- Protected by `QuotaGuard` implementing exponential backoff with jitter and 800ms pacing for free-tier quotas.
- Temperature strictly clamped to `0.0 - 0.2` to eliminate creative hallucinations.
- Natively supports Gemma 2 open-weights models (`gemma-2-9b-it`) alongside Google AI Studio Gemini models.

### 2. Typed Agent Workflow Orchestration (Mastra Architectural Pattern)
- Coordinates the multi-stage asynchronous pipeline connecting document parsing, candidate chunk indexing, reasoning, and deterministic citation validation.
- Implemented as a native typed TypeScript workflow engine following Mastra architectural principles with complete error boundary isolation.

### 3. MongoDB Atlas
- Secure cloud document persistence storing encrypted audit sessions, tenant tokens, and cached evidence graphs.
- Hardened with TLS 1.3, native TTL document expiration (`{ expiresAt: 1 }`), compound O(1) tenant isolation indexes (`{ reportId: 1, viewToken: 1 }`), and automated session fallback mode.

### 4. Sentry Agent Tracing & Privacy Scrubber
- Distributed tracing instrumented across every stage of the assessment lifecycle (repo ingestion, evidence retrieval, citation validation, model reasoning, provenance signing, persistence).
- Features `scrubSecrets()`, an automated redaction engine that ensures database credentials, personal access tokens, and bearer keys are scrubbed from telemetry before network egress.

### 5. ElevenLabs Executive Audio Briefings
- Authenticated `POST /api/reports/:id/audio` endpoint and interactive `AudioBriefingPlayer` in the report dashboard.
- Generates concise, cryptographically grounded audio executive summaries for hiring managers and recruiters.

### 6. GitHub Copilot
- Documented in [docs/copilot-usage.md](https://github.com/puneetnith28/Parakh/blob/main/docs/copilot-usage.md): accelerated AST visitor authoring, Zod schema typing, and adversarial test harness scaffolding.

### 7. Render
- Continuous deployment pipeline with infrastructure-as-code blueprints in `render.yaml` and health-check monitoring (`/healthz`, `/api/ready`).

---

## 📊 Empirical Capability Evaluation & Benchmark Results

We believe hackathon submissions should be backed by empirical data, not cherry-picked demos. We evaluated Parakh against a deterministic benchmark suite of 10 diverse repository fixtures:

| Metric | Target Specification | Empirical Result |
| :--- | :--- | :--- |
| **Citation Validity Rate** | 100.0% | **100.0%** (Zero hallucinated citations) |
| **Overall Benchmark Accuracy** | >= 90.0% | **100.0%** (10/10 scenarios passed) |
| **Demonstrated Status Precision** | >= 90.0% | **100.0%** |
| **False Positive Rate** | < 5.0% | **0.0%** |
| **Adversarial Prompt Injection Defense** | 100.0% | **100.0%** (4 vectors blocked) |
| **SSRF & Network Boundary Mitigation** | 100.0% | **100.0%** (29 vectors rejected) |

See the full evaluation report in [docs/evaluation-results.md](https://github.com/puneetnith28/Parakh/blob/main/docs/evaluation-results.md).

---

## 🔒 Security & Defensive Principles

- **Zero Untrusted Code Execution:** Parakh never executes untrusted code, runs build scripts, or spawns sandboxes. Code is inspected purely as static text and AST tokens in memory.
- **SSRF Hardening:** Blocks cloud metadata (`169.254.169.254`), loopbacks, local subnets, path traversal coordinates (`/../../`), and non-HTTPS protocols.
- **Prompt Injection Defense:** Injected instructions inside client briefs, repository READMEs, code comments, or commit messages are isolated as passive data and cannot hijack the scoring engine.

See [docs/security.md](https://github.com/puneetnith28/Parakh/blob/main/docs/security.md) for full threat modeling.

---

## 💡 What We Learned

Building an evidence-grounded AI system taught us that **the most important feature of an LLM evaluation tool is knowing when to say "I don't know."** 

By pairing language model reasoning with deterministic citation validation and immutable Git commit pinning, we eliminated the hallucination problem entirely. In high-stakes freelancing, **grounded proof is the ultimate superpower.**

---

*Parakh is open-source under the [Apache License, Version 2.0](https://github.com/puneetnith28/Parakh/blob/main/LICENSE).*
