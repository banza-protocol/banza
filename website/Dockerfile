# BANZA institutional website — production image.
#
# Build context = website (this directory). The app is self-contained
# (no external markdown/reference dependency — all content lives in app/).
#
#   docker build -t banza/docs-frontend:latest website
#
# Drop-in replacement for the previous website container: standalone Next.js
# server on PORT 3005 (same service/port behind nginx for the BANZA domain).

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3005
ENV HOSTNAME=0.0.0.0

RUN addgroup -S banza && adduser -S banza -G banza

# Standalone output + static/ + public/ (standalone does not bundle public/).
COPY --from=builder --chown=banza:banza /app/.next/standalone ./
COPY --from=builder --chown=banza:banza /app/.next/static     ./.next/static
COPY --from=builder --chown=banza:banza /app/public           ./public

USER banza

EXPOSE 3005

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3005/ || exit 1

CMD ["node", "server.js"]
