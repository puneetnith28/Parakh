# Parakh Master Documentation Suite

> **Prove Your Skills. Back Every Claim.**  
> Parakh is an open-source, evidence-grounded developer capability assessment platform. Every domain topic in Parakh is governed by an authoritative, verified technical specification.

---

## 📚 Master Documentation Index

| Topic | Specification | Primary Coverage | Verified File Link |
| :--- | :--- | :--- | :---: |
| 🏛️ **Architecture** | **System Architecture Specification** | 11 verified Mermaid diagrams covering system context, monorepo packages, pipeline flow, security boundaries, and sponsor flows | [`Architecture.md`](../Architecture.md) |
| 📐 **Scoring Heuristics** | **Capability Scoring Rules & Formulas** | Deterministic citation validation rules, AST priority, conservative downgrade matrices, and BM25 lexical ranking | [`docs/evaluation-results.md`](./evaluation-results.md) |
| 🔌 **API Reference** | **REST API Reference Specification** | Complete catalog of Express API endpoints, HTTP verbs, Zod contracts, status codes, and error envelopes | [`docs/api-reference.md`](./api-reference.md) |
| 🗄️ **Data Architecture** | **Document Database Schema & Lifecycle** | MongoDB Atlas collection schemas, compound tenant indexes, native TTL lifecycle, and cryptographic HMAC digests | [`docs/data-architecture.md`](./data-architecture.md) |
| ⚙️ **Configuration** | **Environment & Configuration Reference** | Dictionary of all environment variables across frontend, backend, AI models, MongoDB, Sentry, and ElevenLabs | [`.env.example`](../.env.example) |
| 🚀 **Deployment** | **Production & Local Deployment Runbook** | Render Cloud IaC (`render.yaml`) deployment, FQDN hostname resolution, CORS whitelisting, and local setup | [`docs/render-deployment.md`](./render-deployment.md) |
| 🔒 **Security & Privacy** | **Security Architecture & Threat Model** | Defense-in-depth security: SSRF boundary protection, private IP blocking, secret scrubbing, and Sentry PII redaction | [`docs/security.md`](./security.md) |
| 🛡️ **Sponsor Eligibility** | **Sponsor Prize Eligibility & Category Audit** | Evidence-based qualification audit for Google AI Studio, MongoDB Atlas, Sentry, ElevenLabs, and Render tracks | [`docs/prize-eligibility.md`](./prize-eligibility.md) |
| 🛠️ **Operations** | **Maintenance & Operations Guide** | Release checklists, automated CI/CD procedures, build validation across monorepo packages, and incident recovery | [`docs/release-checklist.md`](./release-checklist.md) |
| 🧪 **Quality Assurance** | **Quality Assurance & Test Matrix** | 100% passing automated test suite across unit, integration, security, and deterministic benchmark scenarios | [`docs/evaluation-results.md`](./evaluation-results.md) |
| 📋 **Specifications** | **Technical Requirements Document (TRD)** | Core functional requirements, architectural decision records (ADRs for Temporal and Mastra patterns), and tech stack rationales | [`docs/architecture-overview.md`](./architecture-overview.md) |
| 🗺️ **User Journeys** | **Application Flow & User Journeys** | End-to-end walkthrough of the 5-stage assessment workflow, interactive evidence map, gap checklists, and audio player | [`docs/demo-script.md`](./demo-script.md) |
| 🤝 **Attribution & Ethics** | **Developer Contribution & Attribution Guidelines** | Apache-2.0 licensing, third-party library attributions, Git commit conventions, and AI-assisted pair programming logs | [`docs/attribution.md`](./attribution.md) |
| 🤖 **AI Transparency** | **GitHub Copilot Usage Log** | Complete disclosure of AI pair programming prompts, AST traversals, and human-in-the-loop audit gates | [`docs/copilot-usage.md`](./copilot-usage.md) |

---

## 🧭 Recommended Reading Paths

- **For Hackathon Judges & Evaluators:** Start with [`docs/prize-eligibility.md`](./prize-eligibility.md) $\rightarrow$ [`Architecture.md`](../Architecture.md) $\rightarrow$ [`docs/evaluation-results.md`](./evaluation-results.md).
- **For Infrastructure & DevOps Engineers:** Start with [`docs/render-deployment.md`](./render-deployment.md) $\rightarrow$ [`Architecture.md`](../Architecture.md#23-defense-in-depth-security--privacy-architecture) $\rightarrow$ [`.env.example`](../.env.example).
- **For Core Developers & Contributors:** Start with [`docs/architecture-overview.md`](./architecture-overview.md) $\rightarrow$ [`docs/api-reference.md`](./api-reference.md) $\rightarrow$ [`docs/attribution.md`](./attribution.md).
