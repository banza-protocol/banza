# ADR-068 — Endpoint-Originated Operator Validation and Operator–Implementation Target Model

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.19G.1
- **Related:** ADR-054 (BanzAI as the single human-operator interface), ADR-059 (three-layer
  institutional architecture), ADR-060 (Banzami Operational Scheme — designated operator),
  ADR-061 (technical certification ≠ scheme admission ≠ regulatory authorisation),
  ADR-064/065/066 (L2 conformance & interoperability certification, technical registry, closed
  certification-state machine), ADR-067 (Operador Zero read-only reference implementation),
  ADR-037 (Rust-first engines), ADR-038 (open trust model, no central CA)

---

## Context

BanzAI's validation mode (ADR-067) lets a human validate an implementation of the BANZA protocol
through a nine-step journey decided by Rust engines. Until now that journey consumed artifacts that were
provided *to* the interface — bundled example data, pasted JSON, uploaded files, local fixtures. That
model proves only that some content handed to BanzAI matches a structure. It does **not** prove *who*
published the artifact, *which* implementation published it, whether it is *publicly reachable*, whether
another verifier would obtain the *same* content, whether the keys are bound to the identity, whether the
metadata is signed, or whether the result is *reproducible* from a stable public origin.

Two distinct things had been conflated: **how an implementation presents itself** (the identity,
manifest, capabilities, endpoints, metadata, keys and evidence it publishes) versus **the act of
obtaining and verifying that presentation from its canonical public origin**. Before any operational
preparation of the scheme (M2.19H), validation must be strengthened so that a BANZA verdict is bound to a
verifiable public origin, not to content that happened to be in front of the interface.

A second, related conflation was between the **operator** (the responsible entity) and the
**implementation** (the technical system being evaluated). An operator may publish many implementations —
demonstration, sandbox, pre-production, production; different versions, profiles, capabilities and
deployments. Validating "an operator" without naming the implementation is meaningless.

## Decision

### Core rule

**In BanzAI's official validation journey, every evaluated artifact is obtained exclusively from the
public endpoints of the selected implementation.** No pasted content, uploaded file, drag-and-drop,
user-entered URL, local fixture, frontend mock, embedded JSON, pre-computed result, or manually chosen
artifact may enter the official journey.

Operational rule: **the operator publishes; BanzAI obtains; Rust verifies; the receipt fixes the result;
the Technical Registry publishes the verifiable state.**

Canonical flow:

```
operator → implementation → Technical Registry → canonical origin → discovery →
public endpoints → artifacts → Rust engines → evidence → receipts → Certification Readiness
```

### §4.1 Human language

The visible feature is called **"Validar operador"** (Validate operator).

### §4.2 Technical object

The technical object evaluated remains **a specific implementation published by that operator** — never
the entity in the abstract.

### §4.3 Operator–implementation relationship

One operator may publish many implementations: demonstration, sandbox, pre-production, production;
different versions, profiles, capabilities and deployments. Selecting a target means choosing an operator
**and one of its published implementations**.

### §4.4 Origin of inputs

Official validation consumes only artifacts obtained from the **canonical public endpoints** of the
implementation, resolved through the Technical Registry. The interface never fetches a user-supplied URL.

### §4.5 Drafts

Uploading and pasting artifacts is permitted **only** in a local developer draft tool, separated from the
official journey. A draft result is `DRAFT_VALIDATION_RESULT`: local, non-authoritative, never evidence.

### §4.6 Registry

The **BANZA Technical Registry** (ADR-065), or a closed technical target registry, provides the eligible
operators, implementations and canonical origins. It is the only source of validation targets.

### §4.7 Security

Arbitrary URLs are prohibited. The official artifact fetch is performed by a secure Rust layer that
resolves the host from the registry, enforces HTTPS, blocks private/loopback/link-local ranges and cloud
metadata, forbids cross-host redirects, bounds size and time, validates media types and TLS, and binds
each response to a hash, timestamp and (where applicable) signature.

### §4.8 Receipts

Every OperationReceipt and the JourneyReceipt bind the result to the **exact origin of the inputs**:
operator, implementation, endpoint, resolved host, fetched-at, HTTP status, content type, content length,
ETag, hash, signature status and engine version. Protocol fetches are counted as `protocol_fetch_count`,
never as `external_model_calls`.

### §4.9 Operador Zero

Operador Zero (ADR-067) is the initial canonical example, but it receives **no shortcut, official
fixture, pre-computed result or bypass**. It exists in the Technical Registry with an operator record and
an implementation record, publishes discovery/manifest/keys/signed-metadata/capabilities/revocation/
federation endpoints at its canonical origin (`zero.banza.network`), and is validated through the same
secure fetch + Rust engines as any future implementation, producing real receipts bound to its endpoints.

### §4.10 Institutional separation

"Validar operador" means **evaluating an implementation published by that operator**. It does **not**
mean generically certifying the entity, authorising financial activity, admitting the operator into the
Banzami Operational Scheme, or approving it commercially. Technical validation is not an issued
certification; technical certification is not scheme admission nor regulatory authorisation (ADR-061).

## Consequences

- A new secure, SSRF-hardened Rust artifact fetcher performs all official artifact retrieval; the browser
  never fetches official targets, and the no-network protocol engines remain no-network — they receive
  already-fetched content.
- The Technical Registry gains an operator → implementation → canonical-origin → discovery resolution over
  a closed set; presence in the registry never implies admission, authorisation, or the ability to move
  funds, and non-published / revoked / origin-less / incompatible implementations are not eligible targets.
- The nine-step journey (Discovery, Manifest, Keys, Conformance, Interoperability, Trust, Federation,
  Evidence Bundle, Certification Readiness) fetches from the implementation's public endpoints at each
  step; Certification Readiness aggregates but never issues a Certification Record.
- Upload and paste move to a clearly-marked, non-authoritative developer draft tool.
- BanzAI's navigation, results and contextual panels are simplified: a single Resultados area, no
  duplicate / orphan / non-actionable tabs, contextual actions and a contextual right panel; Certification
  Readiness (may be BLOCKED) stays distinct from Certification Status (NOT_CERTIFIED).
- Rust decides every verdict; Qwen only explains; TypeScript never decides.
