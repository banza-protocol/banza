# Operador Zero Integration into BanzAI Validation Mode (M2.19E/F.2)

**Operador Zero is the single canonical read-only validation target; its CTAs deep-link into `/banzai?mode=validation`; the target registry is closed.**

**Status:** COMPLETE + LIVE — 2026-07-29

## Operador Zero as the single read-only target

Per ADR-052/053/067, Operador Zero is the **only** public target of validation mode and a **read-only** reference implementation: it exposes identity, manifest, capabilities, endpoints, metadata, keys, reports and status, and nothing else. It runs no simulation, no mutable ledger, no self-certification. BanzAI initiates validation; Operador Zero responds; the Rust engines decide.

## Closed target registry

`website/lib/banzaiValidation.ts` defines a closed registry with exactly one entry:

```ts
VALIDATION_TARGETS = {
  "operator-zero": {
    id: "operator-zero",
    display_name: "Operador Zero",
    artifacts_base: "https://zero.banza.network",
    environment: "demo",
    demo_only: true,
  },
};
DEFAULT_TARGET_ID = "operator-zero";
```

- `resolveTarget(id)` returns `null` for anything off-list.
- `parseBanzaiState` falls back to Operador Zero for an unknown/empty target and records `targetKnown=false`, so a stale or malformed deep link lands on a working, honest journey (the header/context panel show "Alvo desconhecido — a usar Operador Zero") rather than a dead end.
- No caller-supplied URL is ever fetched — only bundled read-only Operador Zero artifacts are read. SSRF / path-traversal / injection are impossible by construction.

## CTAs deep-link into validation mode

The deep-link builders (`banzaiValidation.ts`) only ever encode an allowlisted `target` + `workflow`:

- `workbenchDeepLink(targetId, workflow) → /banzai?mode=validation&target=operator-zero&workflow=…`
- `workbenchDeepLinkAbsolute(...) → https://banza.network/banzai?…` (the `zero.` subdomain sends the visitor to the apex `/banzai`).

The Operador Zero surface offers seven workflow CTAs (full journey + the 8 step workflows via `WORKFLOW_LABEL_PT`, e.g. "Validar esta implementação no BanzAI"). None point to the removed `/banzai/validar`.

## Honest status: NOT_CERTIFIED / PRE_PRODUCTION

Operador Zero is demo (`production_allowed=false`), so:
- the validation header/context show `Estado de certificação: NOT_CERTIFIED`;
- the JourneyReceipt records `certification_status: NOT_CERTIFIED`, `certification_readiness: PRE_PRODUCTION`, `demo_only: true`;
- the Certification Readiness step emits a PREVIEW record, never a certificate;
- Operador Zero never appears as a real operator in the registry (public `/operators = []`).

## Enforcement

`tools/check-banzai-single-interface.sh`:
- assertion 10 — `VALIDATION_TARGETS` has exactly one key and it is `operator-zero`;
- assertion 12 — `workbenchDeepLink` returns a `/banzai?mode=validation` deep link.

The operator-zero-family guards (`check-operator-zero-read-only-surface.sh`, `check-operator-zero-full-e2e.sh`, `check-operator-zero-realistic-journey.sh`, `check-operator-zero-standalone-surface.sh`, `check-zero-subdomain-design.sh`, `check-footer-banzai-zero-navigation.sh`) were realigned to the single-interface model (PRs #224/#225).

Live QA: Operador Zero CTAs all resolve to `/banzai?mode=validation&target=operator-zero&workflow=…` (7 workflows); **0** point to `/banzai/validar`. Metrics (§39): `operator_zero_canonical_targets = 1` · `fictional_operator_targets = 0` · `arbitrary_target_acceptance = 0`.

## Provenance

- Base (rollback): `rollback-pre-m2-19ef2-banzai-canonical-interface` → `6acc799`
- PR #224 → `e9959d1`; PR #225 → `5b57cc4` (CI 169/0)
- Deployed (repo `5b57cc4`): website `sha256:7539d7ae…`, banzai-api `sha256:738997a0…`
- Shared evidence: `docs/reports/M2_19EF2_PRODUCTION_VALIDATION_REPORT.md`

**Verdict:** COMPLETE. Operador Zero is the single closed, read-only validation target; its CTAs deep-link into `/banzai?mode=validation` via allowlisted params only; the outcome is honestly NOT_CERTIFIED / PRE_PRODUCTION, guarded by build-blocking assertions.
