# ADR-050 — BanzAI: Unified Same-Origin Public Interface

- **Status:** Accepted
- **Date:** 2026-07
- **See also:** ADR-041 (BanzAI as native protocol agent), ADR-031 (canonical verification routes & pre-production; `banzai.banza.network` retirement), ADR-044 (local Qwen runtime), `services/banzai-api`, `infra/banza-network/nginx`. Shipped in M2.8E.

## 1. Context

BanzAI had historically been reachable at a separate `banzai.banza.network` subdomain. A separate
public host duplicates surface, complicates TLS/DNS, and invites the model layer to be treated as a
standalone product rather than a subordinate part of the protocol website.

## 2. Decision

BanzAI is served from a **single public route** — `banza.network/banzai` — and the browser reaches the
backend **same-origin** via `POST /banzai/ask`, which nginx proxies (that one path) to the internal
`banzai-api`. The former `banzai.banza.network` subdomain is retired and 301-redirects to
`banza.network/banzai` (ADR-031). No separate public host, and the internal `llama.cpp` and PostgreSQL
are never exposed.

## 3. Consequences

- One public interface, one origin, one TLS/DNS surface; the agent is clearly part of the protocol
  website, not a standalone service.
- The chat adapter posts to a relative same-origin path only; there is no off-origin endpoint.
- Enforced by `make banzai-public-interface-check` (no `banzai.banza.network` route in active UI; the
  apex exposes `location = /banzai/ask`; the local model publishes no host port).

> **BanzAI guia; os motores verificam; a evidência prova.**
