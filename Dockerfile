# Production Multi-Stage Dockerfile for Parakh
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/contracts/package*.json ./packages/contracts/
COPY packages/evidence/package*.json ./packages/evidence/
COPY packages/assessment/package*.json ./packages/assessment/
COPY packages/integrations/package*.json ./packages/integrations/

RUN npm ci

# Copy full repository source
COPY . .

# Build contracts, libraries, and application packages
RUN npm run build --workspace=@parakh/contracts && \
    npm run build --workspace=@parakh/api && \
    npm run build --workspace=@parakh/web

# Production Runner Stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/packages ./packages

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/healthz || exit 1

CMD ["node", "apps/api/dist/server.js"]
