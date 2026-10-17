# Architecture Decision Record (ADR): Temporal Durable Execution vs Synchronous Orchestration

- **Status:** Evaluated & Scaffolding Provided
- **Date:** 2026-10-17
- **Authors:** Parakh Core Architecture Team

---

## 1. Context & Problem Statement

Parakh evaluates developer capability by:
1. Ingesting candidate repositories via GitHub GraphQL/REST APIs.
2. Generating ASTs and parsing code metrics (complexity, test ratios, modularity).
3. Querying local vector ground truth or TigerData embeddings.
4. Synthesizing dimension assessments with Google Gemma LLM.
5. Emitting signed JSON reports and SVG credential badges.

In standard scenarios, scans complete within **12 to 35 seconds**. However, in large enterprise monorepos (e.g. 50,000+ files or deep multi-year git history), assessment jobs can extend beyond 3–10 minutes, introducing vulnerability to process restarts, container crashes, and API rate limits.

We evaluated **Temporal.io** as a durable execution engine to answer whether Parakh should mandate Temporal for all runs or maintain a hybrid execution path.

---

## 2. Evaluation Criteria & Findings

| Evaluation Dimension | Synchronous / In-Process (Current) | Temporal Durable Execution |
|---|---|---|
| **Latency for Standard Repos (<500 files)** | 12–25 seconds. Zero network orchestration overhead. | 15–30 seconds. Adds worker task queue polling & history serialization. |
| **Failure Recovery** | Job restarts from beginning if server crashes mid-flight. | Resumes exactly at failed step (e.g., AST completed, LLM step retried without re-cloning). |
| **Operational Complexity** | Low. Requires only Fastify API node and MongoDB Atlas. | High. Requires Temporal Server cluster, PostgreSQL/Cassandra persistence, and dedicated worker fleets. |
| **Hosting Footprint** | Fits comfortably within single container / Render tier. | Demands multi-service infrastructure orchestration. |
| **Rate Limit Resilience** | Exponential backoff managed via in-memory `QuotaGuard`. | Deterministic, multi-hour timers and activity sleeping natively supported. |

---

## 3. Decision

We adopt a **Dual-Mode Architectural Pattern**:
1. **Default Fast Path (Synchronous In-Process):**
   - For interactive web evaluations and candidate-triggered assessments (<1,000 files), Parakh uses its direct pipeline (`assessmentService.ts`) for minimal latency and minimal infrastructure overhead.
2. **Durable Workflow Scaffold (`packages/integrations/src/temporal/workflow.ts`):**
   - For enterprise tier, multi-repo batch evaluations, and background reconciliation, Parakh defines the standard activity contract (`WORKFLOW_ACTIVITIES`) and retry policies (`ActivityRetryPolicy`).
   - The workflow interface is structured so that when the deployment environment has `TEMPORAL_API_KEY` and worker daemons enabled, jobs can be dispatched into Temporal queues without modifying core assessment logic.

---

## 4. Invariant Policies & Activity Boundaries

If executing via Temporal:
- **Idempotency Invariant:** Every activity MUST be idempotent. Repos are keyed by commit SHA rather than branch head (`HEAD`).
- **Data Payload Limits:** Temporal histories must not store full AST dumps or multi-megabyte source code blobs. AST metrics and vector scores are summarized into scalar JSON payloads before returning from activities.
- **Retry Invariants:** Transient network/429 rate limit errors trigger exponential backoff up to 5 attempts. Authentication failures or non-existent repositories (`REPOSITORY_NOT_FOUND`) fail immediately as non-retryable errors.
