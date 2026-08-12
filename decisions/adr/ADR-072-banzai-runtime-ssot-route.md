# ADR-072 — Public runtime SSOT route and secret-free status schema

- **Status:** Accepted
- **Date:** 2026-08
- **Milestone:** M2.19G.5C
- **Related:** ADR-051 (per-answer execution-path metadata — the per-answer analogue of this per-service
  projection), ADR-044 (local on-host inference runtime), ADR-054 (BanzAI single interface, non-decisive),
  ADR-055 (grounded synthesis), ADR-038/039 (signed root-anchored trust artifacts — deliberately a
  *different* namespace from this volatile telemetry)

---

## Context

Public human pages describe the BanzAI runtime state in prose that is **hardcoded**: `/estado` states
"Qwen local activo" as a fixed string, and the `/banzai` sidebar engine label is derived from per-answer
telemetry only. There is no single public place a page — or a regulator, auditor or operator — can read
the *current* runtime state from. The internal `/health` endpoint holds the facts but is **not public**
(it is unproxied and returns 404 at the edge) and carries internal-only fields (concurrency-queue stats,
onboarding booleans, warm-up detail) that must never be exposed.

The result is drift risk: a hardcoded page can contradict what the service actually does. The protocol's
own principle is that runtime state must be **verifiable, not asserted**.

## Decision

**D-072-01 — One public runtime SSOT route: `GET /banzai/runtime`.** Served by `banzai-api` via a **new**
handler (not a rename or public proxy of the internal `/health`). It returns a secret-free projection of
the runtime facts the service already holds. It is the single source of truth every human page consumes;
where a page's prose and this route differ, **the route wins**.

**D-072-02 — Secret-free, versioned schema.** The payload carries `schema_version` (`banzai-runtime/1`)
and `authoritative: false`, and a curated public field set: `service`, `status` (`ok|degraded|unknown`),
`mode` (`local_qwen|external_hosted|mock|degraded`), `model_available` (boolean), `model_class` (coarse
family label only), `inference_location` (`local|external|none`), `external_calls` (boolean),
`deterministic_engines_available` (boolean), `degraded_capabilities` (string list), and `checked_at`.
Optional build labels `release`/`commit` (short git ref / milestone label) may be `null` until injected.

**D-072-03 — Forbidden fields.** The projection MUST NOT expose filesystem paths; the exact model id,
version, quantisation, parameter count or on-disk filename; hostnames, IPs or ports; tokens, keys, or the
onboarding pepper; system prompts or chain-of-thought; concurrency-queue internals; usage/budget/onboarding
internals; hardware; or any answer content. `model_class` is a coarse family/hosting class only.

**D-072-04 — Transport.** GET only (any other method → `405 {error:"method_not_allowed", allow:"GET"}`);
`application/json` with `X-Content-Type-Options: nosniff`; `Cache-Control: public, max-age=15` plus a weak
content-hash `ETag` (shorter than the registry catalogue's cache because runtime state is more volatile).
Added to nginx as an **exact-match** location among the other `/banzai/*` machine routes, **outside** the
`/banzai/ask` rate-limit zone, in **both** the infra conf and the runtime compose copy. The internal
`/health` stays unproxied (404 publicly).

**D-072-05 — This is telemetry, not a normative contract.** The route is additive, read-only and
non-authoritative. It is not a protocol interface operators must implement, and it is distinct from the
signed, root-anchored `/.well-known/banza/*` trust artifacts (which are long-lived and binding). No RFC is
required; an RFC would only be warranted if this schema were ever promoted to a normative
operator-consumable contract.

## Consequences

- A new guard `banzai-runtime-ssot-check` asserts the route exists in **both** nginx files, that the
  projection is secret-free, that `schema_version` and `authoritative:false` are present, and that
  `/estado` and the BanzAI sidebar consume the route rather than hardcoding "Qwen local activo".
- `/estado` renders the panel from the route (server-side fetch); the sidebar engine label is derived from
  per-answer telemetry with an added honest **degraded** branch (ADR-073 makes degradation a real state).
- The repo-guards ADR range is bumped to include ADR-072.

## Alternatives considered

1. **`/api/banzai/runtime`.** Rejected: invents a brand-new `/api/*` top-level namespace with no precedent
   at the apex, which already carves machine routes under `/banzai/*`.
2. **`/.well-known/banza/banzai-runtime.json`.** Rejected as primary: that namespace holds signed,
   root-anchored, long-lived trust artifacts; volatile non-authoritative telemetry does not belong there
   and would falsely imply root-verifiable trust. A signed variant could live there under a future ADR.
3. **Publicly proxy `/health` verbatim.** Rejected: `/health` carries internal-only fields; a public
   projection with an explicit forbidden-field list is the safe surface.
