# M2.19G Semantic Non-Regression — M2.19G.1 (§37, invariant 25)

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` (the M2.19G finalized public surface) · **ADR:** ADR-068
- **Date:** 2026-07-30
- **Result:** `m2_19g_semantic_regressions = 0` — the M2.19G three-layer public surface is intact.

## 1. Why this report exists

M2.19G.1 rebuilt the BanzAI validation surface and touched several public pages. M2.19G (PR #226,
finalized at `a272d32`) had just reconstructed the public surface to the **three-layer institutional
architecture** (L1 open protocol · L2 conformance & interoperability certification · L3 designated
scheme operator's operational scheme; BanzAI as a transversal human interface). This report asserts that
the M2.19G.1 rebuild did **not** silently regress that surface.

## 2. Guard

`tools/check-banzai-m2-19g-semantic-regression-check.sh` (`make banzai-m2-19g-semantic-regression-check`)
spot-checks the canonical strings on the pages M2.19G.1 touches and is **negation-aware** (a line
carrying a negation/prohibition/enumeration/question marker is not a positive claim). Hard gate:
`m2_19g_semantic_regressions = 0`; exit 1 on any regression, exit 2 if the guard's own self-test breaks.

### Touched pages checked

- `website/app/o-que-e/page.tsx` — the reference "o que é" surface
- `website/app/banzai/page.tsx` — the BanzAI page
- `website/app/oz/page.tsx` — the Operador Zero page

## 3. Assertion 1 — three-layer vocabulary present

On the reference "o que é" page the guard requires the canonical three-layer vocabulary to remain
present:

`três camadas` / `3 camadas` · `L1` · `L2` · `L3` · `Esquema Operacional` · `transversal` (BanzAI
transversal) · `interface (humana) única` / `única interface`.

All present → **0 missing canonical vocab**.

## 4. Assertion 2 — no retired framing reintroduced as a positive claim

On every touched page, the guard forbids the retired framings from reappearing as a **positive** claim
(negation-filtered):

`BANZA CA` · `autoridade certificadora` · `certificad[oa] de operador` · `certificação de operador` ·
`operadores certificados` · `Validation Workbench` · `BanzAI Web` · `/banzai/validar`.

No positive-claim hits on any touched page → **0 reintroduced retired terms**.

## 5. Surfaces preserved

- The three-layer architecture (ADR-059..063) narrative and separations
  (Technical Certification ≠ Scheme Admission ≠ Regulatory Authorisation; BANZA ≠ scheme operator;
  Technical Registry ≠ Scheme Participant Directory) are unchanged.
- The open trust model (ADR-038/058: no central CA; INV-OTE/INV-FEDEVAL/INV-ROOT) is unchanged; the new
  signed-metadata artifact is explicitly `not_protocol_trust_root: true` (a demo operator root, not the
  protocol Trust Root).
- `production_certificates = false` and `/operators = []` (the honest pre-production boundary flags)
  are untouched.
- Regulatory posture `REGULATORY_AUTHORIZATION_IN_PROGRESS` and the RealMoneyActivationGate remain
  fail-closed; endpoint-originated validation activates no real money, admits no operator and asserts no
  regulatory status.

## 6. Metric

```
m2_19g_semantic_regressions = 0
```

The M2.19G three-layer public surface is intact; the endpoint-originated rebuild is additive to the
validation surface and did not regress the institutional framing.

## 7. Related

`M2_19G_DOCUMENTATION_UPDATE_REPORT.md` (what changed on the touched pages) and
`M2_19G1_PRODUCTION_VALIDATION_REPORT.md` §"Verification battery" (where this guard runs in the suite).
The live public-surface confirmation is captured post-deploy in the primary report's
"Production validation — PENDING DEPLOY" section.
