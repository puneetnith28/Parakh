# Third-Party Notices & Open Source Attribution

This document accounts for all third-party dependencies, open-weight models, icon sets, and libraries used across the **Parakh** monorepo, verifying license compatibility with Apache License 2.0.

---

## 1. Project License

**Parakh** is open-source software licensed under the **Apache License, Version 2.0** (`Apache-2.0`).  
Copyright © 2026 Parakh Contributors.

A copy of the Apache-2.0 license is available in the root [LICENSE](file:///LICENSE) file.

---

## 2. Open-Weight Model Terms

### Google Gemma 2
- **Model Family:** Gemma 2 (e.g. `gemma-2-9b-it`) accessed via Google AI Studio API.
- **Provider:** Google LLC.
- **License / Terms of Use:** Governed by the [Gemma Terms of Use](https://ai.google.dev/gemma/terms).
- **Compliance Affirmation:** Parakh utilizes Gemma weights and API endpoints strictly for technical requirement analysis, code citation grounding, and developer assistance in full compliance with Google's Responsible AI Practices and Use Restrictions.

---

## 3. Direct Dependencies and Licenses

All third-party libraries utilized in Parakh carry permissive open-source licenses compatible with Apache-2.0:

| Package | Version | License | Copyright / Author | Purpose |
|---|---|---|---|---|
| `react` / `react-dom` | `^18.3.1` | MIT | Meta Platforms, Inc. | Frontend UI Component Architecture |
| `vite` | `^5.4.10` | MIT | Yuxi (Evan) You & Vite Contributors | Modern Frontend Build Tooling & Dev Server |
| `express` | `^4.21.1` | MIT | StrongLoop, Inc. & Express Contributors | Backend API Gateway & REST Endpoints |
| `zod` | `^3.23.8` | MIT | Colin McDonnell | Declarative Schema Validation & Type Contracts |
| `lucide-react` | `^0.454.0` | ISC | Lucide Project Contributors | Clean SVG UI Iconography |
| `mongodb` | `^6.10.0` | Apache-2.0 | MongoDB, Inc. | Production Atlas Document Store Client |
| `@sentry/node` / `@sentry/react` | `^8.35.0` | MIT | Functional Software, Inc. (Sentry) | Distributed Agent Tracing & Error Scrubbing |
| `tailwindcss` | `^3.4.14` | MIT | Tailwind Labs, Inc. | Utility-First CSS Framework |
| `pdf-parse` | `^1.1.1` | MIT | Adrian S. | Safe Client Brief Text Extraction from PDF |
| `typescript` | `^5.6.3` | Apache-2.0 | Microsoft Corporation | Static Type Checking & Contract Enforcement |
| `tsx` | `^4.19.1` | MIT | Hiroki Osame | Native TypeScript Execution Engine for Node.js |
| `prettier` | `^3.3.3` | MIT | Prettier Authors | Automated Code Formatting |
| `eslint` | `^9.13.0` | MIT | OpenJS Foundation | Linting & Static Code Analysis |

---

## 4. License Compatibility Matrix

- **MIT License:** Permissive license granting royalty-free rights to use, copy, modify, merge, publish, distribute, sublicense, and sell. Fully compatible with Apache-2.0.
- **ISC License:** Functionally equivalent to the two-clause BSD and MIT licenses. Fully compatible with Apache-2.0.
- **Apache-2.0 License:** Permissive license with explicit patent grants and trademark preservation. Matches Parakh's core repository license.

---

## 5. Affirmation of Integrity

1. **No Copyleft Contamination:** No GPLv2, GPLv3, AGPL, or other reciprocal copyleft codebases are linked or bundled into Parakh.
2. **No Proprietary Commercial Enclaves:** All integrated client modules are open-source and free to audit.
3. **No Stolen Assets or Unattributed Media:** All UI iconography is sourced from Lucide (ISC). All diagrams and screenshots are original vector artwork authored under Apache-2.0.
