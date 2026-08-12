# ADR-023 — Transaction Proof Standard

**Status:** Accepted
**Date:** 2026-06-29
**Author:** BANZA Protocol
**Deciders:** Fidel Monteiro (Founder)
**Supersedes:** None
**Extends:** ADR-006 (Double-entry ledger), ADR-017 (Wallet/account payments), ADR-014 (Payment Intent)
**See also:** ADR-005 (Protocol-first), [BANZA-PROTOCOL-VS-OPERATOR-POLICY](../../docs/governance/BANZA-PROTOCOL-VS-OPERATOR-POLICY.md)

---

## Context

Receipts (PDFs, screenshots, share images) are trivially forged. A payee who
relies on a screenshot can be defrauded by an edited amount, a fabricated status
or a recycled document. Across the BANZA ecosystem the receipt has been treated,
in practice, as the proof of payment — it is not.

**Central principle: the receipt is not the proof. The proof is the verifiable
record in the ledger.** A PDF/QR is only a visual representation; authenticity
must be confirmed publicly against the operator's official infrastructure.

## Decision

Define a protocol-level, operator-agnostic standard: the **TransactionProof**. A
proof is an immutable, publicly verifiable assertion that a given transaction
exists in an operator's ledger, with its real amount, parties and status. Every
operator that issues receipts MUST implement this standard.

### TransactionProof — universal fields

```
proof_reference          unique, immutable, non-enumerable public reference
operator_id              the issuing operator (the network's reference operator id)
network                  the BANZA network identifier
transaction_reference    the operator's transaction reference
amount                   minor units (integer)
currency                 ISO-4217
status                   PENDING | CONFIRMED | FAILED | REVERSED | CANCELLED | EXPIRED
created_at               proof issuance time
confirmed_at             when the transaction was confirmed (nullable)
payer_display            public display name of the payer
payee_display            public display name of the payee
ledger_reference         opaque reference to the ledger posting (not the internals)
proof_hash               hash of the canonical payload (integrity)
signature                operator signature over the canonical payload
public_verification_url  the operator's public verification page for this proof
verification_status      result of a public verification (VERIFIED | NOT_FOUND | ...)
```

### States

`PENDING` · `CONFIRMED` · `FAILED` · `REVERSED` · `CANCELLED` · `EXPIRED`

A reversal is represented by moving to `REVERSED` — a proof is **never** deleted
or destructively updated; its history is preserved.

### Rules (normative)

1. **The receipt is never the source of truth.** The verifiable record is.
2. `proof_reference` is **unique and immutable** and MUST be non-enumerable
   (not derivable from the transaction id by a third party).
3. A receipt's QR/short link MUST point to a **verification URL**, never to the
   PDF/document itself.
4. Every operator MUST expose a **public verification page** for a proof.
5. Every operator MUST expose a **minimal public verification API**.
6. The public proof MUST expose **no sensitive data** — no wallet ids, balances,
   internal ids, emails, phone numbers, full ledger internals, private keys, or
   KYC/KYB data.
7. `proof_hash` + `signature` guarantee integrity: a document may be altered
   visually, but the public verification always shows the truth.
8. Generation is **idempotent**: one confirmed transaction yields at most one
   proof; replay never duplicates it.
9. Signature keys are identified by `key_id` and MUST support rotation.

### Operator boundary

The protocol defines the **concept, fields, states and rules**. It does **not**
define the operator's reference format, signing algorithm, storage, rate limits
or page design — those are operator policy (see ADR-003). No operator branding
appears in this standard.

## Consequences

A merchant or citizen can open a receipt's QR/code and confirm, against the
official infrastructure, whether it is authentic, confirmed, its real amount, the
parties, and when it was confirmed — independent of the (forgeable) document.
Operators carry the implementation; the protocol carries the contract:
`contracts/proofs/transaction-proof.schema.json` and
`contracts/proofs/verification-response.schema.json`.
