# ADR-024 — Public Verification Pages

**Status:** Accepted
**Date:** 2026-07-01
**Author:** BANZA Protocol
**Deciders:** Fidel Monteiro (Founder)
**Supersedes:** None
**Extends:** ADR-023 (Transaction Proof Standard)
**See also:** ADR-025 (Interactive Financial Documents), ADR-003 (Protocol/operator separation), ADR-010 (Wallet/account identity), [BANZA-PROTOCOL-VS-OPERATOR-POLICY](../../docs/governance/BANZA-PROTOCOL-VS-OPERATOR-POLICY.md)

---

## Context

ADR-023 established that **the receipt is not the proof — the proof is the
verifiable record in the ledger**, and defined a `public_verification_url` on
every TransactionProof. ADR-025 made emitted documents link to it. This ADR
specifies **the page that URL resolves to**: `https://<operator>/r/{reference}`.

That page is not just a web page — it is the **protocol's public interface for
authenticity**. It is the single public way to validate any receipt, and every
BANZA operator MUST expose it with consistent semantics, privacy and safety.

## Decision

`/r/{reference}` is an official protocol capability: an **authenticated,
read-only viewer of the current ledger state** for a proof reference. It is
produced by a **Verification Resolution Engine** and never trusts client input.

### 1. Reference vs verification (separation of concerns)

- A **reference** (e.g. `BZM-HCNK-7VYK`) only *locates* a transaction. It MUST
  carry no financial data, no PII, and MUST NOT be a signature.
- **Verification** resolves that reference against the **ledger**. Every fact
  shown comes from the ledger/operator record — never from the PDF, QR, URL or
  any client-supplied value.

### 2. Public fields (allow-list — normative)

Only these MAY be shown: reference, amount, currency, status, date/confirmation
timestamp, method, network, operator, environment, the verdict, the query
timestamp, and the safety/authenticity messaging.

### 3. Forbidden fields (MUST NEVER appear)

Internal UUIDs, wallet ids, merchant ids, ledger-posting ids, SQL ids, pricing
-rule ids, settlement ids, internal transaction ids, internal hashes, JWTs,
tokens, signatures, keys, account ids, risk/compliance/policy/routing ids.

### 4. No proof hash on the page

A raw proof hash gives the reader nothing and risks leaking internals. It MUST
NOT be displayed. Replace with plain assurance text ("Registado no ledger
imutável BANZA"). (The hash/signature remain internal to the proof for integrity;
they are not public UI.)

### 5. No verification counter

The number of times a proof was verified MUST NOT be public — it adds no value
and can reveal usage patterns. Any such analytics stay operator-internal.

### 6. Status is translated

Technical states (`CONFIRMED`, …) stay internal; the page shows the localized,
human verdict (e.g. "Confirmado"). The verdict tone is: confirmed → green,
pending → yellow, reversed/invalid/not-found → red.

### 7. Party-name privacy (normative default)

By default the page shows **only the `@handle`**, not a person's full name. A
full name MAY be shown only when the party is a **public entity** (a business /
public profile) or the user has **explicitly authorized** name display in public
verifications. Consumers are private by default. The Resolution Engine — not the
page — decides this and simply omits the display name when it must be hidden.

### 8. Network + operator (transparency)

The page MUST distinguish the **network** ("BANZA") from the **operator** (e.g.
"Operator A"), making the protocol/operator separation (ADR-003) visible.

### 9. Query timestamp

The page MUST show **when this verification was performed** ("Verificado agora ·
{timestamp}"), so the reader knows the check is live, not cached from a document.

### 10. Environment

If the proof is SANDBOX, the page MUST clearly badge it ("SANDBOX · sem valor
financeiro real"). LIVE shows no environment badge.

### 11. Source-of-truth + integrity messaging

The page MUST state that it reads the immutable ledger and that PDFs/screenshots
are never proof, and MAY show a plain integrity summary (registered / unaltered /
confirmed by the operator) **without** hashes or internal detail.

### 12. One engine, all document types

The same Resolution Engine + page MUST serve every reference type — payments,
transfers, QR, split bills, invoices, campaigns, donations, payouts, refunds,
chargebacks — producing one consistent ViewModel.

## Architecture — Verification Resolution Engine

```
QR / PDF / link ──▶ reference ──▶ Verification Resolution Engine
                                    │  (resolve → ledger / wallet / settlement /
                                    │   operator; apply allow-list + privacy)
                                    ▼
                              public ViewModel ──▶ /r/{reference} page
```

No page (or client) queries operator tables directly. The engine produces a
public ViewModel that already excludes every forbidden field and applies the
name-privacy default; the page is a pure renderer of that ViewModel. Everything
is (re)validated server-side — QR, PDF, screenshot and URL are all untrusted
input whose only role is to supply the reference.

## Consequences

- Every operator exposes `/r/{reference}` with the same allow-list, privacy and
  safety semantics — a consistent, bank-grade authenticity experience across the
  network. The conformance suite gains checks for the allow-list (no forbidden
  fields), the privacy default (consumer name hidden), no hash/counter, a live
  query timestamp, and correct environment badging.
- No new financial object/lifecycle/event is introduced — this specifies the
  public presentation + privacy of the ADR-023 proof. Operator-local rendering
  (fonts, layout, the exact name-authorization UI) stays with the operator
  (ADR-003).

## Reference operator

The reference operator implements the engine in its gateway (`GET /v1/public/proofs/{ref}` →
`ProofService.Public`) and the page at `operator.example/r/{ref}` (the `website`
`/r/[ref]` route). See `docs/architecture/public-verification-engine.md` in the
reference operator's repository.
