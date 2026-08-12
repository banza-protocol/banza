# Governance & Getting-Started Hardening Matrix (2026-07)

**Base:** `main` `6433bb9` · **Phase:** 7U · Final operator-era / certification-heavy wording cleanup
of three auxiliary documents. **Result: 0 BLOCKED · 0 MANUAL_REVIEW_REQUIRED.**

7T repaired the broken links in these files; opening them revealed operator-era residues (reference
operator as a current entity, sandbox operator, certification suite, certified payment operators,
"become a certified operator", "Apply for certification", live "BANZA CA issues a signed
certificate", "joins the public registry", instant settlement, Consumer/Merchant Wallet product
framing, "Any operator may build on it"). 7U aligns them with the already-hardened README.md /
conformance/README.md / spec/overview.md vocabulary.

| Path | Public-facing | Issue found | Action applied | Remaining risk | Institutional-ready |
|---|---|---|---|---|---|
| `docs/governance/README.md` | Yes (GitHub) | Reference-operator as current entity (Operator Independence ×5, Operators section ×1); "certification framework/suite/vector"; "Banza" mixed-case; ecosystem-boundaries table "infrastructure layer", "protocol modules: ledger, wallets, routing, settlement", "Provider trait definitions", "Reference implementations: … sandbox operator", "Certification suite"; "Any operator may build on it"; "certified implementation" | reference-operator → "not owned/governed by **any operator**", "**No operator implementation** controls the conformance or certification-governance framework", "**does not contain a reference operator**"; header → "**BANZA Protocol Governance**"; layer → "**protocol specification layer**"; rows → "Protocol specification domains: ledger, wallet/account model, routing semantics, acquiring, **settlement boundary**, QR", "Provider interface definitions (operator-neutral abstractions)", "**Illustrative examples** … no reference operator and no sandbox operator ship from this repository", "**Conformance suite** … technical evidence, not certification"; "certification framework/vector" → "conformance and certification-governance framework / conformance vector"; "Any operator may build on it" → "**Candidate operator implementations may build on the public protocol materials, subject to applicable legal, regulatory, banking, KYC/KYB and governance requirements**"; added a top **pre-production boundary note** (governance docs do not certify/approve/replace legal obligations; no certified operator; no active production certificate; M2/M3) | none | ✅ PASS_WITH_FIX + PASS_WITH_PRUDENCE_HARDENING |
| `docs/reference/getting-started.md` | Yes (GitHub) | "how to **become a certified operator**"; "certified payment operators"; Step 6 "**Apply for certification**" with a live `POST …/certification/apply`; "the BANZA CA **issues** a signed certificate … **joins the public registry**"; "Certification path"; "instant settlement"; "External payment network integration"; "Certification framework"; "certification blocker" | Title/intro → "prepare a candidate implementation for BANZA conformance evidence and future governance review"; "**independently operated implementations**"; Step 6 → "**Prepare conformance evidence for governance review**" + endpoint marked "**illustrative, not a live endpoint**" + "**When production certification opens** …"; issuance → "**If production certification opens, the BANZA CA may issue a certificate through the applicable governance process; if approved … may be listed in the applicable public registry. No operator is certified today.**"; "**Conformance & certification path (pre-production)** … future production certification flow … not a live onboarding flow"; "instant (T+0) settlement"; "External-rail integration"; "conformance blocker"; added a top **pre-production guide note** | none | ✅ PASS_WITH_FIX + PASS_WITH_FUTURE_GOVERNANCE_QUALIFIER |
| `spec/README.md` | Yes (GitHub) | "Certification framework (L0–L4)"; "**Consumer Wallet ──▶ Merchant Wallet**"; "canonical UX: SCAN QR → CONFIRM → **INSTANT SETTLEMENT**" | "Conformance & certification-governance framework (L0–L4)"; "**Payer account/wallet ──▶ Payee account/wallet**"; "canonical protocol flow: SCAN QR → CONFIRM → **SETTLEMENT (T+0 finality invariant)**" + note "**This is a protocol-level model. BANZA does not operate wallets, move funds, execute settlement, or provide operational latency; those are operator responsibilities.**" | none | ✅ PASS_WITH_FIX + PASS_WITH_PRUDENCE_HARDENING |

## Accepted remaining occurrences (classified, not fixes)

| Occurrence | File(s) | Classification |
|---|---|---|
| "does **not** contain a reference operator" | gov/README L16 | OK_NEGATED |
| "no reference operator and no sandbox operator ship from this repository" | gov/README L140 | OK_NEGATED |
| Replacement-vocabulary "reference operator" (identity-guard brand→role table) | gov/README L255 | OK_CANONICAL (matches root CLAUDE.md; a permitted generic role term, not a current-entity claim) |
| `ADR-010-wallet-native-identity.md` (link target) | spec/README | OK_CANONICAL_FILENAME (real file) |

## Out-of-scope follow-up (not fixed in 7U)

- `README.md:154` "Read the certification framework" and `docs/reference/en/complete.md` L31/L157
  "certification framework" — pre-existing descriptive labels for the certification-boundary doc,
  **not** current-tense operator claims, not introduced by 7U, not P0/P1. Left unchanged to respect
  the phase scope (do not reopen 7S/README beyond necessity); flagged as an optional future
  consistency micro-fix.

## Notes

- **The sweep tooling was validated** (zsh array + fixed-string per file; link checker prints a
  259-links / 18-controls self-test) before trusting any "0" — consistent with the 7S/7T lesson.
- **No website consumption.** None of the three files has a `website/content` snapshot; the website
  reference only *names* `docs/governance/README.md` in a reading list (does not embed its content),
  so no website snapshot update or deploy is required.
