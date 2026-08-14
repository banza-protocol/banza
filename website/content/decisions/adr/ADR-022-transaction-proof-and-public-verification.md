# ADR-022 — Transaction proof and public verification

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
or page design — those are operator policy (see ADR-001). No operator branding
appears in this standard.

## Consequences

A merchant or citizen can open a receipt's QR/code and confirm, against the
official infrastructure, whether it is authentic, confirmed, its real amount, the
parties, and when it was confirmed — independent of the (forgeable) document.
Operators carry the implementation; the protocol carries the contract:
`contracts/proofs/transaction-proof.schema.json` and
`contracts/proofs/verification-response.schema.json`.

---

## Public Verification Pages

ADR-022 established that **the receipt is not the proof — the proof is the
verifiable record in the ledger**, and defined a `public_verification_url` on
every TransactionProof. ADR-022 made emitted documents link to it. This ADR
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
"Operator A"), making the protocol/operator separation (ADR-001) visible.

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
  public presentation + privacy of the ADR-022 proof. Operator-local rendering
  (fonts, layout, the exact name-authorization UI) stays with the operator
  (ADR-001).

## Reference operator

The reference operator implements the engine in its gateway (`GET /v1/public/proofs/{ref}` →
`ProofService.Public`) and the page at `operator.example/r/{ref}` (the `website`
`/r/[ref]` route). See `docs/architecture/public-verification-engine.md` in the
reference operator's repository.

---

## Interactive Financial Documents

ADR-022 established the central principle: **a receipt is not the proof — the
proof is the verifiable record in the ledger.** A PDF/QR is only a visual
representation; authenticity is confirmed publicly against the operator's
verification page (`public_verification_url`, e.g. `/r/{reference}`).

Today those documents are *visual only*. To verify, a user must scan the QR with
a phone — even when they are already reading the PDF on the same device (desktop,
tablet, in-app viewer). The document carries a verifiable reference but does not
let the reader *act* on it. This is a gap in the verification experience the
protocol defines.

At the same time, financial documents must remain **printable, offline-valid and
reader-agnostic**: a document that only works when "interactive" would regress
the guarantees of ADR-022.

## Decision

Define a protocol-level, operator-agnostic standard: **Interactive Financial
Documents (IFD)**. Any document an operator emits that represents a transaction
or carries a TransactionProof reference (comprovativos, receipts, invoices,
settlement statements, campaign documents, exports) MUST be interactive **in
addition to** being a valid printable visual document.

"Interactive" means the document embeds **invisible, additive hyperlinks** so a
reader can verify or navigate directly, without changing the visual layout and
without ever weakening the offline/print guarantees.

### Normative rules

1. **Verification affordances (MUST).** Wherever a document shows the verifiable
   reference, it MUST be directly actionable to the public verification page:
   - the **QR area** links to `{public_verification_url}` (the QR remains fully
     scannable — the link is additive);
   - the printed **verification URL** links to the same;
   - the **transaction reference** (e.g. `BZM-Q3MP-ZQ5V`) links to the same.

2. **Identity/contact affordances (SHOULD).** Where present:
   - the operator **logo** links to the operator's home;
   - the operator **website** text links to it;
   - the operator **email** links via `mailto:`.

3. **URLs carry only a reference (MUST — security).** A verification link MUST
   contain *only* the public, non-enumerable proof reference (and the fixed
   verification host). It MUST NOT contain amount, wallet, party handles,
   signature, or any financial/PII field. The server resolves everything from
   the ledger.
   - Correct: `https://<host>/r/BZM-Q3MP-ZQ5V`
   - Forbidden: `?amount=`, `?wallet=`, `?from=`, `?to=`, `?signature=`, …

4. **Additive, invisible, layout-preserving (MUST).** Links MUST NOT alter size,
   typography, colour, spacing or position. They are annotations over existing
   content, never new visible chrome.

5. **Offline / print / reader-agnostic (MUST).** The document MUST remain a valid
   printable artifact and the QR MUST remain scannable in any reader. If a reader
   does not honour hyperlinks, the document is unaffected (scan the QR). Support
   MUST include at least: Adobe Acrobat, Chrome, Edge, Safari, Firefox, macOS
   Preview, iOS Files, Android PDF viewers.

6. **The document is never the source of truth (MUST — reaffirms ADR-022).**
   Hyperlinks, QR and any embedded hash are conveniences. The
   `/r/{reference}` page is only a *viewer* over the ledger; the ledger remains
   the sole source of truth. A document MUST state this.

### Non-normative (operator implementation freedom)

The protocol does not mandate *how* links are embedded — only that the emitted
document satisfies the rules above. An operator rendering via HTML→print (e.g.
the reference operator's Chromium pipeline) satisfies this with standard `<a href>` anchors,
which become native PDF link annotations; an operator using a PDF-object library
satisfies it with link annotations. Either is conformant.

## Rationale

- **Verification should be one tap, not one device-switch.** Most fraud vectors
  in ADR-022 come from readers *not* verifying; removing friction (a click) makes
  verification the path of least resistance while the QR still serves camera-only
  contexts.
- **Reference-only URLs** keep the ADR-022 privacy/enumeration guarantees intact:
  the wire carries nothing financial; the ledger resolves the truth.
- **Additive + invisible** means IFD never trades away print/offline validity —
  the document is strictly a superset of the ADR-022 visual document.

## Consequences

- Every operator issuing ADR-022 proofs MUST make the reference actionable in the
  emitted document. The BANZA conformance suite gains checks for: a verification
  link resolving to `/r/{reference}` (and nothing more), QR still decodable, and
  layout invariance.
- Operators gain a consistent, bank-grade document UX across the network.
- No new financial object, lifecycle, event or wire field is introduced — this is
  a document-presentation standard layered on ADR-022. (Pure operator rendering
  policy — fonts, exact link targets beyond the reference — stays with the
  operator per ADR-001.)

## Reference operator

The reference operator implements IFD in its shared Document Engine (HTML→Chromium): the receipt
template wraps the QR, verification URL, reference, logo, website and email in
anchors whose href is only `https://operator.example/r/{reference}` (or the home /
`mailto:`). See the operator implementation note
`docs/architecture/interactive-pdf-documents.md` in the reference operator's repository.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/proofs/transaction-proof.schema.json`](../../contracts/proofs/transaction-proof.schema.json)
- [`contracts/proofs/verification-response.schema.json`](../../contracts/proofs/verification-response.schema.json)
