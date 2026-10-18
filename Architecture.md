# Parakh Architecture & Technical Design Specification

> **Prove Your Skills. Back Every Claim.**  
> Parakh is an open-source, evidence-grounded developer capability assessment platform. It bridges the trust gap between software engineers and engineering hiring teams by evaluating public GitHub repositories against client opportunity briefs using strict deterministic code citations, commit pinning, and conservative scoring rules.

---

## Table of Contents
1. [Core Architectural Philosophy](#1-core-architectural-philosophy)
2. [General System Architecture Diagrams](#2-general-system-architecture-diagrams)
   - [2.1 End-to-End System & Monorepo Topology](#21-end-to-end-system--monorepo-topology)
   - [2.2 Capability Assessment & Citation Verification Pipeline](#22-capability-assessment--citation-verification-pipeline)
   - [2.3 Defense-in-Depth Security & Privacy Architecture](#23-defense-in-depth-security--privacy-architecture)
3. [Sponsor Integration Architecture Diagrams](#3-sponsor-integration-architecture-diagrams)
   - [3.1 Google AI Studio & Google Gemma (Core Reasoning LLM)](#31-google-ai-studio--google-gemma-core-reasoning-llm)
   - [3.2 MongoDB Atlas (Document Store & Automated TTL Lifecycle)](#32-mongodb-atlas-document-store--automated-ttl-lifecycle)
   - [3.3 Sentry (Agent Tracing & Privacy-Preserving Observability)](#33-sentry-agent-tracing--privacy-preserving-observability)
   - [3.4 ElevenLabs (Multimodal Audio & Executive Briefings)](#34-elevenlabs-multimodal-audio--executive-briefings)
   - [3.5 Render (Cloud Infrastructure & Automated IaC Deployments)](#35-render-cloud-infrastructure--automated-iac-deployments)
   - [3.6 Typed Agent Workflows (Mastra Architectural Pattern)](#36-typed-agent-workflows-mastra-architectural-pattern)
   - [3.7 GitHub Copilot (AI-Assisted Pair Programming Workflow)](#37-github-copilot-ai-assisted-pair-programming-workflow)
   - [3.8 Secondary & Boundary Integrations (Isolation Architecture)](#38-secondary--boundary-integrations-isolation-architecture)
4. [Source Code Linkages & Verification Matrix](#4-source-code-linkages--verification-matrix)

---

## 1. Core Architectural Philosophy

Parakh is designed around three strict non-negotiable principles:

1. **Deterministic Grounding Over Generative Hallucination:**  
   LLMs are strictly confined to structured extraction and candidate ranking. Every capability assertion must be backed by a deterministic code citation (`filePath`, `startLine`, `endLine`) validated against the immutable commit tree. If an LLM cites nonexistent files or hallucinated line numbers, the validator strictly rejects it and flags the requirement as `Needs Review`.
2. **Conservative Status Scoring:**  
   - **Demonstrated:** Valid code citation with test evidence in the target repo.
   - **Partially Demonstrated:** Code exists, but automated tests or documentation are absent.
   - **Needs Review:** Disputed or unverifiable claims.
   - **Not Demonstrated in Supplied Evidence:** Transparent admission that the skill is not demonstrated in the analyzed repository.
3. **Strict Boundary Isolation for External Services:**  
   The core capability assessment engine operates 100% independently. If secondary providers (voice synthesis, external memory, or third-party search) experience downtime or missing keys, the core assessment completes without disruption.

---

## 2. General System Architecture Diagrams

### 2.1 End-to-End System & Monorepo Topology

This diagram illustrates the full application layout across monorepo packages, frontend SPA, backend services, and cloud integrations.

```mermaid
graph TB
    subgraph Clients["Clients & Users"]
      Dev["Candidate Developer / Agency"]
      Recruiter["Engineering Manager / Client"]
    end

    subgraph Frontend["Frontend SPA (@parakh/web)"]
      UI["React 18 + Vite Web App"]
      Router["Client-Side SPA Routing"]
      Store["State Management & LocalStorage"]
      Player["AudioBriefingPlayer Widget"]
      MapUI["Interactive Evidence Map"]
    end

    subgraph Backend["Backend API Service (@parakh/api)"]
      Server["Express 4 + Node.js 20/24"]
      Sec["Security Middleware (Helmet + CORS + RateLimit)"]
      MastraEngine["Typed Agent Workflow Orchestrator"]
      SentryHook["Sentry Agent Tracing & Scrubber"]
    end

    subgraph Packages["Monorepo Workspace Packages"]
      Contracts["@parakh/contracts<br/>(Zod Schemas & Types)"]
      Assessment["@parakh/assessment<br/>(Deduplication + BM25 + Citation Validator)"]
      Evidence["@parakh/evidence<br/>(SSRF Guard + AST Parsing + Git Ingestion)"]
      Integrations["@parakh/integrations<br/>(Provider Adapters & QuotaGuard)"]
    end

    subgraph Cloud["External Cloud Services & Sponsors"]
      GitHub["GitHub REST API & Public Repositories"]
      GoogleAI["Google AI Studio / Gemma 2 API"]
      MongoAtlas[("MongoDB Atlas Database<br/>(TTL & Compound Indexes)")]
      ElevenLabs["ElevenLabs Voice Synthesis API"]
      SentryCloud["Sentry Cloud Observability"]
      RenderCloud["Render Cloud PaaS (API + Static Site)"]
    end

    Dev -->|Accesses| UI
    Recruiter -->|Inspects Report| UI
    UI -->|HTTP / REST API| Server
    Server -->|Uses| Contracts
    Server -->|Orchestrates| MastraEngine
    MastraEngine -->|Invokes| Assessment
    MastraEngine -->|Ingests via| Evidence
    MastraEngine -->|Calls Models via| Integrations
    Evidence -->|Scrapes Trees & Blobs| GitHub
    Integrations -->|Grounded LLM Reasoning| GoogleAI
    Integrations -->|Voice Synthesis| ElevenLabs
    Server -->|Persists Reports| MongoAtlas
    Server -->|Agent Tracing Spans| SentryCloud
    RenderCloud -->|Deploys & Hosts| Backend
    RenderCloud -->|Deploys & Serves| Frontend
```

---

### 2.2 Capability Assessment & Citation Verification Pipeline

This flowchart documents the 6-stage lifecycle from raw brief ingestion to cryptographic sealing and persistent storage.

```mermaid
flowchart TD
    subgraph Stage1["1. Opportunity Ingestion"]
      RawBrief["Client Brief / PDF RFP"] --> Extractor["Structured Extraction Engine"]
      Extractor -->|Google Gemma 2 / Gemini| StructReqs["Structured Requirements (JSON)"]
    end

    subgraph Stage2["2. Human-in-the-Loop Review"]
      StructReqs --> Editor["Requirements Editor UI"]
      Editor -->|Adjust Categories / Priorities / Custom Criteria| ConfirmedReqs["Confirmed Assessment Criteria"]
    end

    subgraph Stage3["3. Repository Ingestion & Defense"]
      RepoURL["GitHub Repo URL"] --> SSRF["SSRF Boundary Protection"]
      SSRF --> TreeScan["Repository Tree Scan"]
      TreeScan --> DenyFilter["Denylist Filter (.git, vendor, binaries, secrets)"]
      DenyFilter --> AST["AST Parsing & Text Chunking"]
      DenyFilter --> Pinner["Commit SHA Pinning (Immutable 40-char SHA)"]
    end

    subgraph Stage4["4. Candidate Evidence Retrieval"]
      ConfirmedReqs & AST --> Ranker["Multi-Stage Retrieval Engine"]
      Ranker --> BM25["BM25 Lexical Matching"]
      Ranker --> Cosine["Cosine Semantic Candidate Selection"]
      BM25 & Cosine --> Candidates["Bounded Candidate Universe"]
    end

    subgraph Stage5["5. Grounded Evaluation & Validation"]
      Candidates & ConfirmedReqs --> ModelEval["Qualitative Synthesis (Gemma 2)"]
      ModelEval --> RawClaims["Raw Capability Assertions"]
      RawClaims --> ValEngine["Strict Citation Validator"]
      ValEngine --> Rules{"Citation Rules"}
      Rules -->|Exact Code Line Interval Verified| Demonstrated["Demonstrated (Emerald)"]
      Rules -->|Doc-Only Evidence / No Unit Tests| Partial["Partially Demonstrated (Amber)"]
      Rules -->|Invalid Citation / Hallucination| Downgrade["Needs Review (Blue)"]
      Rules -->|Zero Candidate Evidence in Repo| Missing["Not Demonstrated (Slate)"]
    end

    subgraph Stage6["6. Cryptographic Provenance & Persistence"]
      Demonstrated & Partial & Downgrade & Missing --> Signer["HMAC / SHA-256 Provenance Signer"]
      Pinner --> Signer
      Signer --> SealedReport["Cryptographically Sealed Report"]
      SealedReport --> Atlas[("MongoDB Atlas (TTL Lifecycle)")]
      SealedReport --> Token["256-Bit ViewToken Shareable Link"]
    end
```

---

### 2.3 Defense-in-Depth Security & Privacy Architecture

This diagram illustrates the perimeter defense, data minimization, and secret scrubbing safeguards applied across every layer.

```mermaid
flowchart LR
    subgraph Untrusted["Untrusted Ingress"]
      UserReq["Client Request"]
      RepoInput["Repo URL / Payload"]
    end

    subgraph Perimeter["Perimeter Defense Layer"]
      Helmet["Helmet Middleware<br/>(X-Frame, MIME Sniffing, CORP)"]
      CORS["Dynamic CORS Guard<br/>(onrender.com + parakh.tech)"]
      RateLimit["Sliding Window Rate Limiter<br/>(10 req/min for compute)"]
      SSRFGuard["SSRF Network Boundary<br/>(Blocks 169.254, 127.0.0.1, 10.0/8, 172.16/12, 192.168/16)"]
    end

    subgraph Minimization["Data Minimization & Redaction"]
      Denylist["Ingestion Denylist<br/>(Filters .env, secrets, lockfiles, node_modules)"]
      Scrubber["Secret Scrubber<br/>(Redacts tokens, API keys, passwords from logs)"]
      SentryRedactor["Sentry BeforeSend Hook<br/>(Strips source code buffers & truncates prompts <= 300 chars)"]
    end

    subgraph Cryptographic["Cryptographic Proof & Storage"]
      SHAPin["Commit SHA Pinning<br/>(Locks evidence to immutable git tree)"]
      HMAC["SHA-256 HMAC Signer<br/>(Tamper-evident canonical report digest)"]
      MongoTLS[("MongoDB Atlas<br/>(TLS 1.3 In-Transit + Encrypted At-Rest)")]
    end

    UserReq --> Helmet --> CORS --> RateLimit
    RepoInput --> SSRFGuard --> Denylist
    Denylist --> Scrubber
    Scrubber --> SentryRedactor
    Denylist --> SHAPin --> HMAC --> MongoTLS
```

---

## 3. Sponsor Integration Architecture Diagrams

---

### 3.1 Google AI Studio & Google Gemma (Core Reasoning LLM)

- **Role:** Powers structured requirement extraction from raw text/PDFs and qualitative capability synthesis.
- **Architectural Guardrails:** Temperature clamped to `0.1` to prevent hallucinations, `QuotaGuard` implements leaky-bucket rate limiting (15 RPM cap with 800ms spacing and randomized jitter).
- **Model Adaptability:** Defaults to `gemini-3.8-flash` via Google AI Studio API (`responseMimeType: "application/json"`). Natively supports open-weights Gemma models (`gemma-2-9b-it`, `gemma-2-27b-it`) by cleanly omitting the `responseMimeType` parameter to avoid HTTP 400 parameter errors.

```mermaid
sequenceDiagram
    autonumber
    actor Engine as Parakh Assessment Engine
    participant Guard as QuotaGuard (Rate Limiter & Jitter)
    participant Adapter as Gemma/Gemini Adapter
    participant GoogleAPI as Google AI Studio API (generativelanguage.googleapis.com)
    participant Fallback as Deterministic AST Rule Scorer

    Engine->>Guard: Request Structured Inference(Prompt, Schema)
    Guard->>Guard: Check Leaky Bucket (15 RPM cap, 800ms minimum spacing)
    alt Rate limit reached
      Guard-->>Guard: Apply Exponential Backoff + Randomized Jitter
    end
    Guard->>Adapter: Dispatch Model Request
    alt Model == gemini-3.8-flash (Default)
      Adapter->>GoogleAPI: POST /v1beta/models/gemini-3.8-flash:generateContent<br/>(temperature=0.1, responseMimeType="application/json")
    else Model == gemma-2-9b-it / gemma-2-27b-it
      Adapter->>GoogleAPI: POST /v1beta/models/gemma-2-9b-it:generateContent<br/>(temperature=0.1, omit responseMimeType to prevent HTTP 400)
    end

    alt Successful Response
      GoogleAPI-->>Adapter: Return Structured JSON Tokens
      Adapter->>Adapter: Validate response against Zod contracts
      Adapter-->>Engine: Structured Requirement Assessment
    else Timeout / Network Failure / HTTP 5xx
      GoogleAPI-->>Adapter: Error or 8s Timeout
      Adapter->>Fallback: Trigger Local AST Rule Fallback
      Fallback-->>Engine: Deterministic Syntax & Metric Evaluation (Non-blocking)
    end
```

---

### 3.2 MongoDB Atlas (Document Store & Automated TTL Lifecycle)

- **Role:** Primary cloud persistence for assessment reports with native TTL document lifecycle management, compound query indexing, and TLS 1.3 encryption.
- **Resilience:** Implements automatic URI sanitization (stripping quotes and accidental prefixes) and includes an active health probe (`GET /api/health/mongodb`) validating cipher suites and round-trip ping latency.

```mermaid
graph TD
    subgraph App["Parakh Backend API (@parakh/api)"]
      Route["/api/reports & /api/health/mongodb"]
      Manager["MongoConnectionManager (Singleton)"]
      Sanitizer["URI Sanitizer (Quote & Prefix Stripper)"]
      Store["MongoReportStore Implementation"]
    end

    subgraph Atlas["MongoDB Atlas Cloud Cluster (cluster0.6sgehjh.mongodb.net)"]
      TLS["TLS 1.3 / Strict Cipher Negotiation"]
      DB[("Database: 'parakh'")]
      subgraph Collection["Collection: 'reports'"]
        Doc["Document Schema (Report.ts)"]
        IdxCompound["Compound Tenant Index<br/>{ reportId: 1, viewToken: 1 } (Unique, O(1))"]
        IdxTTL["Native TTL Expiration Index<br/>{ expiresAt: 1 }, expireAfterSeconds: 0"]
      end
    end

    subgraph Memory["Graceful Fallback Mode"]
      MemStore["MemoryReportStore (100% Stateless)"]
    end

    Route --> Manager
    Manager --> Sanitizer
    Sanitizer -->|Normalized mongodb+srv://| TLS
    TLS --> DB
    DB --> Collection
    Doc --- IdxCompound
    Doc --- IdxTTL
    Manager -.->|If MONGODB_URI absent or Atlas unreachable| MemStore
```

---

### 3.3 Sentry (Agent Tracing & Privacy-Preserving Observability)

- **Role:** End-to-end distributed agent tracing instrumented directly across every step of the assessment workflow.
- **Data Minimization:** `sentryBeforeSend` redacts repository source buffers and truncates LLM prompts to 300 characters, guaranteeing zero candidate code or credential leakage to third-party telemetry.

```mermaid
sequenceDiagram
    autonumber
    participant Pipeline as Assessment Workflow
    participant Sentry as Sentry Agent Tracing SDK
    participant Scrubber as Data Minimization Scrubber (sentryBeforeSend)
    participant Cloud as Sentry Cloud (o0.ingest.sentry.io)

    Pipeline->>Sentry: Start Transaction: "assessment.workflow"
    
    rect rgb(240, 248, 255)
      Note over Pipeline,Sentry: Step 1: Repository Ingestion
      Pipeline->>Sentry: Start Span: "assessment.repo_ingestion"
      Pipeline-->>Sentry: Finish Span (duration, fileCount, commitSha)
    end

    rect rgb(240, 255, 240)
      Note over Pipeline,Sentry: Step 2: Evidence Retrieval
      Pipeline->>Sentry: Start Span: "assessment.evidence_retrieval"
      Pipeline-->>Sentry: Finish Span (candidateCount, bm25Scores)
    end

    rect rgb(255, 250, 240)
      Note over Pipeline,Sentry: Step 3: Model Inference & Citation Check
      Pipeline->>Sentry: Start Span: "assessment.model_inference"
      Pipeline-->>Sentry: Finish Span (modelProvider, latency)
      Pipeline->>Sentry: Start Span: "assessment.citation_validation"
      Pipeline-->>Sentry: Finish Span (validCitations, rejectedCount)
    end

    Pipeline->>Sentry: Close Transaction & Flush
    Sentry->>Scrubber: Intercept Event before Network Egress
    Scrubber->>Scrubber: 1. Scrub Database Passwords, Tokens & Secrets
    Scrubber->>Scrubber: 2. Redact Raw Source File Record Buffers
    Scrubber->>Scrubber: 3. Truncate LLM Prompts to <= 300 Characters
    Scrubber->>Cloud: Egress Privacy-Preserved Tracing Envelope
```

---

### 3.4 ElevenLabs (Multimodal Audio & Executive Briefings)

- **Role:** Converts verified assessment summaries into synthesized audio briefings for mobile dashboards and recruiter reviews.
- **Isolation:** Operates via authenticated `POST /api/reports/:id/audio` with viewToken verification, strict 800-character budgeting, and graceful degradation if the API key is not configured.

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Hiring Manager (Browser)
    participant UI as AudioBriefingPlayer Component
    participant API as Parakh API (POST /api/reports/:id/audio)
    participant Service as AudioBriefingService
    participant ElevenLabs as ElevenLabs TTS API (api.elevenlabs.io)

    User->>UI: Click "Play Executive Briefing"
    UI->>API: HTTP POST /api/reports/:id/audio<br/>(Header: x-view-token)
    API->>API: Verify ViewToken & Retrieve Verified Report
    API->>Service: Generate Briefing Text (Summary + Top Proofs)
    Service->>Service: Enforce Strict 800-Character Budget
    alt ELEVENLABS_API_KEY Configured
      Service->>ElevenLabs: POST /v1/text-to-speech/21m00Tcm4TlvDq8ikWAM<br/>(model_id: "eleven_monolingual_v1", voice_settings)
      ElevenLabs-->>Service: Binary MPEG Audio Stream
      Service-->>API: Buffer Audio Payload
      API-->>UI: HTTP 200 (audio/mpeg)
      UI->>User: Play Synthetic Voice Narration with Waveform
    else ELEVENLABS_API_KEY Missing
      Service-->>API: Report Degraded / Disabled Status
      API-->>UI: HTTP 200 (status: "disabled", reason: "KEY_NOT_CONFIGURED")
      UI->>User: Display Graceful Degradation Notice (Audio Optional)
    end
```

---

### 3.5 Render (Cloud Infrastructure & Automated IaC Deployments)

- **Role:** Continuous deployment and multi-service orchestration configured via `render.yaml` Infrastructure as Code.
- **Topology:** Web service `parakh-api` hosting the Node.js API with health checks, coupled with static site `parakh-web` hosting the React Vite SPA. Includes automated hostname resolution (`normalizeApiBaseUrl()`) mapping bare slugs to fully qualified `.onrender.com` domains.

```mermaid
graph TB
    subgraph GitRepo["GitHub Repository (origin/main)"]
      Code["Source Code & IaC Specification"]
      RenderSpec["render.yaml (Blueprint Specification)"]
    end

    subgraph RenderPlatform["Render Cloud Infrastructure"]
      subgraph WebService["Backend Service: parakh-api (Node.js Web Service)"]
        APIBuild["Build: npm install && npm run build --workspace=@parakh/contracts && npm run build --workspaces"]
        APIRun["Start: node apps/api/dist/server.js"]
        APIHealth["Liveness Probe: GET /healthz (200 OK)"]
        APICors["CORS Policy: Allows *.onrender.com & parakh.tech"]
      end

      subgraph StaticSite["Frontend Service: parakh-web (Static Site)"]
        StaticBuild["Build: npm install && npm run build --workspace=@parakh/contracts && npm run build --workspace=@parakh/assessment && npm run build --workspace=@parakh/web"]
        StaticDist["Publish Directory: ./apps/web/dist"]
        StaticRewrite["SPA Rewrites: /* -> /index.html"]
        ApiUrlResolver["normalizeApiBaseUrl() (Maps parakh-api-kyyz to full FQDN)"]
      end
    end

    subgraph Public["Public Internet Access"]
      Browser["Web Browser (End User)"]
    end

    Code & RenderSpec --> WebService & StaticSite
    Browser -->|HTTPS Request| StaticSite
    StaticSite -->|Loads Assets| Browser
    Browser -->|"API Calls (CORS Authorized)"| WebService
```

---

### 3.6 Typed Agent Workflows (Mastra Architectural Pattern)

- **Role:** Coordinates multi-phase candidate evaluation through typed step contracts and isolated execution boundaries.
- **Pattern:** Native TypeScript implementation inspired by Mastra architecture, ensuring type safety between extraction, retrieval, reasoning, and citation validation without external runtime dependencies.

```mermaid
flowchart TD
    subgraph Mastra["Typed Agent Workflow Orchestrator (Mastra Architecture)"]
      Workflow["AssessmentWorkflow.execute(input)"]
      
      subgraph Steps["Sequential Typed Workflow Steps"]
        S1["Step 1: IngestOpportunityStep<br/>Contract: OpportunityInput -> StructuredRequirements"]
        S2["Step 2: IngestRepositoryStep<br/>Contract: RepoUrl -> SanitizedRepoUniverse"]
        S3["Step 3: RetrieveCandidatesStep<br/>Contract: (Reqs, Universe) -> CandidateSnippets"]
        S4["Step 4: InferCapabilityStep<br/>Contract: (Reqs, Candidates) -> RawAssertions"]
        S5["Step 5: ValidateCitationsStep<br/>Contract: RawAssertions -> VerifiedCitations"]
        S6["Step 6: SignReportStep<br/>Contract: VerifiedReport -> CryptographicReport"]
      end
      
      subgraph Boundary["Step Boundaries & Guarantees"]
        Zod["Zod Schema Contract Validation at Every Step Boundary"]
        Telemetry["Span Telemetry Recorded for Each Step Execution"]
        Isolation["Isolated Step Context Prevents State Pollution"]
      end
    end

    Workflow --> S1 --> S2 --> S3 --> S4 --> S5 --> S6
    S1 & S2 & S3 & S4 & S5 & S6 -.-> Zod & Telemetry & Isolation
```

---

### 3.7 GitHub Copilot (AI-Assisted Pair Programming Workflow)

- **Role:** AI-assisted development workflow used during hackathon development to accelerate AST traversal logic, Zod schema contracts, and adversarial test suites.
- **Transparency:** All AI-assisted components were subjected to human-in-the-loop review, strict type checking, and automated test gates (documented in `docs/copilot-usage.md`).

```mermaid
flowchart LR
    subgraph Copilot["GitHub Copilot AI Acceleration"]
      Prompts["Task-Specific Copilot Chat Prompts"]
      Context["Monorepo Context & AST Grammars"]
    end

    subgraph Generated["Assisted Implementation Artifacts"]
      ASTParsing["Babel AST Traversal & Source Locators"]
      ZodContracts["Strict Zod Contract Schemas"]
      AdversarialTests["Adversarial Security Test Suites (SSRF & Tamper)"]
    end

    subgraph HumanAudit["Human-in-the-Loop Audit & Verification"]
      CodeReview["Developer Code Review & Type Checking"]
      UnitTestGate["100% Passing Automated Tests (npm test)"]
      AuditDoc["Copilot Transparency Log (docs/copilot-usage.md)"]
    end

    Prompts & Context --> ASTParsing & ZodContracts & AdversarialTests
    ASTParsing & ZodContracts & AdversarialTests --> CodeReview --> UnitTestGate --> AuditDoc
```

---

### 3.8 Secondary & Boundary Integrations (Isolation Architecture)

- **Role:** Manages exploratory sponsor prototypes and non-track integrations behind strict non-blocking feature flags (`getSecondaryFeatureFlags()`).
- **Evidence Integrity Guarantee:** Exploratory adapters (such as SerpApi external documentation search) are strictly isolated with `isCandidateEvidence: false` to ensure external web results can never contaminate cryptographic candidate repository evidence.

```mermaid
graph TD
    subgraph CoreEngine["Parakh Core Engine (Always 100% Independent)"]
      Pipeline["Capability Assessment & Citation Validator"]
      AtlasStore[("MongoDB Atlas (Primary Persistence)")]
    end

    subgraph Guard["Non-Blocking Feature Flag Guard (getSecondaryFeatureFlags)"]
      FlagCheck{"Check Configured Keys & Flags"}
    end

    subgraph SecondarySponsors["Secondary Integrations & Status"]
      ElevenLabsAdapter["ElevenLabs (Voice Synthesis)<br/>Status: Fully Active Behind API Key"]
      BackboardAdapter["Backboard (Candidate Memory)<br/>Status: Exploratory Secondary Telemetry Stub"]
      DOAdapter["DigitalOcean (Compute Workers)<br/>Status: Container Blueprint (Render is Default)"]
      TigerDataAdapter["TigerData (PGVector)<br/>Status: Prototype (In-Memory Cosine Fallback)"]
      TemporalADR["Temporal (Durable Execution)<br/>Status: Architectural ADR in docs/temporal-evaluation.md"]
      SerpApiAdapter["SerpApi (Web Search)<br/>Status: DISCONNECTED BY DESIGN (Preserves Evidence Grounding)"]
    end

    Pipeline --> Guard
    Guard -->|Active Feature| ElevenLabsAdapter
    Guard -->|Non-blocking Telemetry| BackboardAdapter
    Guard -->|Worker Blueprint| DOAdapter
    Guard -->|Retrieval Prototype| TigerDataAdapter
    Guard -.->|Documented ADR| TemporalADR
    SerpApiAdapter x-.-x|BLOCKED: Cannot contaminate candidate evidence| Pipeline
    Pipeline ===> AtlasStore
```

---

## 4. Source Code Linkages & Verification Matrix

| Architecture Component | Primary Implementation Files | Verification Test Command | Status |
|:---|:---|:---|:---:|
| **Google AI Studio & Gemma** | [`packages/integrations/src/gemma/`](file:///packages/integrations/src/gemma/) | `npx tsx --test packages/integrations/src/gemma/adapter.test.ts` | **Verified Active** |
| **MongoDB Atlas** | [`apps/api/src/storage/`](file:///apps/api/src/storage/) | `npx tsx --test tests/integration/mongoLifecycleProvenance.test.ts` | **Verified Active** |
| **Sentry Agent Tracing** | [`apps/api/src/observability/`](file:///apps/api/src/observability/) | `npx tsx --test apps/api/src/observability/sentry.test.ts` | **Verified Active** |
| **ElevenLabs Audio** | [`apps/api/src/services/audioBriefingService.ts`](file:///apps/api/src/services/audioBriefingService.ts) | `npx tsx --test tests/integration/audioBriefing.test.ts` | **Verified Active** |
| **Render Cloud IaC** | [`render.yaml`](file:///render.yaml) | `curl -s https://parakh-api-kyyz.onrender.com/healthz` | **Verified Live** |
| **Mastra Pattern** | [`apps/api/src/mastra/`](file:///apps/api/src/mastra/) | `npx tsx --test apps/api/src/mastra/workflows/assessmentWorkflow.test.ts` | **Verified Active** |
| **SSRF & Security Shield** | [`packages/evidence/src/ingestion.ts`](file:///packages/evidence/src/ingestion.ts) | `npx tsx --test tests/security/ssrfSecurity.test.ts` | **Verified Active** |
| **Citation Validator** | [`packages/assessment/src/validator.ts`](file:///packages/assessment/src/validator.ts) | `npx tsx --test tests/unit/citationValidator.test.ts` | **Verified Active** |
| **Cryptographic Provenance** | [`apps/api/src/services/provenance.ts`](file:///apps/api/src/services/provenance.ts) | `npx tsx --test tests/security/tamperEvidence.test.ts` | **Verified Active** |

