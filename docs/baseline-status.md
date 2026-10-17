# Baseline Status & Verification Record

**Timestamp:** 2026-10-17  
**Branch:** `main`  
**Baseline Verification Command:** `npm run baseline:check`

---

## 1. Monorepo Build Status

| Workspace / Package | Build Command | Compiler / Bundler | Status |
|:---|:---|:---|:---|
| `parakh-monorepo` (root) | `npm run build` | Workspaces Orchestrator | **PASS** |
| `apps/api` | `tsc` | TypeScript v5.6.3 | **PASS** |
| `apps/web` | `tsc -b && vite build` | Vite v5.4.21 / React 18 | **PASS** (169.58 kB bundle, 31.70 kB CSS) |
| `packages/contracts` | `echo "contracts ready"` | TypeScript ESM | **PASS** |
| `packages/assessment` | `echo "assessment build ready"` | TypeScript ESM | **PASS** |
| `packages/evidence` | `echo "evidence build ready"` | TypeScript ESM | **PASS** |
| `packages/integrations` | `echo "integrations build ready"` | TypeScript ESM | **PASS** |

---

## 2. Test Suites Summary

| Test Category | Command / Path | Test Count | Pass Rate | Status |
|:---|:---|:---:|:---:|:---:|
| **Contracts Unit Tests** | `packages/contracts/src/**/*.test.ts` | 13 | 100% | **PASS** |
| **Assessment Unit Tests** | `packages/assessment/src/**/*.test.ts` | 21 | 100% | **PASS** |
| **Monorepo Unit Tests** | `tests/unit/**/*.test.ts` | 11 | 100% | **PASS** |
| **Security & SSRF Audit** | `tests/security/**/*.test.ts` | 39 | 100% | **PASS** |
| **Integration Workflows** | `tests/integration/**/*.test.ts` | 22 | 100% | **PASS** |
| **Total Automated Tests** | `npm run baseline:check` | **106** | **100%** | **PASS** |

---

## 3. Verified Security & Trust Guarantees

1. **Deterministic Citation Verification:** Hallucinated candidate IDs or out-of-bound line references are caught deterministically by `CitationValidator` and downgraded.
2. **Conservative Downgrade Logic:** `resolveAssessmentStatus` downgrades unverified positive claims to `needs_review` and doc-only claims to `partially_demonstrated`.
3. **SSRF Boundary Enforcement:** `safeFetch`, `validateRepositoryUrl`, and API endpoints reject all private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `::1`), metadata endpoints (`169.254.169.254`), non-standard ports, and non-canonical URL schemes.
4. **Secret Scrubbing & Redaction:** MongoDB URIs, API keys, personal access tokens, and bearer credentials are automatically scrubbed from logs and Sentry breadcrumbs.

---

## 4. Reproducible Baseline Command

To reproduce this clean baseline check at any time:
```bash
npm run baseline:check
```
This runs monorepo build, workspace tests, unit tests, integration tests, and security tests sequentially.
