# ADR-025 — Interactive Financial Documents

**Status:** Accepted
**Date:** 2026-07-01
**Author:** BANZA Protocol
**Deciders:** Fidel Monteiro (Founder)
**Supersedes:** None
**Extends:** ADR-023 (Transaction Proof Standard), ADR-012 (QR payment system)
**See also:** ADR-005 (Protocol-first), ADR-003 (Protocol/operator separation), [BANZA-PROTOCOL-VS-OPERATOR-POLICY](../../docs/governance/BANZA-PROTOCOL-VS-OPERATOR-POLICY.md)

---

## Context

ADR-023 established the central principle: **a receipt is not the proof — the
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
the guarantees of ADR-023.

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

6. **The document is never the source of truth (MUST — reaffirms ADR-023).**
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
  in ADR-023 come from readers *not* verifying; removing friction (a click) makes
  verification the path of least resistance while the QR still serves camera-only
  contexts.
- **Reference-only URLs** keep the ADR-023 privacy/enumeration guarantees intact:
  the wire carries nothing financial; the ledger resolves the truth.
- **Additive + invisible** means IFD never trades away print/offline validity —
  the document is strictly a superset of the ADR-023 visual document.

## Consequences

- Every operator issuing ADR-023 proofs MUST make the reference actionable in the
  emitted document. The BANZA conformance suite gains checks for: a verification
  link resolving to `/r/{reference}` (and nothing more), QR still decodable, and
  layout invariance.
- Operators gain a consistent, bank-grade document UX across the network.
- No new financial object, lifecycle, event or wire field is introduced — this is
  a document-presentation standard layered on ADR-023. (Pure operator rendering
  policy — fonts, exact link targets beyond the reference — stays with the
  operator per ADR-003.)

## Reference operator

The reference operator implements IFD in its shared Document Engine (HTML→Chromium): the receipt
template wraps the QR, verification URL, reference, logo, website and email in
anchors whose href is only `https://operator.example/r/{reference}` (or the home /
`mailto:`). See the operator implementation note
`docs/architecture/interactive-pdf-documents.md` in the reference operator's repository.
