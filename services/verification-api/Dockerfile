# BANZA verification-api — production image.
# Build context = services/verification-api. Serves canonical machine routes as JSON.
FROM node:22-alpine AS base
WORKDIR /app

# Install production deps (only `pg`). No lockfile committed; pin is in package.json.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8090
EXPOSE 8090

RUN addgroup -S banza && adduser -S banza -G banza
USER banza

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -qO- http://127.0.0.1:8090/health || exit 1

CMD ["node", "src/server.js"]
