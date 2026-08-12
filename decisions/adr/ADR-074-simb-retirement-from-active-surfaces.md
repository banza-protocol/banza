# ADR-074 — SimB retirement from active surfaces

- **Status:** Accepted
- **Date:** 2026-08
- **Milestone:** M2.19G.5C
- **Related:** ADR-068 (endpoint-originated validation — the canonical nine-step journey), ADR-067
  (Operador Zero read-only reference; validation initiated in BanzAI), ADR-041 (native protocol agent),
  ADR-052/053 (Operador Zero — the active canonical demo operator; MUST NOT be affected)

---

## Context

SimB (`banza-simb`) was an earlier Workbench operator/federation **simulator**, paired with a
`SIMB_PRE_REVIEW` gate. It has been superseded by the deterministic, **endpoint-originated** nine-step
validation journey (ADR-068): Discovery → Manifest → Keys → Conformance → Interoperability → Trust →
Federation → Evidence Bundle → Certification Readiness, which fetches only registry-resolved artifacts via
the secure Rust fetcher and contains **zero** SimB. The live canonical reference
(`website/content/BANZA_REFERENCIA.md`) and the canonical journey component already have no SimB.

Nonetheless, stale SimB references survive on **active** surfaces: the guided-journey blurb
(`banzai-agent.ts` `AGENT_GUIA_TEXT`, "executar SimB"), the developer-commands panel (`DEV_COMMANDS`,
`banza-simb`), a dead `SIMB_CARDS` export, two Operador Zero engine **labels**
(`operadorZeroStatus.ts` interoperability/federation), two served SVGs, and a handful of reference/spec
copies. These contradict the live journey and must be retired.

Two distinct "simulator" concepts must be kept apart: **(A)** SimB / `banza-simb` — the retired
simulator, the cleanup target; and **(B)** Operador Zero — the **active** canonical demo operator
(ADR-052/053), whose legitimate "simular/simulator" mentions are unrelated and MUST NOT be touched.

## Decision

**D-074-01 — SimB must not appear on any ACTIVE public/operator surface.** Remove or correct: the
`AGENT_GUIA_TEXT` "executar SimB" step (align to the canonical nine-step journey); the `DEV_COMMANDS`
`banza-simb` line; the dead `SIMB_CARDS` export; the two served SVGs (`banzai-operator-journey.svg`,
`banzai-responsibility-matrix.svg`, both the served and `docs/reference` copies) and the SVG registry
description; and the stale reference/spec copies (`docs/reference/pt/completa.md`, `spec/overview.md`).

**D-074-02 — The Operador Zero engine labels are corrected to the canonical engines.** The
interoperability dimension label migrates from `banza-simb + banza-l2-readiness` to `banza-l2-readiness`,
and the federation dimension label from `banza-simb` to `banza-l3-readiness`. This is a **display-label**
change only; no readiness engine and no Operador Zero status/evidence is altered.

**D-074-03 — SimB survives only in the isolated draft tool and in history.** The `banza-simb` engine
crate, the `SIMB_PRE_REVIEW` → readiness/evidence-bundle draft pipeline, and the draft-validation libraries
(`banzaEvidenceBundle.ts`, `banzaL{1,2,3,4}Readiness.ts`: `BLOCKED_BY_SIMB` / `simb_pre_review`) are
**kept** — they are the local, clearly-separated developer draft tool that never constitutes official
evidence, and they stay green under `check-banzai-draft-validation-isolation`. Git history and old ADR
bodies (including ADR-041's "run SimB" capability line) are **kept unchanged**.

**D-074-04 — The guard-lock is inverted as a governed change.** The existing test that asserts
`DEV_COMMANDS` contains `banza-simb` is inverted, in the same change set, to assert its absence — never
silently. A new guard `banzai-simb-active-surface-clean-check` fails on any SimB / `banza-simb` token on
active surfaces, with an explicit allowlist for the isolated draft libs (and their tests) and for
`decisions/adr` history.

## Consequences

- Active surfaces describe only the endpoint-originated nine-step journey; SimB is gone from every rendered
  page and shipped active bundle.
- The draft-validation isolation is preserved; the developer draft tool continues to function.
- The repo-guards ADR range is bumped to include ADR-074. Refines ADR-067/ADR-068; supersedes neither.

## Alternatives considered

1. **Delete the `banza-simb` engine and the draft pipeline entirely.** Rejected: they remain a legitimate,
   isolated developer draft tool; the goal is to stop advertising SimB on active surfaces, not to erase the
   developer capability or the history.
2. **Silently flip the guard-locked test.** Rejected: a guard-lock inversion is a governed change and must
   be explicit and reviewed alongside the surface edits.
3. **Rewrite ADR-041's body to drop the "run SimB" capability.** Rejected: ADR bodies are history; if the
   agent's advertised capability is to change normatively, this ADR (ADR-074) is that governed record —
   the older ADR body is left intact.
