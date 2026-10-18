# Parakh REST API Reference Specification

This specification provides the authoritative reference for all HTTP endpoints exposed by the Parakh API service (`@parakh/api`). All requests and responses are strictly validated against shared domain contracts in `@parakh/contracts`.

---

## Base URLs

- **Local Development:** `http://localhost:3000`
- **Render Production:** `https://parakh-api-kyyz.onrender.com`

---

## Global Headers & Error Envelope

All error responses adhere to the standard JSON envelope:

```json
{
  "status": "error",
  "code": "ERROR_CODE_STRING",
  "message": "Human-readable explanation of error",
  "errors": []
}
```

Standard Headers:
- `Content-Type: application/json`
- `X-Report-Token: <token>` (Required for privileged report access and deletion)
- `X-Run-Id: <uuid>` (Internal run correlation)
- `X-Provenance-Token: <token>` (Cryptographic signature verifying server-issued run provenance)

---

## 1. Health & Diagnostics

### `GET /healthz`
Process liveness probe for container orchestrators and Render health monitors.
- **Auth:** Public
- **Response 200 OK:**
```json
{
  "status": "ok",
  "service": "parakh-api",
  "timestamp": "2026-10-18T18:00:00.000Z",
  "uptime": 1420.5
}
```

### `GET /api/health`
Comprehensive subsystem diagnostic probe reporting database connection, model provider, and contract versions.
- **Auth:** Public
- **Response 200 OK:**
```json
{
  "status": "ok",
  "service": "parakh-api",
  "timestamp": "2026-10-18T18:00:00.000Z",
  "version": "0.1.0",
  "contractsVersion": "0.1.0",
  "environment": "production",
  "truthfulReporting": true,
  "modelProvider": "google",
  "isMockModel": false,
  "mastra": { "initialized": true },
  "storage": {
    "connected": true,
    "mode": "mongodb-atlas",
    "isPersistent": true,
    "durableStorageAvailable": true
  }
}
```

### `GET /api/health/mongodb`
Deep probe verifying active MongoDB Atlas TLS 1.3 connectivity, cipher negotiation, and round-trip ping latency.
- **Auth:** Public
- **Response 200 OK:**
```json
{
  "connected": true,
  "mode": "mongodb-atlas",
  "database": "parakh",
  "pingMs": 42,
  "tlsVersion": "TLSv1.3",
  "collections": ["reports"]
}
```

---

## 2. Opportunity Extraction

### `POST /api/opportunity/text`
Extracts structured technical requirements from raw client brief text or RFP descriptions using Google AI Studio / Gemma.
- **Auth:** Public
- **Request Body:**
```json
{
  "text": "We need a senior full-stack engineer to build a high-performance React dashboard with MongoDB Atlas and automated test suites...",
  "title": "Senior Full-Stack Engineer Brief"
}
```
- **Response 200 OK:**
```json
{
  "status": "success",
  "opportunity": {
    "id": "opp-9b1deb4d",
    "title": "Senior Full-Stack Engineer Brief",
    "createdAt": "2026-10-18T18:00:00.000Z"
  },
  "extraction": {
    "requirements": [
      {
        "id": "req-1",
        "category": "Frontend",
        "title": "React Dashboard Architecture",
        "description": "Demonstrated React component development with responsive layouts",
        "priority": "required"
      }
    ]
  },
  "metadata": {
    "modelProvider": "google",
    "model": "gemini-3.8-flash"
  }
}
```

### `POST /api/opportunity/pdf`
Accepts a multipart file upload (`application/pdf`) and parses the text using magic-byte inspection before running structured extraction.
- **Form Data:** `file` (Binary PDF file, max 10 MB)
- **Response 200 OK:** Same structure as `/api/opportunity/text`.

---

## 3. Repository Inspection

### `POST /api/repository/inspect`
Validates a public GitHub repository URL against SSRF boundary filters, verifies the default branch, and resolves the immutable 40-character commit SHA.
- **Auth:** Public
- **Request Body:**
```json
{
  "url": "https://github.com/puneetnith28/Parakh",
  "ref": "main"
}
```
- **Response 200 OK:**
```json
{
  "canonicalUrl": "https://github.com/puneetnith28/Parakh",
  "metadata": {
    "owner": "puneetnith28",
    "repo": "Parakh",
    "defaultBranch": "main",
    "stars": 12,
    "forks": 2,
    "isPrivate": false
  },
  "pinnedRevision": {
    "sha": "bc5abd7d9a18bf97b5e43a9f0292c300895a9d61",
    "ref": "refs/heads/main"
  }
}
```

---

## 4. Assessment Execution

### `POST /api/analysis/run`
Executes the full 5-stage assessment workflow: AST ingestion, lexical candidate retrieval, grounded LLM evaluation, and strict citation validation.
- **Auth:** Public
- **Request Body:**
```json
{
  "repositoryUrl": "https://github.com/puneetnith28/Parakh",
  "ref": "main",
  "requirements": [
    {
      "id": "req-1",
      "category": "Architecture",
      "title": "Zod Schema Validation",
      "description": "Validation of external payloads using Zod contracts",
      "priority": "required"
    }
  ]
}
```
- **Response 200 OK:**
```json
{
  "status": "success",
  "runId": "6c84f67c-9b1b-4d4b-972f-5f8a0a996bc5",
  "provenanceToken": "signed-hmac-sha256-token",
  "report": {
    "id": "rep-7f8e9a1b",
    "repository": {
      "url": "https://github.com/puneetnith28/Parakh",
      "commitSha": "bc5abd7d9a18bf97b5e43a9f0292c300895a9d61"
    },
    "summary": {
      "totalRequirements": 1,
      "demonstrated": 1,
      "partiallyDemonstrated": 0,
      "needsReview": 0,
      "notDemonstrated": 0
    },
    "evaluations": [
      {
        "requirementId": "req-1",
        "status": "demonstrated",
        "citations": [
          {
            "filePath": "packages/contracts/src/report.ts",
            "startLine": 12,
            "endLine": 35,
            "snippet": "export const AssessmentReportSchema = z.object({...});"
          }
        ]
      }
    ]
  }
}
```

---

## 5. Reports & Persistence

### `POST /api/reports`
Persists a cryptographically verified assessment report into MongoDB Atlas.
- **Headers:** `X-Run-Id`, `X-Provenance-Token`
- **Request Body:** Validated `AssessmentReport` payload.
- **Response 201 Created:**
```json
{
  "status": "success",
  "reportId": "rep-7f8e9a1b",
  "viewToken": "256-bit-url-safe-token",
  "shareUrl": "https://parakh-web.onrender.com/reports/rep-7f8e9a1b?token=256-bit-url-safe-token"
}
```

### `GET /api/reports/:id`
Retrieves a persisted assessment report.
- **Headers or Query:** `X-Report-Token: <token>` or `?token=<token>`
- **Response 200 OK:** Returns complete `AssessmentReport` document.

### `DELETE /api/reports/:id`
Cascades deletion of a persisted report and its cached metadata.
- **Headers:** `X-Report-Token: <token>`
- **Response 204 No Content**

### `POST /api/reports/:id/audio`
Generates a synthesized executive audio briefing via ElevenLabs.
- **Headers:** `X-Report-Token: <token>`
- **Response 200 OK:** Binary `audio/mpeg` streaming response (or fallback payload if unconfigured).

---

## 6. Integration Status Ledger

### `GET /api/integrations/status`
Exposes the honest, transparent operational status of all third-party integrations and sponsor technology tracks.
- **Auth:** Public
- **Response 200 OK:**
```json
{
  "google": { "active": true, "model": "gemini-3.8-flash" },
  "mongodb": { "active": true, "cluster": "cluster0.6sgehjh.mongodb.net" },
  "sentry": { "active": true, "tracing": true },
  "elevenlabs": { "active": true },
  "render": { "active": true }
}
```
