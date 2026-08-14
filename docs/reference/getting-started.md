# Getting Started with BANZA

> BANZA is a protocol — a set of public rules. This guide shows you where to find them, how to implement them, and how to publish machine-verifiable conformance evidence that any counterparty can check for itself.

> **Pre-production guide.** This guide helps teams build implementations and produce conformance evidence. It does **not** admit or approve an operator, authorise production deployment, or replace applicable legal, regulatory, banking, KYC/KYB or AML/CFT obligations. BANZA é um protocolo financeiro aberto. A participação de operadores é demonstrada por conformidade protocolar verificável, não por aprovação humana central. The Public Protocol Registry currently publishes no operator metadata (`/operators` returns `[]`) and `production_certificates` remains `false`; protocol production and federation remain behind the offline root-key ceremony and the first published production conformance evidence. You are an independent operator: your legal and regulatory authorisation comes from the competent regulator, never from BANZA.

---

## What BANZA is

BANZA defines how independently operated implementations interoperate. It does not provide software. It provides rules.

```
HTTP  → Browsers and servers implement it
SMTP  → Email clients implement it
BANZA → Operators implement it
```

Your implementation can be in any language, use any database, and run on any infrastructure — as long as it satisfies the protocol invariants.

---

## Step 1 — Read the specification

| Document | Language | Purpose |
|----------|----------|---------|
| [`docs/reference/pt/completa.md`](../../docs/reference/pt/completa.md) | Portuguese | Canonical reference |
| [`docs/reference/en/complete.md`](../../docs/reference/en/complete.md) | English | Reference |
| [`spec/overview.md`](../../spec/overview.md) | English | Protocol layers |
| [`docs/governance/certification-boundary.md`](../../docs/governance/certification-boundary.md) | English | Conformance levels L0–L4 |

Start with [docs/reference/en/complete.md §1](../../docs/reference/en/complete.md) for the introduction, then [§3](../../docs/reference/en/complete.md) for the core principles and financial invariants.

---

## Step 2 — Understand the contracts

The `contracts/` directory contains the canonical protocol specifications:

```
contracts/
├── openapi/     REST API shape — what endpoints your operator must expose
├── webhooks/    Webhook payload schemas
├── qr/          QR payload format — canonical BANZA QR specification
└── events/      Event schemas — what events operators must emit
```

Implement these contracts in your technology of choice. The protocol defines the shape and semantics — not the implementation.

---

## Step 3 — Understand the invariants

These rules must hold in all states, regardless of implementation:

| Invariant | Rule |
|-----------|------|
| `INV-LEDGER-001` | Double-entry: every debit has a corresponding credit |
| `INV-LEDGER-003` | No floating-point: all amounts in integer minor units |
| `INV-LEDGER-004` | Atomic posting: all entries in a transaction succeed or fail together |
| `INV-WALLET-001` | Balance consistency: wallet balance = ledger sum |
| `INV-STL-001` | No money creation: gross = net + fee |
| `INV-IDEM-001` | Idempotency: same idempotency key → same result, no side effects |

A violation of any invariant is a conformance blocker. See [docs/reference/en/complete.md §6](../../docs/reference/en/complete.md) for the full invariant specification.

---

## Step 4 — Create your Protocol Capability Manifest

Your manifest declares your operator identity and capabilities. It is a JSON document served at `/.well-known/banza/operator.json`.

Minimum discovery manifest (valid against `conformance/manifests/schema.json`):

```json
{
  "operator_id": "operator-a",
  "operator_name": "Operator A",
  "environment": "sandbox",
  "simulated": true,
  "production_allowed": false,
  "capabilities": {
    "supports_wallets": true,
    "supports_qr": true,
    "supports_settlement": false
  },
  "api_base_url": "https://api.your-operator.ao",
  "sandbox_base_url": "https://sandbox-api.your-operator.ao"
}
```

A conformance profile is never self-declared here: evidence proves it, and any
profile claim lives in the published conformance evidence, not in the manifest.

Use BanzAI at `banza.network/banzai` to validate your manifest against the published schema before you publish it. BanzAI checks your document against the schema — it does not evaluate trust and does not admit you to anything.

---

## Step 5 — Run the conformance suite

The conformance suite in `conformance/` contains the conformance test vectors. Use the conformance runner in `engines/banza-conformance/` to verify your implementation:

```bash
cd engines/banza-conformance
cargo run --release -- run-live \
  --level 1 \
  --api-key bz_test_... \
  --base-url https://sandbox-api.your-operator.ao
```

All tests must pass. A single failure blocks conformance at that level. See [`docs/guides/conformance.md`](../../docs/guides/conformance.md) for the full conformance specification.

---

## Step 6 — Publish your evidence yourself

There is no application to submit and no reviewer to wait for. You publish your own
trust material at your own endpoints, and counterparties verify it (ADR-031):

| Artifact | Where you publish it |
|----------|----------------------|
| Operator manifest | `/.well-known/banza/operator.json` |
| Signed protocol metadata | Signed by a delegated key whose authority chains to the trust root through the Key Manifest |
| Conformance evidence (`report.json`) | A stable URL referenced from your manifest |

The Public Protocol Registry then indexes that material so counterparties can discover
it. O Public Protocol Registry é um índice de metadata e evidência verificável. Não é
uma lista de operadores licenciados, aprovados ou certificados pela BANZA. Being absent
from it is not a regulatory prohibition — it means your metadata is not indexed.

---

## How counterparties evaluate you — Open Trust Evaluation

Any operator deciding whether to route to you runs exactly these ten checks (ADR-025).
None of them involves a human decision:

| # | Check | What you must do |
|---|-------|------------------|
| 1 | Valid operator manifest | Serve a schema-valid manifest |
| 2 | Compatible protocol version | Declare a supported `protocol_version` |
| 3 | Signed protocol metadata | Sign your metadata; keep signatures current |
| 4 | Conformance evidence present and valid | Publish a verifiable `report.json` |
| 5 | Trust root / delegated signature valid | Chain your signature to the trust root |
| 6 | Not revoked in the revocation list | Keep your keys uncompromised |
| 7 | Capabilities compatible | Declare capabilities honestly |
| 8 | Endpoint contract compatible | Expose the contracted endpoints |
| 9 | Evidence freshness within policy | Re-run the suite before your evidence goes stale |
| 10 | **Fail-closed** on missing/invalid/expired/revoked/incompatible material | Assume any gap means "not routable" |

A Revocation List é um mecanismo de segurança e trust do protocolo. Não é licença,
sanção regulatória ou autorização financeira.

---

## Conformance level path (pre-production)

Levels describe the capability your evidence covers:

| Level | Capability | Entry point |
|-------|-----------|-------------|
| L0 | Sandbox | Verify your environment works |
| L1 | Core payments | Consumer payment, merchant acceptance, transfer, traceability |
| L2 | Payment initiation | Payment request, payment link, instant (T+0) settlement |
| L3 | Interoperability | Cross-operator routing, reconciliation, federation |
| L4 | External interoperability | External-rail integration |

Levels are cumulative. Start at L0 if you are new.

---

## Resources

| Resource | Link |
|----------|------|
| Protocol specification (PT) | [`docs/reference/pt/completa.md`](../../docs/reference/pt/completa.md) |
| Protocol specification (EN) | [`docs/reference/en/complete.md`](../../docs/reference/en/complete.md) |
| Conformance levels and evidence | [`docs/governance/certification-boundary.md`](../../docs/governance/certification-boundary.md) |
| Conformance suite docs | [`docs/guides/conformance.md`](../../docs/guides/conformance.md) |
| Conformance runner | [`engines/banza-conformance/`](../../engines/banza-conformance/) |
| Protocol contracts | [`contracts/`](../../contracts/) |
| Trust model (ADR-025 · ADR-031 · ADR-025) | [`decisions/adr/`](../../decisions/adr/) |
| ADRs (governance) | [`decisions/adr/`](../../decisions/adr/) |
| RFCs (evolution) | [`decisions/rfc/`](../../decisions/rfc/) |
| BanzAI (knowledge system) | `banza.network/banzai` |
| Contributing | [`CONTRIBUTING.md`](../../CONTRIBUTING.md) |
