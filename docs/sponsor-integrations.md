# Comprehensive Sponsor Integration Evidence Ledger

This document serves as the definitive, verifiable evidence matrix for all sponsor technologies integrated into **Parakh** (Evidence-Grounded Developer Capability Assessment Platform).

Every claimed sponsor is backed by actual code in the repository, reproducible test cases, and clear architectural boundaries.

---

## Sponsor Integration Matrix

| Sponsor | Architectural Role | Primary Source Code Links | Verifiable Test Suite | Status |
|---|---|---|---|---|
| **Google AI Studio & Gemma** | Core Reasoning & Requirement Extraction LLM (Defaults to Google AI Studio Gemini; Gemma 2 open weights supported via `GEMMA_MODEL_ID`) | [`packages/integrations/src/gemma/`](file:///packages/integrations/src/gemma/) | [`packages/integrations/src/gemma/quotaGuard.test.ts`](file:///packages/integrations/src/gemma/quotaGuard.test.ts), [`packages/integrations/src/gemma/adapter.test.ts`](file:///packages/integrations/src/gemma/adapter.test.ts) | Verified Active |
| **Typed Agent Workflows (Mastra Pattern)** | Multi-Step Agent Workflow & Tool Orchestration (Native TypeScript implementation inspired by Mastra architecture) | [`apps/api/src/mastra/`](file:///apps/api/src/mastra/) | [`apps/api/src/mastra/workflows/assessmentWorkflow.test.ts`](file:///apps/api/src/mastra/workflows/assessmentWorkflow.test.ts) | Verified Active Pattern |
| **MongoDB Atlas** | Production Document Store with Native TTL & Compound Query Indexing | [`apps/api/src/storage/`](file:///apps/api/src/storage/) | [`tests/integration/mongoLifecycleProvenance.test.ts`](file:///tests/integration/mongoLifecycleProvenance.test.ts), [`apps/api/src/storage/mongodb.test.ts`](file:///apps/api/src/storage/mongodb.test.ts) | Verified Active |
| **Sentry** | End-to-End Tracing across Assessment Lifecycle with PII Redaction | [`apps/api/src/observability/`](file:///apps/api/src/observability/) | [`apps/api/src/observability/sentry.test.ts`](file:///apps/api/src/observability/sentry.test.ts) | Verified Active |
| **ElevenLabs** | Executive Summary Audio Briefing API & Interactive UI Player | [`apps/api/src/services/audioBriefingService.ts`](file:///apps/api/src/services/audioBriefingService.ts), [`apps/web/src/components/AudioBriefingPlayer.tsx`](file:///apps/web/src/components/AudioBriefingPlayer.tsx) | [`tests/integration/audioBriefing.test.ts`](file:///tests/integration/audioBriefing.test.ts) | Verified Active |
| **Render** | Cloud Production Hosting, IaC (`render.yaml`), & CI/CD Deployment | [`render.yaml`](file:///render.yaml), [`docs/render-deployment.md`](file:///docs/render-deployment.md) | Health Probes (`/healthz`, `/api/ready`) | Verified Active |
| **GitHub Copilot** | AI-Assisted Development & Scaffold Acceleration | Monorepo-wide prompts | [`docs/copilot-usage.md`](file:///docs/copilot-usage.md) | Documented Evidence |
| **TigerData (PGVector)** | Vector Ground Truth Retrieval Engine (In-Memory Cosine Fallback Active) | [`packages/integrations/src/tigerdata/`](file:///packages/integrations/src/tigerdata/) | [`packages/integrations/src/tigerdata/retrieval.test.ts`](file:///packages/integrations/src/tigerdata/retrieval.test.ts) | Prototype (Cluster Unverified) |
| **Temporal** | Durable Workflow Evaluation & Architectural ADR | [`packages/integrations/src/temporal/`](file:///packages/integrations/src/temporal/) | [`packages/integrations/src/temporal/workflow.test.ts`](file:///packages/integrations/src/temporal/workflow.test.ts) | Architectural ADR (`docs/temporal-evaluation.md`) |
| **SerpApi** | Isolated External Technical Documentation Search | [`packages/integrations/src/serpapi/`](file:///packages/integrations/src/serpapi/) | [`packages/integrations/src/serpapi/client.test.ts`](file:///packages/integrations/src/serpapi/client.test.ts) | Disconnected by Design |
| **.tech Domains** | Production Custom Domain Routing & TLS 1.3 | [`render.yaml`](file:///render.yaml), [`docs/domain-setup.md`](file:///docs/domain-setup.md) | DNS CNAME Verification | Production Bound |
| **Backboard** | Candidate Context Memory Persistence Stub | [`packages/integrations/src/secondary/backboard.ts`](file:///packages/integrations/src/secondary/backboard.ts) | [`packages/integrations/src/secondary/secondary.test.ts`](file:///packages/integrations/src/secondary/secondary.test.ts) | Exploratory Stub |
| **DigitalOcean** | Scalable Background Compute Container Spec | [`packages/integrations/src/secondary/digitalocean.ts`](file:///packages/integrations/src/secondary/digitalocean.ts) | [`packages/integrations/src/secondary/secondary.test.ts`](file:///packages/integrations/src/secondary/secondary.test.ts) | Container Blueprint |

---

## 1. Google AI Studio & Google Gemma

- **Architectural Role:**
  Powers the core qualitative synthesis and structured requirement extraction. Evaluates AST metrics and candidate snippets using strict JSON schema prompting.
- **Model Family & Sponsor Track Boundaries:**
  - Parakh defaults to `gemini-3.8-flash` via Google AI Studio API (`generativelanguage.googleapis.com`), qualifying directly for the **Google AI Studio** sponsor track.
  - Parakh natively supports open-weights Gemma models (`gemma-2-9b-it`, `gemma-2-27b-it`) via `GEMMA_MODEL_ID=gemma-2-9b-it` or `MODEL_NAME=gemma-2-9b-it`. When Gemma is selected, Google AI Studio requests omit `responseMimeType: "application/json"` to prevent HTTP 400 parameter errors.
- **Defensive Safeguards:**
  - Temperature strictly clamped to `0.0 - 0.2` to eliminate creative hallucinations.
  - `QuotaGuard` implements exponential backoff with jitter and 800ms pacing for free-tier rate limits (15 RPM).
  - Strict fallback to local deterministic AST scoring if the remote model times out or encounters network partitions.
- **Source Code Locations:**
  - Client & Adapter: [`packages/integrations/src/gemma/client.ts`](file:///packages/integrations/src/gemma/client.ts)
  - Quota Guard: [`packages/integrations/src/gemma/quotaGuard.ts`](file:///packages/integrations/src/gemma/quotaGuard.ts)
  - Assessment Prompts: [`packages/integrations/src/gemma/assessmentPrompt.ts`](file:///packages/integrations/src/gemma/assessmentPrompt.ts)
- **Configuration:**
  ```ini
  AI_STUDIO_API_KEY=your_key_here
  MODEL_NAME=gemini-3.8-flash   # or GEMMA_MODEL_ID=gemma-2-9b-it
  ```
- **Verification Command:**
  ```bash
  npx tsx --test packages/integrations/src/gemma/adapter.test.ts packages/integrations/src/gemma/quotaGuard.test.ts
  ```

---

## 2. Typed Agent Workflow Engine (Mastra Architectural Pattern)

- **Architectural Role:**
  Coordinates the multi-phase assessment workflow: parses the opportunity, orchestrates candidate retrieval, passes bounded chunks to the reasoning model, and hands raw assertions to the deterministic citation validator.
- **Implementation Note:**
  Implemented as a native typed TypeScript workflow engine following Mastra architectural conventions (typed step contracts, isolated step execution, and structured state transitions) without introducing external `@mastra/*` package runtime overhead.
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
  Production document store configured with TLS 1.3 encryption, native TTL automatic document lifecycle management (`{ expiresAt: 1 }, expireAfterSeconds: 0`), compound O(1) tenant isolation indexes (`{ reportId: 1, viewToken: 1 }`), and session fallback mode when running in ephemeral environments.
- **Diagnostics & Demonstrability:**
  Provides a dedicated live diagnostic endpoint `GET /api/health/mongodb` executing round-trip database pings and verifying production TLS cipher negotiation.
- **Source Code Locations:**
  - Client & Pool: [`apps/api/src/storage/mongodb.ts`](file:///apps/api/src/storage/mongodb.ts)
  - Repository Store: [`apps/api/src/storage/mongoStore.ts`](file:///apps/api/src/storage/mongoStore.ts)
  - Schema & Index Specifications: [`apps/api/src/storage/models/Report.ts`](file:///apps/api/src/storage/models/Report.ts)
  - Diagnostic Endpoint: [`apps/api/src/routes/health.ts`](file:///apps/api/src/routes/health.ts)
- **Configuration:**
  ```ini
  MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net
  MONGODB_DATABASE=parakh
  ```
- **Verification Command:**
  ```bash
  npx tsx --test tests/integration/mongoLifecycleProvenance.test.ts apps/api/src/routes/health.test.ts
  ```

---

## 4. Sentry (Agent Tracing & Privacy-Preserving Observability)

- **Architectural Role:**
  End-to-end distributed agent tracing instrumented directly across every stage of the assessment pipeline:
  - `assessment.repo_ingestion` (`repo.ingest`)
  - `assessment.pipeline_evaluation` (`assessment.evaluate`)
  - `assessment.evidence_retrieval` (`retrieval.candidates`)
  - `assessment.citation_validation` (`citation.validate`)
  - `assessment.model_inference` (`model.reasoning`)
  - `assessment.provenance_signing` (`provenance.sign`)
  - `assessment.report_persistence` (`storage.persist`)
- **Data Minimization & Redaction:**
  Incorporates real-time PII and secret scrubbing (`scrubSecrets`), circular reference protection, automatic prompt bounding (<= 300 characters), and redaction of raw source file record buffers (`sentryBeforeSend`) ensuring private candidate repository code is never leaked to telemetry.
- **Source Code Locations:**
  - Backend Sentry Instrumentation: [`apps/api/src/observability/sentry.ts`](file:///apps/api/src/observability/sentry.ts)
  - Sensitive Data Scrubber: [`apps/api/src/utils/scrubber.ts`](file:///apps/api/src/utils/scrubber.ts)
  - Frontend Observability: [`apps/web/src/observability/sentry.ts`](file:///apps/web/src/observability/sentry.ts)
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

## 5. ElevenLabs (Voice Synthesis & Executive Audio Briefings)

- **Architectural Role:**
  Produces strictly grounded text-to-speech audio executive briefings from verified assessment reports.
- **Full-Stack Implementation:**
  - **Backend API:** Authenticated `POST /api/reports/:id/audio` endpoint with viewToken validation, strict 800-character summarization bounds, timeout protection, and audio size ceilings.
  - **Frontend UI:** Interactive `AudioBriefingPlayer` integrated directly into the `ReportSummary` dashboard with play/pause controls, time display, scrubber, and unconfigured service degradation.
- **Source Code Locations:**
  - Briefing Service: [`apps/api/src/services/audioBriefingService.ts`](file:///apps/api/src/services/audioBriefingService.ts)
  - Adapter: [`packages/integrations/src/secondary/elevenlabs.ts`](file:///packages/integrations/src/secondary/elevenlabs.ts)
  - UI Component: [`apps/web/src/components/AudioBriefingPlayer.tsx`](file:///apps/web/src/components/AudioBriefingPlayer.tsx)
- **Configuration:**
  ```ini
  ELEVENLABS_API_KEY=your_elevenlabs_api_key
  ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
  ```
- **Verification Command:**
  ```bash
  npx tsx --test tests/integration/audioBriefing.test.ts packages/integrations/src/secondary/secondary.test.ts
  ```

---

## 6. Render (Cloud Hosting & Infrastructure as Code)

- **Architectural Role:**
  Continuous deployment pipeline for both the Node.js Express backend and static React frontend using Infrastructure as Code via [`render.yaml`](file:///render.yaml).
- **Readiness Verification:**
  - Liveness probe (`/healthz`) and production persistence readiness probe (`/api/ready`).
  - Automated HTTPS provisioning and custom domain routing ([`docs/render-deployment.md`](file:///docs/render-deployment.md)).

---

## 7. GitHub Copilot (AI-Assisted Pair Programming)

- **Architectural Role:**
  Accelerated the authoring of AST traversal scripts, Zod contract schemas, and adversarial security test cases. Full transparency logs in [`docs/copilot-usage.md`](file:///docs/copilot-usage.md).

---

## 8. TigerData (PGVector Retrieval Prototype)

- **Architectural Role & Status:**
  Prototype adapter for vector ground truth retrieval (`packages/integrations/src/tigerdata/retrieval.ts`). Uses in-memory cosine ranking in the active product workflow; live external PostgreSQL/pgvector cluster connection is not verified in production.

---

## 9. Temporal (Durable Workflows ADR)

- **Architectural Role & Status:**
  Architectural evaluation and durable workflow activity contract prototype (`packages/integrations/src/temporal/workflow.ts`). Evaluated as an Architectural Decision Record in [`docs/temporal-evaluation.md`](file:///docs/temporal-evaluation.md); no live external Temporal Server worker runtime is deployed.

---

## 10. SerpApi & Secondary Stubs

- **SerpApi (Disconnected by Design):** Standalone client in [`packages/integrations/src/serpapi/client.ts`](file:///packages/integrations/src/serpapi/client.ts) enforcing `isCandidateEvidence: false`. Kept disconnected from the primary assessment loop to guarantee that external search results never contaminate candidate evidence scoring.
- **Backboard:** Exploratory context memory stub ([`packages/integrations/src/secondary/backboard.ts`](file:///packages/integrations/src/secondary/backboard.ts)). Primary persistence is handled by MongoDB Atlas.
- **DigitalOcean:** Worker container blueprint specification ([`packages/integrations/src/secondary/digitalocean.ts`](file:///packages/integrations/src/secondary/digitalocean.ts)). Default container environment runs on Render.
