# ADR-041 — Operator Zero: the read-only reference implementation

- **Status:** Accepted
- **Date:** 2026-07
- **Supersedes:** none
- **Related:** ADR-001 (open protocol), ADR-001 (operator separation), ADR-043 (Rust-first engines),
  ADR-042 (BanzAI native protocol agent), ADR-041 (Operator-Zero-only demo/example policy)

---

## Context

BANZA specifies a protocol but has never exercised it end to end against a *whole operator*. The
conformance suite validates artifacts in isolation; the BanzAI journey walks an operator through
seven steps using per-step examples that do not add up to one coherent operator. Nothing in the
repository answers the question an implementer actually asks: **what does a complete, conforming
operator look like, and can I watch one work?**

Two things follow from that gap. Implementers have no reference to copy. And the protocol's own
claims — that the invariants hold, that trust fails closed, that federation rejects an incompatible
peer, that an evidence bundle is assemblable — are asserted rather than demonstrated.

The obvious way to close it is a reference implementation. The obvious risk is that a reference
implementation of a *payment operator* starts to look like a payment operator: a thing with
balances, transactions, QR codes and settlement, published on the protocol's own domain. That
resemblance is a legal and reputational hazard, and it is the reason this decision is an ADR rather
than a task.

## Decision

BANZA will maintain a canonical simulator, **Operador Zero**, as the protocol's end-to-end proof.

1. **It exists.** `operator-zero` is the canonical reference payment-operator simulator.
2. **It is `demo_only`.** Every artifact it publishes carries `demo_only: true`,
   `monetary_value: false` and `production_allowed: false`.
3. **It simulates PSP-like behaviour and is not a PSP.** It models accounts, balances, QR payments,
   refunds, reconciliation, trust and federation. It is not a bank, a PSP, a wallet, a licensed
   financial operator, and it moves no real money.
4. **Its currency is fictional.** `KZ_DEMO` — never `AOA`, never any real currency code.
5. **It moves no real funds and provides no financial service.**
6. **It never appears in `/operators` as a real operator.** The public registry stays empty of it.
7. **It represents no authorisation, certification, approval or licence.** A PASS from it is local
   technical evidence, exactly as a PASS from the conformance suite is.
8. **Its canonical artifacts live in `examples/operators/zero/`.**
9. **Its engine is Rust** — `engines/operator-zero-core/` — per ADR-043. Ledger arithmetic,
   validation, simulation, reconciliation, trust, federation, evidence and traces are computed
   there, never in TypeScript.
10. **A demonstrative service may exist** at `services/operator-zero/` if a runtime is ever needed;
    static artifacts are preferred while they suffice.
11. **Its intended public home is `zero.banza.network`.**
12. **Only `zero.banza.network` represents it being live.** A page served at any other path is not
    the subdomain being live, and must never be described as such.
13. **It has its own `Demo Operator Root`** — an operator-local signing root that signs demo material
    and nothing else.
14. **No private key of that root is ever committed.** Public key, key manifest, signatures, hashes
    and evidence are committed; seeds, mnemonics, private PEM, tokens and passwords are not.
15. **BanzAI may clone the template into browser session memory.** Each visitor gets an isolated
    copy. Changes never reach the canonical template, another visitor, Git, PostgreSQL or production.
16. **It passes the whole journey** — Manifest, Conformidade, Trust, Federação, Evidence Bundle,
    Traces — and a negative counterpart that produces real blockers.
17. **It proves the protocol; it does not replace the protocol.** Where the simulator and the
    specification disagree, the specification wins and the simulator is the thing that is wrong.

## The boundary, stated once

> O Operador Zero não é banco, não é PSP, não é carteira, não é operador financeiro licenciado e não
> movimenta dinheiro real. É um simulador técnico usado para demonstrar, testar e validar o protocolo
> BANZA de ponta a ponta.

And its relationship to the future real operator:

> **Operador Zero prova a arquitectura; Banzami prova o mundo real.**

Banzami remains separate: a future real reference operator with its own legal framing, its own
licensing question, and its own risk. Nothing about Operador Zero anticipates or substitutes for
that. Conflating the two would be the single most damaging misreading of this decision.

## Consequences

**What this buys.** An implementer gets a complete worked example instead of scattered fixtures. The
protocol's claims become executable: the invariants are checked against a ledger that actually
balances, fail-closed trust is demonstrated by a revoked key that actually blocks, and the evidence
bundle is assembled from results that were actually produced. The BanzAI journey gains a subject —
a visitor can walk all seven steps against something coherent rather than seven unrelated samples.
And defects in BanzAI itself surface faster, because the simulator exercises paths that isolated
fixtures never reach.

**What it costs.** A simulator that resembles a payment operator must be *aggressively* and
*repeatedly* marked as one that is not. Every artifact carries the demo fields; every public surface
carries the boundary; a guard (`make operator-zero-check`) fails the build if any of that erodes.
That is deliberate friction, and it is the price of publishing this at all.

**The failure mode to watch.** The danger is not that someone mistakes the simulator for a bank
today — the labelling is heavy. It is drift: a future phase adds a convenience, the demo marking
lapses on one surface, and the thing quietly stops looking like a simulator. The guard exists for
that, and it fails closed.

**What this does not decide.** Whether `zero.banza.network` is activated (DNS, Cloudflare and TLS
are the maintainer's call, unchanged by this ADR); whether a runtime service is ever built; and
anything at all about Banzami's legal position.

---

## Operator Zero Only demo and example policy

- **Status:** Accepted
- **Date:** 2026-07
- **Supersedes:** none
- **Related:** ADR-041 (Operador Zero simulator), ADR-001 (open protocol), ADR-001 (operator
  separation), ADR-043 (Rust-first engines), ADR-042 (BanzAI native
  protocol agent)

---

## Context

the single, realistic, step-by-step demo operator inside BanzAI. But the rule "Operador Zero is the only
official demo example" had not been made an architecture-wide decision. Parallel filled demo material
could still exist on public/product surfaces — for example the manifest validator's `demo_fixtures()`
exposed a fictional operator (`operator-candidate-A`, `sandbox.example.test`, `ops@example.test`) under
the label **"Manifesto válido (L0)"** in the BanzAI UI. A protocol that says "Operador Zero is the
example" while shipping a *second* fictional example operator is internally contradictory.

## Decision

**Operador Zero is the sole canonical demo operator and example source for BANZA. All demo/example
artifacts must be Operator-Zero-derived.**

Concretely:

1. Every **public** example, demo, sample, tutorial, walkthrough or demonstrative fixture — in the
   website, BanzAI, reference, docs, served artifacts and public API examples — must derive from
   Operador Zero.
2. There are **no parallel example operators**: no second demo operator, no fictional public operator,
   no "valid example" manifest, trust, federation, conformance, evidence-bundle or trace demo outside
   Operador Zero.
3. Any filled public example must carry `operator_id: operator-zero`, `operator_display_name:
   Operador Zero`, `currency: KZ_DEMO`, `demo_only: true`, `monetary_value: false`,
   `production_allowed: false`, `real_money: false`, `certification: false`.
4. Operador Zero is **not a real operator** and never appears in `/operators` as one. A **PASS** is
   local technical evidence, not certification.

### Three categories

- **`operator-zero-derived`** — the only allowed category for anything called an example/demo/sample/
  tutorial/walkthrough on a public or product surface.
- **`internal-test-only`** — internal test fixtures may exist **only if** they are not shown in the UI,
  the BanzAI answers, public docs, source cards, quick prompts or served artifacts; are **not called**
  example/demo/sample/tutorial/operator; live in clearly internal test locations (engine `tests/`,
  `#[cfg(test)]`, `*.test.*`, `test/`); and never leak to a public surface. Neutral names
  (`fixture_a`, `invalid_payload`, `malformed_json`) are preferred.
- **`public-non-zero-demo`** — **forbidden everywhere.** No `sample-operator`, `operator-demo`,
  `candidate operator` used as an example, `Manifesto válido (L0)`, `Carregar exemplo válido`,
  `sandbox.example.test`, `ops@example.test`, or any filled non-zero demo manifest/trust/federation/
  bundle/trace on a public surface.

### Abstract placeholders (not examples)

Specs, schemas, contracts and OpenAPI may show **abstract structural placeholders** — either
angle-bracket forms (`<operator_id>`, `<base_url>`, `<manifest_url>`) or the RFC-2606 reserved
`*.example` domain (`operator.example`) — **provided they are illustrative and explicitly
non-normative and are not a named demo operator with an identity or journey.** A placeholder that shows
*structure* is not a demo example; a *filled* example must be Operador Zero.

### Enforcement

The policy is repo-wide and CI-protected by three guards:
`make operator-zero-only-architecture-check` (repo-wide), `make banzai-operator-zero-only-ui-check`
(BanzAI product surface) and `make operator-zero-only-docs-examples-check` (docs/specs/OpenAPI). The
architectural boundary is: **public/product/docs/examples → strict Operador-Zero-only; internal tests →
allowed only when marked internal-test-only and non-leaking.**

> **Operator Zero is the sole canonical demo operator and example source for BANZA. All demo/example
> artifacts must be Operator-Zero-derived.**

## Consequences

- The manifest validator's `demo_fixtures()` is re-based on Operador Zero (`operator-zero`,
  `zero.banza.network`), and the "Manifesto válido (L0)" label becomes "Operador Zero · manifest
  válido"; parallel fictional identities are removed from the product surface.
- BanzAI states that Operador Zero is the only official demo example; a manual JSON upload is an
  **advanced tool**, not an official example, and does not enter the demo journey.
- `examples/` conceptual protocol-flow guides (checkout, payment-link, QR, webhook) remain — they
  illustrate protocol *concepts*, not a fictional operator — and point to Operador Zero for a filled,
  end-to-end example.
- Internal engine test fixtures (e.g. neutral manifest payloads in `#[cfg(test)]` / `tests/`) remain,
  isolated as internal-test-only and never surfaced as examples.
- No change to the model, real operators, `/operators`, the Trust Root, PostgreSQL or
  DNS; `external_model_called` stays false; `/operador-zero` stays 410.

---

## Operador Zero as the read-only canonical reference implementation, validated in BanzAI validation mode

- **Status:** Accepted
- **Date:** 2026-07
- **Related:** ADR-041 (Operador Zero reference implementation), ADR-041 (Operator-Zero-only demo/example
  policy), ADR-042 (BanzAI as the primary human-operator interface), ADR-003 (three-layer institutional
  architecture), ADR-034/065/066 (L2 conformance & interoperability certification, technical registry,
  closed state machine), ADR-043 (Rust-first engines), ADR-027 (open trust model, no central CA)

---

## Context

A reference implementation and the act of validating it are two different things, and the protocol must
never let them collapse into one self-certifying product. *How an implementation presents itself* — the
identity, manifest, capabilities, endpoints, metadata, keys and evidence it exposes — is distinct from
*how an implementation is validated* — the steps a human initiates, the engines that decide, and the
state a registry publishes.

The three-layer architecture (ADR-003) and the L2 certification model (ADR-034/066) fix this separation:
an implementation **exposes** its surface; **BanzAI** (ADR-042) is the single human-operator interface
where validation is **initiated**; the **Rust engines** **execute and decide** every verdict; **Qwen
only explains**; the **Technical Registry** (ADR-036) **publishes** the current verifiable state. Nothing
about a reference implementation may execute or certify itself.

## Decision

**D-067-01 — Operador Zero is a read-only canonical reference implementation.** The public surface exposes
identity, manifest, capabilities, endpoints, metadata, public keys, reports, evidence and certification
status, and **nothing else**. It runs no simulation, no mutable ledger, no conformance/trust/federation
execution, no Evidence-Bundle construction and no certification action. It behaves as any BANZA
implementation is expected to: it responds to protocol messages and external tests; it never tests or
certifies itself.

**D-067-02 — BanzAI is the single interface, and validation is a native mode within it.** There is one
human-operator interface (ADR-042) and one route, `/banzai`. Validation is not a separate application or
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
ADR-035 vocabulary: `NOT_EVALUATED / PENDING / VERIFIED / FAILED / … / NOT_CERTIFIED / PRE_PRODUCTION`)
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
- Layer 2 (ADR-034/066) is where certification is decided; Operador Zero's Certification Readiness step is
  a deterministic aggregation of the Rust step-verdicts and, being demo, is honestly `NOT_CERTIFIED` /
  `PRE_PRODUCTION`.
- Because validation mode is state in query parameters against closed allowlists, the single `/banzai`
  interface serves general questions and validation runs without any additional route, and remains
  SSRF-safe by construction.
