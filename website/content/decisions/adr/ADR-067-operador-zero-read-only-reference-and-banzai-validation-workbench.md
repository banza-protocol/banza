# ADR-067 — Operador Zero as the read-only canonical reference implementation, validated in BanzAI validation mode

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.19E/F
- **Related:** ADR-052 (Operador Zero reference implementation), ADR-053 (Operator-Zero-only demo/example
  policy), ADR-054 (BanzAI as the primary human-operator interface), ADR-059 (three-layer institutional
  architecture), ADR-064/065/066 (L2 conformance & interoperability certification, technical registry,
  closed state machine), ADR-037 (Rust-first engines), ADR-038 (open trust model, no central CA)

---

## Context

A reference implementation and the act of validating it are two different things, and the protocol must
never let them collapse into one self-certifying product. *How an implementation presents itself* — the
identity, manifest, capabilities, endpoints, metadata, keys and evidence it exposes — is distinct from
*how an implementation is validated* — the steps a human initiates, the engines that decide, and the
state a registry publishes.

The three-layer architecture (ADR-059) and the L2 certification model (ADR-064/066) fix this separation:
an implementation **exposes** its surface; **BanzAI** (ADR-054) is the single human-operator interface
where validation is **initiated**; the **Rust engines** **execute and decide** every verdict; **Qwen
only explains**; the **Technical Registry** (ADR-065) **publishes** the current verifiable state. Nothing
about a reference implementation may execute or certify itself.

## Decision

**D-067-01 — Operador Zero is a read-only canonical reference implementation.** The public surface exposes
identity, manifest, capabilities, endpoints, metadata, public keys, reports, evidence and certification
status, and **nothing else**. It runs no simulation, no mutable ledger, no conformance/trust/federation
execution, no Evidence-Bundle construction and no certification action. It behaves as any BANZA
implementation is expected to: it responds to protocol messages and external tests; it never tests or
certifies itself.

**D-067-02 — BanzAI is the single interface, and validation is a native mode within it.** There is one
human-operator interface (ADR-054) and one route, `/banzai`. Validation is not a separate application or
route: it is a **native mode** of BanzAI, entered as `/banzai?mode=validation&target=operator-zero&workflow=full`.
The nine steps — Discovery, Manifest, Keys, Conformance, Interoperability, Trust, Federation, Evidence
Bundle and Certification Readiness — are initiated by a human in this mode and **executed by the Rust
engines**. The Operador Zero surface only deep-links into `/banzai` validation mode with a validated
`target`.

**D-067-03 — The operational rule is fixed.** BanzAI initiates · Operador Zero responds · Rust evaluates ·
the evidence demonstrates · the Registry publishes · Qwen explains. Qwen never executes a test, selects a
result, changes a state, waives a requirement, produces a PASS, or emits a certification record
(`qwen_calls = 0`, `external_model_calls = 0`).

**D-067-04 — Every step produces an OperationReceipt, and the run produces a JourneyReceipt.** Each step
binds an operation id, request id, workflow, step, actor, target, timestamp, engine + engine version,
input/output hashes, result, status, reason codes and evidence references. The nine step receipts are
sealed by a final **JourneyReceipt**. Receipts are machine-readable, exportable and hash-bound.

**D-067-05 — Query-param state is closed and safe.** Validation mode is driven entirely by query
parameters — `mode`, `target`, `workflow`, `step` — each validated against a closed allowlist:
`mode=validation`, `target` from a closed registry (`operator-zero`), `workflow` from a closed set, and
`step` from the nine named steps. No caller-supplied URL is ever fetched, so SSRF / path-traversal /
injection are impossible by construction.

**D-067-06 — Honest, categorical, read-only status.** The surface publishes categorical states (the
ADR-066 vocabulary: `NOT_EVALUATED / PENDING / VERIFIED / FAILED / … / NOT_CERTIFIED / PRE_PRODUCTION`)
obtained from published artifacts. There is **no aggregate score** and no `PASS demo`: a score is not a
certification, and **certification readiness is not certification issued**. Operador Zero is demo
(`production_allowed=false`), therefore **NOT_CERTIFIED** and **PRE_PRODUCTION**; it never appears as a
real operator in the registry.

**D-067-07 — Machine surface preserved.** The read-only GET endpoints (manifest, key-manifest, revocation,
conformance evidence, federation metadata, evidence bundle, traces, examples) remain: GET returns the
demo payload, writes return 405, unknown returns 404 JSON. No HTML on machine routes; no secrets; no PII.

## Consequences

- The reference implementation and its validation are cleanly separated: the surface demonstrates *how an
  implementation presents itself*; BanzAI validation mode demonstrates *how it is validated*.
- The Operador Zero surface carries no local journey, no mutable ledger and no negative-flow execution; a
  guard fails the build if any local execution entrypoint appears on the surface.
- Layer 2 (ADR-064/066) is where certification is decided; Operador Zero's Certification Readiness step is
  a deterministic aggregation of the Rust step-verdicts and, being demo, is honestly `NOT_CERTIFIED` /
  `PRE_PRODUCTION`.
- Because validation mode is state in query parameters against closed allowlists, the single `/banzai`
  interface serves general questions and validation runs without any additional route, and remains
  SSRF-safe by construction.
