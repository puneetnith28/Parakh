# Render Deployment and Production Readiness Guide

## Overview

Parakh is configured for continuous deployment on the [Render Cloud Application Platform](https://render.com) using Infrastructure-as-Code via [`render.yaml`](../render.yaml).

## Architecture

Parakh deploys as two decoupled services:

1. **`parakh-api` (Web Service)**: Node.js Express/TypeScript backend running under Node.js runtime.
   - **Build Command:** `npm install && npm run build --workspaces --if-present`
   - **Start Command:** `npm run start --workspace=@parakh/api`
   - **Liveness Probe:** `GET /healthz` (returns `200 OK` with uptime)
   - **Readiness Probe:** `GET /api/ready` (validates database persistence in production)
   - **Diagnostic Endpoint:** `GET /api/health/mongodb` (TLS round-trip ping)

2. **`parakh-web` (Static Site)**: React + Vite Single-Page Application.
   - **Build Command:** `npm install && npm run build --workspace=@parakh/contracts && npm run build --workspace=@parakh/web`
   - **Publish Directory:** `./apps/web/dist`
   - **SPA Routing:** Rewrite rule `/* -> /index.html`

## Environment Variables Reference

| Variable | Target Service | Required? | Source / Default | Description |
|---|---|---|---|---|
| `NODE_ENV` | `parakh-api` | Yes | `production` | Production environment flag |
| `PORT` | `parakh-api` | Yes | `3000` | Port listened to by backend server |
| `WEB_ORIGIN` | `parakh-api` | Yes | From `parakh-web` host | Allowed CORS origin (auto-prefixed with `https://`) |
| `MODEL_PROVIDER` | `parakh-api` | Yes | `google` | Model provider (`google`, `mock`, etc.) |
| `MODEL_NAME` | `parakh-api` | Yes | `gemini-3.8-flash` | Model ID (`gemini-3.8-flash` or `gemma-2-9b-it`) |
| `AI_STUDIO_API_KEY` | `parakh-api` | Production | Dashboard Secret | Google AI Studio API key |
| `MONGODB_URI` | `parakh-api` | Production | Dashboard Secret | MongoDB Atlas SRV connection string |
| `MONGODB_DATABASE` | `parakh-api` | Optional | `parakh` | Target database name |
| `SENTRY_DSN` | `parakh-api` | Optional | Dashboard Secret | Sentry agent tracing DSN |
| `ELEVENLABS_API_KEY`| `parakh-api` | Optional | Dashboard Secret | ElevenLabs voice narration API key |
| `GITHUB_TOKEN` | `parakh-api` | Optional | Dashboard Secret | GitHub API PAT for extended rate limits |
| `VITE_API_BASE_URL` | `parakh-web` | Yes | From `parakh-api` host | Backend API base URL consumed by Vite client |

## Verification and Deployment Status

- **Configuration-Only vs. Validated Live Deployment:**
  - The repository's `render.yaml`, build scripts, health probes, and CORS origins are verified and build cleanly.
  - Live deployment requires linking a GitHub repository to a live Render account and supplying valid production secrets (`AI_STUDIO_API_KEY`, `MONGODB_URI`) in the Render Dashboard.
  - In absence of live credentials during local CI, Parakh gracefully degrades to in-memory storage and mock model reasoning, while strictly refusing to start in production without credentials.
