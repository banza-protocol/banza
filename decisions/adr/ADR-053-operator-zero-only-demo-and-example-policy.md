# ADR-053 — Operator Zero Only demo and example policy

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.14B
- **Supersedes:** none
- **Related:** ADR-052 (Operador Zero simulator), ADR-001 (open protocol), ADR-003 (operator
  separation), ADR-037 (Rust-first engines), ADR-041 (BanzAI native
  protocol agent)

---

## Context

ADR-052 established **Operador Zero** as the reference payment-operator *simulator*, and M2.14A made it
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
