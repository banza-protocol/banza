# BanzAI — Guided Operator Journey

> The guided path that walks an operator from first orientation to verifiable evidence, with a
> Rust/WASM state machine deciding step order, statuses and the next action.

- **Governing decision:** [ADR-042](../../decisions/adr/ADR-042-banzai-a-non-authoritative-interface-to-the-protocol.md) (agent core / journey), [ADR-041](../../decisions/adr/ADR-041-operator-zero-the-read-only-reference-implementation.md) (nine-step validation journey), [ADR-038](../../decisions/adr/ADR-038-endpoint-originated-operator-validation.md) (endpoint-originated validation + operator/implementation model)
- **Engine:** `engines/banzai-operator-journey` (Rust → dual WASM: web for the UI, node for `/ask`)
- **Milestones:** M2.9B (journey + session) · M2.9C (product copy + safe JSON upload) · M2.19G.1 (endpoint-originated official journey)
- **Status:** implemented and deployed

> **BanzAI guia; os motores verificam; a evidência prova; a governança decide.**

> **Endpoint-originated (ADR-038, M2.19G.1).** The **official** validation journey uses **exclusively
> artifacts obtained from the public endpoints of the selected implementation**. Validating an operator
> means evaluating one of its published implementations (the operator is the responsible entity; the
> implementation is the technical system evaluated). The target is resolved from the closed Technical
> Registry (`operator_id → implementation_id → canonical_origin → discovery`) and every artifact is
> fetched by the secure Rust fetcher (`engines/banza-artifact-fetcher`) — never the browser, never a
> user-supplied URL. Upload/paste (§3 below) is a **local, non-authoritative draft tool only**
> (`DRAFT_VALIDATION_RESULT`, ADR-038 §4.5); it never enters the official journey. See the
> [Reference — BanzAI chapter](../../website/content/BANZA_REFERENCIA.md) and ADR-038 §19, which
> carries the SSRF policy the Rust fetcher enforces.

---

## 1. The steps

The canonical order (owned by the Rust engine's `STEPS`):

```
Guia → Manifest → Conformidade → Trust → Federação → Evidence Bundle → Traces / Relatório
```

`Perguntar ao BanzAI` is contextual support available at every step (not a step). `Referência`,
`Programadores` and `Repositório` are secondary reference links.

Each step accepts a real protocol artifact where applicable: Manifest (Operator Manifest), Conformidade
(evidence/conformance), Trust (key manifest / root metadata / revocation list — **public keys only**),
Federação (federation manifest/metadata), Evidence Bundle (evidence bundle), Traces (trace JSON).

## 2. What the Rust state machine owns

All journey logic is computed in Rust (rules 15/16 of ADR-042), never in TS:

- **step order** and **transitions** (manual navigation is allowed; a missing prerequisite yields a
  soft warning, never a hard block beyond `blocked` display);
- **per-step status**: `pending · in_progress · valid · invalid · incomplete · blocked · not_applicable`
  — a `valid` step is **technical evidence, never approval/certification**;
- **progress %**, the **next recommended action**, and a **safe, sanitized session-context summary**
  (whitelisted slugs/enums only) that `/ask` re-derives server-side and never trusts from the browser.

## 3. JSON upload — the local draft tool (M2.9C; draft-only since ADR-038)

Uploading or pasting an artifact is permitted **only** in a local **draft** tool for developers,
separated from the official journey. **Draft validation checks local content only and is not official
evidence** (`DRAFT_VALIDATION_RESULT`: local, non-authoritative, never evidence — ADR-038 §4.5). An
uploaded file is read only in the browser session and gated by the Rust scan (`scan_upload_json`): JSON
parse + size backstop + rejection of private-key material (PEM, JWK private members) and credential
fields (`private_key`/`api_key`/`secret`/…). Public keys pass. Nothing is uploaded raw automatically;
the model only ever receives a safe summary (see [SESSION_STATE.md](SESSION_STATE.md)). The **official**
journey never consumes draft content — it uses only artifacts fetched from the implementation's public
endpoints (ADR-038 §4.4).

## 4. Boundary

The journey demonstrates conformance by **verifiable technical evidence**. It does not create,
certify, approve, license or admit an operator; federation shown here is a **local simulation**, not
production federation. The public state is pre-production (`/operators=[]`,
`production_certificates=false`). **Technical validation is not an issued certification; technical
certification is not scheme admission nor regulatory authorisation** (ADR-004). The official journey is
endpoint-originated (ADR-038): its verdicts are decided in Rust over content fetched from the
implementation's public endpoints and bound to the exact origin of the inputs in an
`OperationReceipt`/`JourneyReceipt`; the Certification Readiness is READY/BLOCKED and never `CERTIFIED`.
