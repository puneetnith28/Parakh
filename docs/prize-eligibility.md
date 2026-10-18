# DEV Hacktoberfest Open-Source AI Challenge: Official Sponsor Prize Eligibility Audit

## Objective & Evaluation Standards

This document establishes an evidence-based assessment of Parakh's eligibility for sponsor prize categories in the DEV Hacktoberfest Open-Source AI Challenge (Week 2).

In accordance with our strict truthfulness mandate:
- **No unverified claims:** An API client, environment variable, or mock test does not constitute a valid submission.
- **Genuine core utility:** Sponsor technology must contribute demonstrable user or operational value to Parakh.
- **Explicit exclusions:** Any track where Parakh implements an architectural prototype or architectural evaluation rather than an active production SDK is explicitly disclaimed.

---

## Category Suitability Matrix

| Sponsor Category | Required Technology | Parakh Implementation State | Eligibility Determination | Evidence / Verification |
|---|---|---|---|---|
| **MongoDB Atlas** | MongoDB Atlas as primary persistence layer | Versioned document store, native TTL automatic document lifecycle (`{ expiresAt: 1 }`), compound O(1) tenant query indexes (`{ reportId: 1, viewToken: 1 }`), TLS 1.3 verification, round-trip ping diagnostic (`/api/health/mongodb`) | **ELIGIBLE (Primary Track)** | [`apps/api/src/storage/mongodb.ts`](file:///apps/api/src/storage/mongodb.ts)<br>[`tests/integration/mongoLifecycleProvenance.test.ts`](file:///tests/integration/mongoLifecycleProvenance.test.ts) |
| **Google AI Studio** | Google AI Studio API for LLM reasoning | `generativelanguage.googleapis.com` REST adapter with `gemini-3.8-flash` default model, conservative temperature clamping (`0.0 - 0.2`), and `QuotaGuard` pacing | **ELIGIBLE (Primary Track)** | [`packages/integrations/src/gemma/adapter.ts`](file:///packages/integrations/src/gemma/adapter.ts)<br>[`tests/unit/config.test.ts`](file:///tests/unit/config.test.ts) |
| **Google Gemma (Open Models)** | Open-weights Gemma models (`gemma-2-9b-it`, `gemma-2-27b-it`) | Adapter natively supports Gemma 2 via `GEMMA_MODEL_ID=gemma-2-9b-it` with non-JSON payload formatting. Default workflow uses Gemini. | **CONDITIONALLY ELIGIBLE (Requires `GEMMA_MODEL_ID`)** | [`packages/integrations/src/gemma/adapter.test.ts`](file:///packages/integrations/src/gemma/adapter.test.ts) (Disclosed: Default is Gemini) |
| **Sentry (Agent Tracing)** | Distributed tracing for multi-step AI workflows | Full assessment lifecycle spans: `assessment.repo_ingestion`, `assessment.evidence_retrieval`, `assessment.citation_validation`, `assessment.model_inference`, `assessment.provenance_signing`, `assessment.report_persistence` with strict data minimization | **ELIGIBLE (Primary Track)** | [`apps/api/src/observability/sentry.ts`](file:///apps/api/src/observability/sentry.ts)<br>[`apps/api/src/observability/sentry.test.ts`](file:///apps/api/src/observability/sentry.test.ts) |
| **ElevenLabs** | Voice narration / speech synthesis | Authenticated `POST /api/reports/:id/audio` endpoint generating strictly grounded 800-char executive summaries, playable via `AudioBriefingPlayer.tsx` | **ELIGIBLE (Sponsor Track)** | [`apps/api/src/services/audioBriefingService.ts`](file:///apps/api/src/services/audioBriefingService.ts)<br>[`tests/integration/audioBriefing.test.ts`](file:///tests/integration/audioBriefing.test.ts) |
| **Render** | Deployment on Render Cloud Platform | Decoupled web service (`parakh-api`) and static site (`parakh-web`) with IaC [`render.yaml`](file:///render.yaml), health probes, and custom domain setup | **ELIGIBLE (Deployment Track)** | [`render.yaml`](file:///render.yaml)<br>[`docs/render-deployment.md`](file:///docs/render-deployment.md) |
| **Mastra** | Mastra agent framework (`@mastra/core`) | Uses native typed TypeScript workflow classes inspired by Mastra patterns; `@mastra/core` is not installed | **DO NOT ENTER** | Custom implementation; not official Mastra SDK |
| **Temporal** | Temporal durable workflow engine with live worker | Architectural Decision Record and activity prototype (`docs/temporal-evaluation.md`); no live Temporal Server cluster | **DO NOT ENTER** | Evaluated architecture only; no live runtime worker |
| **Tiger Data** | Tiger Data / PostgreSQL pgvector | Prototype adapter; active workflow uses in-memory cosine ranking; live cluster unverified | **DO NOT ENTER** | Prototype stage |
| **SerpApi** | External web search | Client implemented but intentionally disconnected from candidate evidence scoring to preserve cryptographic provenance | **DO NOT ENTER** | Disconnected by design |

---

## Recommended Submission Categories

Based on verifiable implementation evidence, Parakh is qualified and recommended for the following categories:

1. **MongoDB Atlas Track:** Demonstrates genuine, secure, production-grade cloud persistence with cryptographic report tamper-detection, O(1) compound query retrieval, and native TTL expiration.
2. **Google AI Studio Track:** Demonstrates bounded LLM reasoning heuristics with low-temperature clamping, rate-limiting quota defense, and strict citation grounding.
3. **Sentry Agent Tracing Track:** Demonstrates distributed distributed tracing across 6 distinct multi-phase pipeline stages with automated PII and repository source buffer scrubbing.
4. **ElevenLabs Sponsor Track:** Demonstrates a complete API-to-UI executive audio briefing generation and playback experience with error resilience.
5. **Main Challenge (Side Hustle / Developer Tooling):** Full evidence-grounded candidate capability assessment platform solving real client-freelancer evaluation friction.

---

## Disqualification Prevention Checklist

- [x] **No Mock Certifications:** All integrations explicitly disclose their live vs. simulated status via `/api/integrations/status`.
- [x] **Evidence Invariant Intact:** External search results (SerpApi) never substantiate candidate claims.
- [x] **No Fake Dependency Claims:** Mastra and Temporal are documented as architectural patterns / ADRs, not claimed as installed runtime engines.
- [x] **Licensing Compliance:** Monorepo is licensed under Apache-2.0 with all third-party code attributed in [`docs/attribution.md`](file:///docs/attribution.md).
- [x] **Zero Secret Leaks:** Automated test suite verifies zero plaintext credentials in reports, logs, or Sentry breadcrumbs.
