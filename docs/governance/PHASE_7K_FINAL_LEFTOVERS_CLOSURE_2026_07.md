# Phase 7K — Final Boundary, License and Public Hardening Closure (2026-07)

**Base:** `main` `8e09f79` · **Branch:** `fix/phase-7k-final-leftovers-closure-2026-07`
**Status:** non-normative record. Closes 7J follow-ups F-08 and F-07; investigates F-05.
**No** protocol version, contract, conformance, OpenAPI, schema, API or runtime-semantics change.

## Purpose

Close the remaining boundary and public-hardening leftovers after 7J, without touching the
final repository architecture, the protocol version, M2, or any operator/certificate state.

## F-08 — wallet-native ADR language (P2 → resolved via governed errata)

Two wallet-native ADRs used operator-era "Banza wallet" wording. Corrected with the same
governed-erratum method as 7J (reframe the boundary wording; add a dated `## Erratum — 2026-07`;
ADR status, date, number and the technical decision unchanged).

### ADR-010 — Wallet-Native Payment Network Identity
- Decision line **was:** *"Banza is a wallet-native payment network …(CLAUDE.md §2.7)."*
  **now:** *"The BANZA protocol is wallet/account-native, not card-first … BANZA itself is not a wallet or a payment operator — it defines this as a binding architectural constraint that operator implementations follow."*
- All four "Banza wallet(s)" occurrences → "wallet/account" / "operator wallet/account" (topping-up, the account primitive, sender/receiver settlement).
- Added a comprehensive erratum clarifying the pervasive first-person "Banza" framing: **BANZA is not a wallet and does not operate, hold, move, settle, authorize or complete payments**; wallet/account implementations belong to operators; "Banza does X" means the protocol defines a rule operators follow. The wallet/account-native (non-card-first) constraint is unchanged.

### ADR-017 — Wallet-native merchant payments and refund source model
- "may not hold a **BANZA wallet**" → "may not hold a **wallet/account in an operator's implementation**"; "a **BANZA wallet holder** pays a merchant" → "a **wallet/account holder** … in an operator implementation".
- Added an erratum: **BANZA is not a wallet, does not custody funds, does not move funds and does not settle refunds**; the refund behaviour is protocol-level modelling for operator implementations. (This ADR already stated "BANZA defines the model; operators implement it".)

### Website snapshots
`…/ADR-017-…md` re-copied from canonical — **byte-identical**. `…/ADR-010-…md` matched canonical
**except the one depth-corrected outside-tree link to `CLAUDE.md`** (the website copy used a
deeper relative prefix, `../../../../`, than the canonical `../../`, because it sits two levels
deeper), exactly as arranged on `main` by the 7H rewrite; verified 0 broken relative links.
(Note: PHASE 7K1 later removed that `CLAUDE.md` reference from ADR-010 entirely.)

### Boundary scan (repo-wide)
After the fix, every remaining `Banza/BANZA wallet(s)` occurrence is **inside an Erratum quote
or an audit/governance report** documenting the finding — **zero live asserted claims**. No
non-negated `BANZA authorizes/completes/holds/moves/settles funds`.

## F-07 — CSP (P3 → Content-Security-Policy-Report-Only applied, non-enforcing)

`infra/banza-network/nginx/conf.d/00-security-headers.conf` now adds a **Report-Only** CSP
(observation, never blocking) alongside the five existing headers:

```
Content-Security-Policy-Report-Only:
  default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none';
  form-action 'self'; img-src 'self' data: https:; font-src 'self' data:;
  style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval';
  connect-src 'self' https:; upgrade-insecure-requests
```

- Permissive by design so it cannot break the current Next.js runtime (inline styles/scripts,
  hydration) or the BanzAI chat cross-origin calls. **Enforcing CSP remains deferred.**
- **No** external report endpoint configured (no fake endpoint); violations surface in the
  browser console. No Cloudflare / TLS / reverse-proxy routing change.
- Resulting headers: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
  Permissions-Policy, **Content-Security-Policy-Report-Only** (6 total).
- New static guard `infra/banza-network/tests/validate-security-headers.sh` asserts all six are
  declared and that CSP is Report-Only (never enforcing, no report endpoint). nginx `-t`
  syntax-validated locally.

## F-05 — GitHub license chip (P3 → investigated, deferred as manual/legal)

`LICENSE` is a **legally valid, complete Apache-2.0**: full body (sections 1–9) and
`END OF TERMS AND CONDITIONS` are present (line 164). It deviates from the SPDX template only
*after* end-of-terms: instead of the template's `APPENDIX: How to apply …` block with
placeholder fields, it carries a **filled-in application notice** (`Copyright 2024 BANZA
Protocol Contributors` + the "Licensed under the Apache License, Version 2.0" boilerplate),
and omits the `APPENDIX:` header/paragraph (178 vs 202 lines). That extra, non-template text
after end-of-terms is the most likely reason GitHub `licensee` does not match the template.

**Deferred — not edited.** A reliable fix means either (a) replacing `LICENSE` with the verbatim
SPDX Apache-2.0 template and recording the copyright in a `NOTICE` file, or (b) adding an SPDX
identifier — both are copyright-placement / legal decisions that should be human-reviewed on a
legal file, not automated. The license grant is already valid; only the GitHub chip is affected.
Documentation's CC BY 4.0 note remains in `README`.

## Files changed

- `decisions/adr/ADR-010-wallet-native-identity.md`, `decisions/adr/ADR-017-wallet-native-payment-refund-source-model.md` — errata + boundary wording.
- `website/content/decisions/adr/ADR-010-…md`, `…/ADR-017-…md` — byte-identical snapshots.
- `infra/banza-network/nginx/conf.d/00-security-headers.conf` — CSP Report-Only + comment.
- `infra/banza-network/tests/validate-security-headers.sh` — new static header guard.
- `docs/governance/PHASE_7K_FINAL_LEFTOVERS_CLOSURE_2026_07.md` — this report.

## Not changed

`VERSION`, protocol v1.0, contracts payloads/OpenAPI/schemas semantics, conformance vectors,
services runtime, Postgres/data, `.env`, secrets, DNS, Cloudflare, TLS, LICENSE (deferred),
ADR/RFC status/numbering. No enforcing CSP. No M2, operator or certificate.

## Checks

`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · **`validate-security-headers.sh`** · 0 broken links ·
JSON/YAML/OpenAPI valid · website build 79/79 · boundary scan: 0 live wallet/funds claims.

## Deploy plan

Website (ADR pages changed) → rebuild + recreate the website container only. Reverse-proxy →
sync the updated `00-security-headers.conf` into the runtime nginx (backup first) and
`nginx -s reload` (no container recreate). **Never** recreate verification-api, banzai-api or
postgres; no `.env`/certs/DNS/Cloudflare change.

## Follow-ups remaining

- **F-05** (P3, manual/legal): restore the verbatim SPDX Apache-2.0 `LICENSE` (+ `NOTICE`) so
  GitHub detects the chip — human/legal review.
- **F-07** (future): after observing Report-Only violations in production, tighten and switch to
  an **enforcing** `Content-Security-Policy`.
- No P0/P1/P2 boundary (operator/wallet) findings remain open.
