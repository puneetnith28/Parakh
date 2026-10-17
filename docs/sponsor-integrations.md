# Comprehensive Sponsor Integration Evidence Ledger

This document serves as the definitive, verifiable evidence matrix for all sponsor technologies integrated into **Parakh** (Evidence-Grounded Developer Capability Assessment Platform).

Every claimed sponsor is backed by actual code in the repository, reproducible test cases, and clear architectural boundaries.

---

## Matrix Overview

| Sponsor | Integration Level | Primary Source Code Paths | Verifiable Test Path |
|---|---|---|---|
| **Google Gemma / AI Studio** | Core LLM Engine | `packages/integrations/src/gemma/` | `quotaGuard.test.ts`, `assessmentPrompt.test.ts` |
| **MongoDB Atlas** | Production Document Store | `apps/api/src/storage/` | `mongodb.test.ts`, `mongoStore.ts` |
| **Sentry** | Observability & Tracing | `apps/api/src/observability/`, `apps/web/src/observability/` | `sentry.test.ts` |
| **GitHub Copilot** | Developer Workflow & Scaffolding | Throughout monorepo | `docs/copilot-usage.md` |
| **TigerData** | Vector Ground Truth Retrieval | `packages/integrations/src/tigerdata/` | `retrieval.test.ts` |
| **Temporal** | Long-Running Workflow Scaffold | `packages/integrations/src/temporal/` | `workflow.test.ts`, `docs/temporal-evaluation.md` |
| **SerpApi** | External Documentation Search | `packages/integrations/src/serpapi/` | `client.test.ts` |
| **.tech Domains** | Production Custom Domain & TLS | `render.yaml`, `docs/domain-setup.md` | `docs/domain-setup.md` |
| **ElevenLabs** | Voice Synthesis (Summary Narration) | `packages/integrations/src/secondary/elevenlabs.ts` | `secondary.test.ts` |
| **Backboard** | Candidate Context Memory | `packages/integrations/src/secondary/backboard.ts` | `secondary.test.ts` |
| **DigitalOcean** | Scalable Background Compute Spec | `packages/integrations/src/secondary/digitalocean.ts` | `secondary.test.ts` |

---

## 1. Google Gemma / Google AI Studio

- **Exact Feature Implemented:**
  Automated qualitative synthesis of developer capabilities across six dimensions (code quality, architecture, testing, git discipline, security, problem-solving). Evaluates AST metrics and ground truth citations using structured JSON schema prompting and rate-limit guardrails.
- **Source Code Paths:**
  - `packages/integrations/src/gemma/client.ts`
  - `packages/integrations/src/gemma/adapter.ts`
  - `packages/integrations/src/gemma/quotaGuard.ts`
  - `packages/integrations/src/gemma/assessmentPrompt.ts`
  - `packages/integrations/src/gemma/types.ts`
- **Environment Variables:**
  - `AI_STUDIO_API_KEY`: API key for Google AI Studio / Gemini API.
  - `MODEL_NAME`: Active model identifier (e.g. `gemini-3.5-flash-lite`, `gemini-flash-latest`, or `gemma-2-9b-it`).
- **How to Test:**
  ```bash
  npx tsx --env-file=.env --test packages/integrations/src/gemma/quotaGuard.test.ts
  ```
- **Proof of Real Usage:**
  Live calls executed against Google AI Studio `v1beta` endpoint returning structured dimension scores and reasoning summaries.
- **Architectural Limitations:**
  Free-tier API keys enforce 15 RPM. Handled via `QuotaGuard` exponential backoff and 800ms throttle pacing.

---

## 2. MongoDB Atlas

- **Exact Feature Implemented:**
  Production document database with TLS encryption, compound indexing, and automatic fallback to stateless in-memory storage when unconfigured. Stores candidate reports, opportunities, and evaluation evidence.
- **Source Code Paths:**
  - `apps/api/src/storage/mongodb.ts`
  - `apps/api/src/storage/mongoStore.ts`
  - `apps/api/src/storage/models/`
  - `apps/api/src/storage/models/indexes.ts`
- **Environment Variables:**
  - `MONGODB_URI`: Production Atlas connection string with TLS and user credentials.
  - `MONGODB_DATABASE`: Target database name (defaults to `parakh`).
- **How to Test:**
  ```bash
  npx tsx --env-file=.env --test apps/api/src/storage/mongodb.test.ts
  ```
- **Proof of Real Usage:**
  Verified TLS 1.3 encrypted ping to `ac-hoydk3a-shard-00-01.6sgehjh.mongodb.net` returning active connection and index verification.
- **Architectural Limitations:**
  Requires IP access list entry (or `0.0.0.0/0` with strong authentication) for container deployments.

---

## 3. Sentry

- **Exact Feature Implemented:**
  End-to-end telemetry and error tracking for both backend API and frontend React dashboard. Includes custom scrubbing filters that sanitize bearer tokens, database credentials, and GitHub PATs from stack frames and breadcrumbs.
- **Source Code Paths:**
  - `apps/api/src/observability/sentry.ts`
  - `apps/web/src/observability/sentry.ts`
  - `apps/api/src/observability/sentry.test.ts`
- **Environment Variables:**
  - `SENTRY_DSN`: Sentry project ingest DSN.
  - `SENTRY_ENVIRONMENT`: Runtime environment label (`production`, `staging`, `development`).
- **How to Test:**
  ```bash
  npx tsx --test apps/api/src/observability/sentry.test.ts
  ```
- **Proof of Real Usage:**
  Breadcrumb sanitizer verified to mask sensitive keys and authorization headers before transmission.
- **Architectural Limitations:**
  Sample rates capped at 1.0 in development and 0.2 in high-volume production to respect Sentry quota.

---

## 4. GitHub Copilot

- **Exact Feature Implemented:**
  AI-assisted pair programming and boilerplates across AST traversal, schema synchronization, and test suite generation.
- **Source Code Paths:**
  - `docs/copilot-usage.md` (Concrete prompt logs, review cycles, and verification metrics).
- **Environment Variables:** None (developer tooling).
- **How to Test:**
  Review detailed interaction records in `docs/copilot-usage.md`.
- **Proof of Real Usage:**
  Direct code assistance recorded for Babel AST visitors, Zod contract typing, and QuotaGuard test cases.
- **Architectural Limitations:**
  All AI-generated code was subjected to human review and TypeScript compilation checks to eliminate hallucinations.

---

## 5. TigerData (PGVector)

- **Exact Feature Implemented:**
  Semantic ground truth vector retrieval with cosine similarity scoring. Ingests rubric embeddings to match candidate code snippets against proven engineering benchmarks.
- **Source Code Paths:**
  - `packages/integrations/src/tigerdata/retrieval.ts`
  - `packages/integrations/src/tigerdata/retrieval.test.ts`
- **Environment Variables:**
  - `TIGERDATA_DATABASE_URL`: PostgreSQL connection string with PGVector extension.
- **How to Test:**
  ```bash
  npx tsx --test packages/integrations/src/tigerdata/retrieval.test.ts
  ```
- **Proof of Real Usage:**
  Deterministic fallback vector retrieval engine operating seamlessly both with live database and mock fallback.
- **Architectural Limitations:**
  Falls back to in-memory cosine ranking when external database connection is unavailable.

---

## 6. Temporal

- **Exact Feature Implemented:**
  Durable workflow scaffold and activity retry policies for long-running repository assessments, with architectural evaluation ADR.
- **Source Code Paths:**
  - `packages/integrations/src/temporal/workflow.ts`
  - `packages/integrations/src/temporal/workflow.test.ts`
  - `docs/temporal-evaluation.md`
- **Environment Variables:**
  - `TEMPORAL_API_KEY`: Temporal cloud client API key.
- **How to Test:**
  ```bash
  npx tsx --test packages/integrations/src/temporal/workflow.test.ts
  ```
- **Proof of Real Usage:**
  State machine transitions, retry backoff calculation, and activity failure handling validated in automated test runner.
- **Architectural Limitations:**
  Evaluated as an enterprise batch runner; interactive real-time scans default to fast-path in-process pipeline.

---

## 7. SerpApi

- **Exact Feature Implemented:**
  External technical documentation search for discovered dependencies, strictly isolated from candidate evidence.
- **Source Code Paths:**
  - `packages/integrations/src/serpapi/client.ts`
  - `packages/integrations/src/serpapi/client.test.ts`
- **Environment Variables:**
  - `SERPAPI_API_KEY`: SerpApi search token.
- **How to Test:**
  ```bash
  npx tsx --test packages/integrations/src/serpapi/client.test.ts
  ```
- **Proof of Real Usage:**
  Results tagged with `isCandidateEvidence: false` and `sourceType: "external_reference_context"`.
- **Architectural Limitations:**
  Gracefully returns empty array when unconfigured or on network errors.

---

## 8. .tech Domains

- **Exact Feature Implemented:**
  Production DNS mapping, TLS 1.3 configuration, and HTTPS redirection for `parakh.tech` and `api.parakh.tech`.
- **Source Code Paths:**
  - `render.yaml`
  - `docs/domain-setup.md`
- **Environment Variables:** None (DNS / infrastructure level).
- **How to Test:**
  ```bash
  dig api.parakh.tech CNAME +short
  ```
- **Proof of Real Usage:**
  Architecture blueprints in `render.yaml` and TLS runbooks in `docs/domain-setup.md`.

---

## 9. Secondary Sponsors: ElevenLabs, Backboard, & DigitalOcean

- **Exact Feature Implemented:**
  - **ElevenLabs:** Audio voice narration of candidate executive summaries (`packages/integrations/src/secondary/elevenlabs.ts`).
  - **Backboard:** Longitudinal candidate context memory (`packages/integrations/src/secondary/backboard.ts`).
  - **DigitalOcean:** Dedicated worker compute container specification (`packages/integrations/src/secondary/digitalocean.ts`).
- **Feature Flags & Isolation:**
  Managed via `getSecondaryFeatureFlags()` in `packages/integrations/src/secondary/index.ts`. All secondary adapters are strictly non-blocking.
- **How to Test:**
  ```bash
  npx tsx --test packages/integrations/src/secondary/secondary.test.ts
  ```
