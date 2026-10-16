# Parakh (परख)

> **Prove your skills. Back every claim.**  
> Open-source, evidence-grounded developer capability assessment.

Parakh helps freelance developers, students, and software agencies assess whether their existing project work credibly substantiates technical requirements found in client briefs, job postings, or RFPs.

---

## The Problem

When applying for software contracts or engineering roles, developers often make claims about their technical experience. Conversely, clients and hiring managers must sift through generic resumes, unverified cover letters, and AI-generated proposals with no proof that the candidate has built what they claim.

**Parakh inverts this paradigm:**

1. You provide a client opportunity brief or RFP (pasted text or PDF).
2. You provide a public GitHub repository showcasing your work.
3. Parakh extracts structured requirements, retrieves candidate code and tests, and performs model-assisted capability assessment.
4. Parakh generates an interactive **Evidence Map** where every demonstrated skill is backed by deterministic citations (file path, commit SHA, and 1-indexed line ranges) linking directly to GitHub.

> **Ethical Principle:** Parakh never makes unsupported claims. If evidence is ambiguous or documentation-only, Parakh classifies it as **Needs review** or **Partially demonstrated**. "Not demonstrated in supplied evidence" indicates absence of evidence in the scanned files, **not** that the developer lacks the skill.

---

## Architectural Overview

Parakh is built as a TypeScript monorepo with modular packages and services:

```text
parakh/
├── apps/
│   ├── web/                 # React + Vite + Tailwind CSS frontend
│   └── api/                 # Node.js + Express API & Mastra workflow service
├── packages/
│   ├── contracts/           # Shared Zod schemas and TypeScript domain types
│   ├── evidence/            # GitHub API ingestion, filtering, and SHA pinning
│   ├── assessment/          # Retrieval index, scoring rules, and citation validation
│   └── integrations/        # Gemma model, MongoDB Atlas, Sentry, and sponsor adapters
├── docs/                    # Architectural specifications and evaluation reports
└── tests/                   # Fixtures, unit, integration, and E2E benchmark tests
```

See [docs/architecture-overview.md](docs/architecture-overview.md) for full technical data-flow diagrams.

---

## MVP Scope & Non-Goals

### Supported in MVP

- Structured technical requirement extraction from pasted text and PDF documents.
- Interactive requirement review and editing before repository analysis.
- Safe, bounded public GitHub repository scanning (max files, max bytes, rate-limiting).
- Automatic allowlist/denylist filtering (excludes binaries, `.git`, `node_modules`, vendor code, secrets).
- Immutable commit SHA resolution for permanent evidence permalinks.
- Deterministic citation validation (verifying candidate IDs, file paths, and line offsets).
- Transparent 4-state classification: **Demonstrated**, **Partially demonstrated**, **Not demonstrated in supplied evidence**, and **Needs review**.
- Actionable gap-resolution checklists, client clarification questions, and proposal draft assistance.
- Self-contained report export (HTML/print).
- Optional MongoDB Atlas persistence with session-fallback mode.

### Explicit Non-Goals

- **No arbitrary code execution:** Scanned code is analyzed purely as text/AST data; Parakh never executes untrusted code, runs build scripts, or installs scanned dependencies.
- **No private repo crawling without OAuth:** Public repositories only for MVP.
- **No automated hiring decisions:** Parakh is an evidence tool for developers to substantiate their work, not an automated hiring filter.

---

## Getting Started

### Prerequisites

- Node.js (v20+ LTS recommended)
- npm (v10+)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/puneetnith28/Parakh.git
cd Parakh

# Install dependencies across all workspaces
npm install
```

### Running Locally

```bash
# Start both frontend and backend development servers
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

---

## License

Parakh is licensed under the [Apache License, Version 2.0](LICENSE).  
Copyright 2026 Parakh Contributors.
