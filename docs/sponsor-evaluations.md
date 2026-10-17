# Secondary Sponsor Architectural Evaluation & Isolation Boundaries

- **Date:** 2026-10-17
- **Scope:** Backboard (Context Memory), ElevenLabs (Audio Narration), DigitalOcean (Worker Hosting)
- **Status:** Integrated via Non-Blocking Adapters Behind Feature Flags

---

## 1. Architectural Philosophy: Strict Non-Blocking Isolation

In accordance with Parakh's core engineering principles:
1. **Core Independence:** Parakh's evidence-grounded capability assessment must succeed deterministically using only its primary stack (Fastify, TypeScript, Babel AST, MongoDB Atlas, Google Gemma).
2. **Graceful Fallbacks:** The failure, network timeout, rate-limiting, or omission of any secondary sponsor integration must never fail, delay, or invalidate candidate assessment generation.
3. **Explicit Opt-in via Feature Flags:** Secondary integrations are managed via feature flags and environment variables (`getSecondaryFeatureFlags()`).

---

## 2. Sponsor Evaluations

### A. ElevenLabs (Voice Synthesis & Audio Summaries)
- **Role:** Generates synthesized speech narrations of candidate capability executive summaries for accessibility, recruiter audio reviews, and mobile dashboards.
- **Evaluation:** High user delight and accessibility benefit. However, audio synthesis introduces network latency and token usage costs.
- **Architecture:** Implemented in `packages/integrations/src/secondary/elevenlabs.ts`. Summaries are capped at 1,000 characters to prevent quota exhaustion. If `ELEVENLABS_API_KEY` is omitted, the audio generation step gracefully reports skipped without error.

### B. Backboard (Context Memory)
- **Role:** Cross-assessment candidate memory tracking (e.g., historical score progression, repeat assessments across repositories).
- **Evaluation:** Valuable for longitudinal tracking; however, MongoDB Atlas already provides reliable primary document persistence.
- **Architecture:** Implemented in `packages/integrations/src/secondary/backboard.ts` as a secondary telemetry/memory sync event dispatched after primary persistence.

### C. DigitalOcean (Worker Compute)
- **Role:** Background evaluation runner on dedicated compute droplets.
- **Evaluation:** Useful for distributed batch tasks. For the hackathon and primary production deployments, Render combined with containerized multi-stage Dockerfiles provides lower operational overhead.
- **Architecture:** Implemented in `packages/integrations/src/secondary/digitalocean.ts`. When `DIGITALOCEAN_ACCESS_TOKEN` is absent, the adapter automatically resolves to the primary container environment (`provider: "render"`).

---

## 3. Configuration & Feature Flags

| Feature Flag | Environment Variable | Default Behavior |
|---|---|---|
| `enableElevenLabsAudio` | `ENABLE_ELEVENLABS_AUDIO=true` or `ELEVENLABS_API_KEY` | Enabled if key provided, otherwise skipped |
| `enableBackboardMemory` | `ENABLE_BACKBOARD_MEMORY=true` or `BACKBOARD_API_KEY` | Enabled if key provided, otherwise skipped |
| `enableDigitalOceanWorkers` | `ENABLE_DIGITALOCEAN_WORKERS=true` or `DIGITALOCEAN_ACCESS_TOKEN` | Defaults to Render / Docker local |
