# Phase 7J — Operator-Boundary Errata + GitHub Metadata (2026-07)

**Base:** `main` `005820b` · **Branch:** `fix/phase-7j-operator-boundary-errata-and-metadata-2026-07`
**Status:** non-normative record. Resolves 7I findings F-01, F-02, F-06; applies F-03/F-04;
investigates F-05. **No** protocol version, contract, conformance, API, schema or runtime change.

## Purpose

Remove the operator-era wording that made canonical decision documents read as if BANZA
itself moves money or operates wallets, without altering the architecture applied in 7H and
without rewriting the decisions themselves. Corrections are made as **governed errata**:
the offending sentence is reframed to the protocol boundary and a dated `## Erratum — 2026-07`
section records the change. Statuses, numbering and the architectural decisions are unchanged.

## F-01 — `decisions/adr/ADR-006` (P1)

- **Was:** *"Banza moves money on behalf of merchants and their customers."* (Context) — publicly rendered at `/decisoes/adr-006`.
- **Now:** *"BANZA defines the protocol rules, contracts and evidence for operator implementations; it does not move, hold, settle or custody funds. Operators — not BANZA — move money and interact with funds under their own legal, technical and operational responsibilities. In an operator that implements this protocol, every movement … must be: auditable / reconcilable / correct."*
- Added `## Erratum — 2026-07`. ADR status **Accepted** unchanged; ledger decision (double-entry, integer minor units, immutable postings) unchanged.

## F-02 — `decisions/rfc/RFC-0006` (P2)

- **Was:** *"Define a protocol by which Banza wallets can authorize and complete payments…"* (Summary) — publicly rendered at `/decisoes/rfc-0006`.
- **Now:** *"Define a protocol by which operator-controlled wallet or account implementations can authorize and complete payment flows … BANZA itself is not a wallet and does not authorize or complete payments."*
- Added `## Erratum — 2026-07`. RFC remains a proposal/discussion; status unchanged.

## F-06 — `examples/README.md` (P3)

- Normative-truth pointer now names **`spec/`, `contracts/` and `conformance/`** (was `contracts/` + `conformance/`).
- Framing strengthened: examples are *"not production code, not SDKs, and not operator implementations … use no real funds and certify nothing."*

## F-03 / F-04 — GitHub metadata (P2, applied via repo settings, not this branch)

- **Description:** `Open financial protocol for programmable payments, operators, wallets, settlement, and certification.` → **`Open protocol for financial interoperability and conformance.`**
- **Topics:** removed `wallet`, `wallet-native`, `settlement`, `fintech`, `digital-payments`, `payments`, `kwanza`, `africa`; final set = `protocol, open-protocol, financial-interoperability, conformance, openapi, payments-protocol, financial-infrastructure, ledger, governance, angola, banza, banzai`.

## F-05 — GitHub license chip (P3, investigated, deferred)

`LICENSE` is valid Apache-2.0 (correct header, **no** dual-license/CC pollution) but
**non-standard**: the informational `APPENDIX: How to apply the Apache License` and the
boilerplate copyright notice were trimmed (178 vs ~202 lines), which likely lowers GitHub
licensee's detection confidence. Because `LICENSE` is a legal document, it is **not modified
here**. Recommendation (dedicated, human-reviewed change): restore the verbatim canonical
Apache-2.0 template including the APPENDIX, keep documentation's CC BY 4.0 note in `README`
(and optionally a `NOTICE`).

## F-07 — CSP (P3, deferred by design)

Not touched this phase. Five security headers remain present (HSTS, `x-content-type-options`,
`x-frame-options`, `referrer-policy`, `permissions-policy`); CSP absent. Future recommendation:
introduce `Content-Security-Policy-Report-Only` first, then enforce. No Cloudflare / nginx /
reverse-proxy change.

## New finding — F-08 (P2, recommend PHASE 7K)

The 7J claims scan surfaced additional pre-existing operator-era "Banza wallet" wording in
two wallet-native ADRs **outside this phase's authorized scope**:
`decisions/adr/ADR-010-wallet-native-identity.md` (e.g. "The Banza wallet is the single
account primitive"; "when both sender and receiver are Banza wallets, settlement is a ledger
write") and `decisions/adr/ADR-017-wallet-native-payment-refund-source-model.md` ("a BANZA
wallet holder pays a merchant"). These are a larger semantic surface than a single sentence and
were **not** edited here. Recommend a dedicated **PHASE 7K — wallet-native ADR language
normalization** (same governed-erratum method), to reframe "the wallet primitive defined by the
BANZA protocol" vs. an operator's wallet.

## Website synchronization

`website/content/decisions/adr/ADR-006-…md` and `…/rfc/RFC-0006-…md` are **byte-identical**
snapshots of the canonical files (verified); both were updated by copying the corrected
canonical documents. `website/lib/decisions.ts` carries no offending wording (paths /
canonicalUrl already correct since 7H) — unchanged.

## Validation

`purity-check` · `identity-check` · `invariant-check` PASS · `reference-svg-check` 27/27 ·
`validate-compose.sh` PASS · 0 broken links · JSON/YAML/OpenAPI valid · website build OK ·
exact old phrases repo-wide = 0.

## Scope (unchanged)

Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` ·
BanzAI **mock** (`llm_calls=0`). No contract/conformance/schema/OpenAPI/API/runtime change;
no ADR/RFC status change, renumbering or new decision; no `.env`, secret, DNS, Cloudflare,
TLS, Postgres or services-runtime change.
