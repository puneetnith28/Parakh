# Parakh System Architecture

## 1. High-Level System Architecture

Parakh coordinates evidence extraction, retrieval, model-guided reasoning, and deterministic verification across modular services.

```text
+-------------------------------------------------------------------------+
|                               React Frontend                            |
|                 (Opportunity brief input & Evidence Map UI)              |
+------------------------------------+------------------------------------+
                                     |  HTTP REST / JSON
                                     v
+-------------------------------------------------------------------------+
|                            Express API Gateway                          |
|             (Input sanitization, route dispatch, SSRF defenses)         |
+------------------+------------------------------------+-----------------+
                   |                                    |
                   v                                    v
+----------------------------------+   +----------------------------------+
|   Opportunity Extraction Engine  |   |   GitHub Repository Ingestor     |
|   - PDF sandboxed parser         |   |   - Commit SHA pinning           |
|   - Gemma structured extraction  |   |   - Bounded tree scanner         |
|   - Zod validation & retry       |   |   - Path allowlist/denylist      |
+------------------+---------------+   +----------------+-----------------+
                   |                                    |
                   | Requirements                       | Evidence Records
                   +-----------------+------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                         Retrieval & Indexing Layer                      |
|             (Syntax-aware chunking, lexical BM25, source ranker)        |
+------------------------------------+------------------------------------+
                                     | Top-K Candidate Snippets
                                     v
+-------------------------------------------------------------------------+
|                  Mastra Agent Assessment Workflow (Gemma)               |
|            - Hardened system prompt (untrusted repository content)      |
|            - Bounded evidence universe (candidate IDs only)             |
|            - Status proposal (Demonstrated / Partial / Not Found)       |
+------------------------------------+------------------------------------+
                                     | Proposed Assessments & Citations
                                     v
+-------------------------------------------------------------------------+
|                 Deterministic Citation Validation Engine                |
|            - Verifies candidate ID existence                            |
|            - Checks file path & 1-indexed line ranges                   |
|            - Applies conservative status downgrade rules                |
+------------------------------------+------------------------------------+
                                     | Verified Evidence Map
                   +-----------------+------------------+
                   |                                    |
                   v                                    v
+----------------------------------+   +----------------------------------+
|      MongoDB Atlas Persistence   |   |   Report Exporter & Action Plan  |
|      (Bounded snippets & runs)   |   |   (Self-contained HTML / Print)  |
+----------------------------------+   +----------------------------------+
```

## 2. Core Architectural Invariants

1. **Deterministic Verification over Model Hallucination:** The model may propose candidate matches, but deterministic code validates that every referenced file path, commit SHA, and line range exists in the actual fetched repository snapshot.
2. **Untrusted Code Security Boundary:** Scanned repository code is treated strictly as static data. Parakh never invokes `eval`, `exec`, child processes, or package managers (`npm install`, `pip install`) on scanned repository contents.
3. **SSRF Guard:** All repository URLs are validated against strict canonical GitHub patterns. Arbitrary external hosts, loopback addresses (`127.0.0.1`), and cloud metadata endpoints are strictly blocked.
4. **Data Minimization:** Parakh stores only bounded snippets, URLs, and metadata. Full repository archives or uploaded document files are discarded post-analysis.
