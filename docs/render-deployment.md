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

## Step-by-Step Render Deployment Workflow

To deploy or reactivate Parakh on Render:

1. **Log in to Render Dashboard:** Navigate to [dashboard.render.com](https://dashboard.render.com).
2. **Create New Blueprint Instance:**
   - Click **New +** -> **Blueprint**.
   - Select and connect your repository: `puneetnith28/Parakh` (branch: `main`).
   - Render automatically parses `render.yaml` and discovers both services (`parakh-api` and `parakh-web`).
3. **Configure Required Secret Environment Variables:**
   Under `parakh-api`, supply the following secrets marked `sync: false`:
   - `AI_STUDIO_API_KEY`: Google AI Studio API key for Gemini/Gemma models.
   - `MONGODB_URI`: MongoDB Atlas connection string (`mongodb+srv://...`).
   - `SENTRY_DSN` *(Optional)*: Sentry project DSN.
   - `ELEVENLABS_API_KEY` *(Optional)*: ElevenLabs API key for executive voice synthesis.
   - `GITHUB_TOKEN` *(Optional)*: GitHub Personal Access Token to prevent unauthenticated 60 req/hr rate limits.
4. **Deploy Blueprint:**
   - Click **Apply**.
   - Render will build both services:
     - `parakh-api`: Runs `npm install && npm run build --workspaces --if-present` followed by `npm run start --workspace=@parakh/api`.
     - `parakh-web`: Runs `npm install && npm run build --workspace=@parakh/contracts && npm run build --workspace=@parakh/web` and publishes `./apps/web/dist`.
5. **Verify Service Health:**
   - Liveness: `curl -s https://<your-api-slug>.onrender.com/healthz`
   - Diagnostic: `curl -s https://<your-api-slug>.onrender.com/api/health/mongodb`
   - Integrations Status: `curl -s https://<your-api-slug>.onrender.com/api/integrations/status`

## Verification and Diagnostics

- **Routing Status (`x-render-routing: no-server`):**
  - If `curl https://parakh-web.onrender.com` returns `HTTP 404` with `x-render-routing: no-server`, the service slug is either unprovisioned, renamed, or suspended. Complete the Blueprint step above to register the slug.
- **Starter Tier Cold Starts:**
  - On Render Starter/Free plans, services spin down after 15 minutes of inactivity. Initial requests may take 30–50 seconds to boot.
- **Frontend API Base URL Normalization:**
  - `apps/web/src/config/api.ts` automatically prepends `https://` to bare hostnames emitted by Render's `property: host` reference.
