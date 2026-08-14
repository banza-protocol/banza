# BanzAI API — production image. Zero runtime dependencies (Node built-ins only).
# Default provider is the deterministic offline mock. Real inference is either a HOSTED
# external API (deepseek | qwen, off-host) or the internal local_qwen (llama.cpp on the
# Docker network, ADR-036) — selected via LLM_PROVIDER at deploy time. This banzai-api
# image itself never contains models, keys or GPU dependencies; the local model runs in
# the separate, sandboxed llama-local service from a read-only, git-ignored volume.
FROM node:22-alpine AS base
WORKDIR /app

# Production deps: only `pg` (M2.19G.3 onboarding persistence as banzai_rw; ADR-037/ADR-013). No
# lockfile committed; the pin is in package.json. The image still contains no models, keys or GPU deps.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8091
ENV LLM_PROVIDER=mock
ENV BANZAI_MODE=demo
EXPOSE 8091

RUN addgroup -S banza && adduser -S banza -G banza
USER banza

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=5 \
    CMD wget -qO- http://127.0.0.1:8091/health || exit 1

CMD ["node", "src/server.js"]
