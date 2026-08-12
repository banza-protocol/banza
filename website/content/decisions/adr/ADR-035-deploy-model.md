# ADR-035 — Deploy model: Docker Compose, pinned images, secrets outside Git

- **Status:** Proposed
- **Date:** 2026-07

## Context
The protocol infrastructure must be simple, reproducible and auditable, without leaking secrets into
version control and without a build toolchain on the production VM.

## Decision
- The stack is defined by a single **Docker Compose** file, versioned in `banza-protocol/banza`.
- Service images are built in **CI** and published to **GHCR with fixed tags** (no `:latest`); the
  VM **pulls pinned tags** (no on-VM build).
- **Secrets** live only in `/srv/banza-protocol/.env` (`chmod 600`, **not in Git**); a committed
  `.env.example` documents required variables.
- Host lifecycle via **systemd** (`banza-protocol.service` on boot; `unattended-upgrades`; `ufw`).
- Rollback = previous pinned tags + `pg_dump` taken before migrations.

## Consequences
- Reproducible, declarative deployments; clear rollback path.
- No secrets in Git; no build dependencies on the serving VM.
- Config is code (in Git); data and secrets are not.
