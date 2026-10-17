# Comprehensive Sponsor Integration Evidence Ledger

This document serves as the definitive, verifiable evidence matrix for all sponsor technologies integrated into **Parakh** (Evidence-Grounded Developer Capability Assessment Platform).

Every claimed sponsor is backed by actual code in the repository, reproducible test cases, and clear architectural boundaries.

---

## Sponsor Integration Matrix

| Sponsor | Architectural Role | Primary Source Code Links | Verifiable Test Suite | Status |
|---|---|---|---|---|
| **Google Gemma / AI Studio** | Core Reasoning & Requirement Extraction LLM | [`packages/integrations/src/gemma/`](file:///packages/integrations/src/gemma/) | [`packages/integrations/src/gemma/quotaGuard.test.ts`](file:///packages/integrations/src/gemma/quotaGuard.test.ts) | Verified Active |
| **Mastra** | Multi-Step Agent Workflow & Tool Orchestration | [`apps/api/src/mastra/`](file:///apps/api/src/mastra/) | [`apps/api/src/mastra/workflows/assessmentWorkflow.test.ts`](file:///apps/api/src/mastra/workflows/assessmentWorkflow.test.ts) | Verified Active |
| **MongoDB Atlas** | Production Document Store & Indexing | [`apps/api/src/storage/`](file:///apps/api/src/storage/) | [`apps/api/src/storage/mongodb.test.ts`](file:///apps/api/src/storage/mongodb.test.ts) | Verified Active |
| **Sentry** | End-to-End Tracing & Privacy-Preserving Observability | [`apps/api/src/observability/`](file:///apps/api/src/observability/) | [`apps/api/src/observability/sentry.test.ts`](file:///apps/api/src/observability/sentry.test.ts) | Verified Active |
| **Render** | Cloud Production Hosting & CI/CD Deployment | [`render.yaml`](file:///render.yaml) | Cloud Health Probe (`/api/health`) | Verified Active |
| **GitHub Copilot** | AI-Assisted Development & Scaffold Acceleration | Monorepo-wide prompts | [`docs/copilot-usage.md`](file:///docs/copilot-usage.md) | Documented Evidence |
| **TigerData (PGVector)** | Vector Ground Truth Retrieval Engine | [`packages/integrations/src/tigerdata/`](file:///packages/integrations/src/tigerdata/) | [`packages/integrations/src/tigerdata/retrieval.test.ts`](file:///packages/integrations/src/tigerdata/retrieval.test.ts) | Verified Active |
| **Temporal** | Durable Workflow Scaffold & Architectural ADR | [`packages/integrations/src/temporal/`](file:///packages/integrations/src/temporal/) | [`packages/integrations/src/temporal/workflow.test.ts`](file:///packages/integrations/src/temporal/workflow.test.ts) | Scaffolded & Evaluated |
| **SerpApi** | Isolated External Technical Documentation Search | [`packages/integrations/src/serpapi/`](file:///packages/integrations/src/serpapi/) | [`packages/integrations/src/serpapi/client.test.ts`](file:///packages/integrations/src/serpapi/client.test.ts) | Verified Active |
| **.tech Domains** | Production Custom Domain Routing & TLS 1.3 | [`render.yaml`](file:///render.yaml), [`docs/domain-setup.md`](file:///docs/domain-setup.md) | DNS CNAME Verification | Production Bound |
| **ElevenLabs** | Voice Synthesis (Audio Assessment Narration) | [`packages/integrations/src/secondary/elevenlabs.ts`](file:///packages/integrations/src/secondary/elevenlabs.ts) | [`packages/integrations/src/secondary/secondary.test.ts`](file:///packages/integrations/src/secondary/secondary.test.ts) | Secondary Feature-Flagged |
| **Backboard** | Candidate Context Memory Persistence | [`packages/integrations/src/secondary/backboard.ts`](file:///packages/integrations/src/secondary/backboard.ts) | [`packages/integrations/src/secondary/secondary.test.ts`](file:///packages/integrations/src/secondary/secondary.test.ts) | Secondary Feature-Flagged |
| **DigitalOcean** | Scalable Background Compute Container Spec | [`packages/integrations/src/secondary/digitalocean.ts`](file:///packages/integrations/src/secondary/digitalocean.ts) | [`packages/integrations/src/secondary/secondary.test.ts`](file:///packages/integrations/src/secondary/secondary.test.ts) | Container Blueprint |

---

## 1. Google Gemma / Google AI Studio

- **Architectural Role:**
  Powers the core qualitative synthesis and structured requirement extraction. Evaluates AST metrics and candidate snippets using strict JSON schema prompting.
- **Defensive Safeguards:**
  - Temperature strictly clamped to `0.0 - 0.2` to eliminate hallucinated assertions.
  - `QuotaGuard` implements exponential backoff with jitter and 800ms pacing for free-tier rate limits (15 RPM).
  - Strict fallback to local deterministic AST scoring if the remote model times out or encounters network partitions.
- **Source Code Locations:**
  - Client & Adapter: [`packages/integrations/src/gemma/client.ts`](file:///packages/integrations/src/gemma/client.ts)
  - Quota Guard: [`packages/integrations/src/gemma/quotaGuard.ts`](file:///packages/integrations/src/gemma/quotaGuard.ts)
  - Assessment Prompts: [`packages/integrations/src/gemma/assessmentPrompt.ts`](file:///packages/integrations/src/gemma/assessmentPrompt.ts)
- **Configuration:**
  ```ini
  AI_STUDIO_API_KEY=your_key_here
  GEMMA_MODEL_ID=gemma-2-9b-it
  ```
- **Verification Command:**
  ```bash
  npx tsx --env-file=.env --test packages/integrations/src/gemma/quotaGuard.test.ts
  ```

---

## 2. Mastra (Agent Orchestration & Workflow Engine)

- **Architectural Role:**
  Coordinates the multi-phase assessment workflow: parses the opportunity, orchestrates candidate retrieval, passes bounded chunks to the reasoning model, and hands raw assertions to the deterministic citation validator.
- **Source Code Locations:**
  - Orchestrator Engine: [`apps/api/src/mastra/index.ts`](file:///apps/api/src/mastra/index.ts)
  - Typed Assessment Workflow: [`apps/api/src/mastra/workflows/assessmentWorkflow.ts`](file:///apps/api/src/mastra/workflows/assessmentWorkflow.ts)
  - System Health Integration: [`apps/api/src/routes/health.ts`](file:///apps/api/src/routes/health.ts)
- **Verification Command:**
  ```bash
  npx tsx --test apps/api/src/mastra/workflows/assessmentWorkflow.test.ts
  ```

---

## 3. MongoDB Atlas

- **Architectural Role:**
  Production document store configured with TLS 1.3 encryption, compound index optimizations (`{ createdAt: -1 }`, `{ viewToken: 1 }`), and session fallback mode when running in ephemeral environments.
- **Source Code Locations:**
  - Client & Pool: [`apps/api/src/storage/mongodb.ts`](file:///apps/api/src/storage/mongodb.ts)
  - Repository Store: [`apps/api/src/storage/mongoStore.ts`](file:///apps/api/src/storage/mongoStore.ts)
  - Index Specifications: [`apps/api/src/storage/models/indexes.ts`](file:///apps/api/src/storage/models/indexes.ts)
- **Configuration:**
  ```ini
  MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net
  MONGODB_DB_NAME=parakh_dev
  ```
- **Verification Command:**
  ```bash
  npx tsx --env-file=.env --test apps/api/src/storage/mongodb.test.ts
  ```

---

## 4. Sentry (Agent Tracing & Observability)

- **Architectural Role:**
  Full-stack distributed tracing across API workflows and frontend React state. Incorporates real-time PII and secret scrubbing (`scrubSecrets`) ensuring that database credentials, GitHub PATs, and bearer headers are never leaked to telemetry.
- **Source Code Locations:**
  - Backend Sentry Instrumentation: [`apps/api/src/observability/sentry.ts`](file:///apps/api/src/observability/sentry.ts)
  - Sensitive Data Scrubber: [`apps/api/src/utils/scrubber.ts`](file:///apps/api/src/utils/scrubber.ts)
  - Frontend Sentry Client: [`apps/web/src/observability/sentry.ts`](file:///apps/web/src/observability/sentry.ts)
- **Configuration:**
  ```ini
  SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
  SENTRY_ENVIRONMENT=production
  ```
- **Verification Command:**
  ```bash
  npx tsx --test apps/api/src/observability/sentry.test.ts tests/security/secretLeakAudit.test.ts
  ```

---

## 5. Render (Cloud Hosting & Infrastructure)

- **Architectural Role:**
  Powers the automated deployment pipeline for both the Node.js Express backend and static React frontend, complete with automatic branch previews and HTTPS certificates.
- **Source Code Locations:**
  - Deployment Blueprint: [`render.yaml`](file:///render.yaml)
  - Domain Routing Runbook: [`docs/domain-setup.md`](file:///docs/domain-setup.md)

---

## 6. GitHub Copilot (AI-Assisted Pair Programming)

- **Architectural Role:**
  Accelerated the authoring of AST traversal scripts, Zod contract schemas, and adversarial security test cases.
- **Evidence Documentation:**
  Full transparency logs including prompt transcripts, code output examples, and developer reflections in [`docs/copilot-usage.md`](file:///docs/copilot-usage.md).

---

## 7. TigerData (PGVector Semantic Grounding)

- **Architectural Role:**
  Semantic vector retrieval matching extracted requirements to code candidates with cosine similarity ranking and deterministic in-memory fallback.
- **Source Code Locations:**
  - Retrieval Engine: [`packages/integrations/src/tigerdata/retrieval.ts`](file:///packages/integrations/src/tigerdata/retrieval.ts)
- **Verification Command:**
  ```bash
  npx tsx --test packages/integrations/src/tigerdata/retrieval.test.ts
  ```

---

## 8. Temporal (Durable Execution)

- **Architectural Role:**
  Scaffolded durable workflow activities and retry policies for long-running repository batch scans.
- **Evidence Documentation:**
  - Workflow Definition: [`packages/integrations/src/temporal/workflow.ts`](file:///packages/integrations/src/temporal/workflow.ts)
  - Architecture Decision Record (ADR): [`docs/temporal-evaluation.md`](file:///docs/temporal-evaluation.md)

---

## 9. SerpApi (External Documentation Lookup)

- **Architectural Role:**
  Provides external reference documentation search for unfamiliar dependencies. Enforces strict provenance boundary: external search results are strictly tagged `isCandidateEvidence: false` and never substantiate code claims.
- **Source Code Locations:**
  - Client Service: [`packages/integrations/src/serpapi/client.ts`](file:///packages/integrations/src/serpapi/client.ts)
- **Verification Command:**
  ```bash
  npx tsx --test packages/integrations/src/serpapi/client.test.ts
  ```

---

## 10. Secondary Sponsors (ElevenLabs, Backboard, DigitalOcean)

- **Implementations:**
  - **ElevenLabs:** Text-to-speech audio narration synthesis of assessment summaries ([`packages/integrations/src/secondary/elevenlabs.ts`](file:///packages/integrations/src/secondary/elevenlabs.ts)).
  - **Backboard:** Context memory store for candidate evaluation history ([`packages/integrations/src/secondary/backboard.ts`](file:///packages/integrations/src/secondary/backboard.ts)).
  - **DigitalOcean:** Standalone worker container specification ([`packages/integrations/src/secondary/digitalocean.ts`](file:///packages/integrations/src/secondary/digitalocean.ts)).
- **Verification Command:**
  ```bash
  npx tsx --test packages/integrations/src/secondary/secondary.test.ts
  ```
