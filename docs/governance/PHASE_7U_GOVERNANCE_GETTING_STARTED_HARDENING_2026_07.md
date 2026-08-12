# Phase 7U — Governance and Getting Started Institutional Hardening (2026-07)

**Base:** `main` `6433bb9` · **Branch:** `fix/phase-7u-governance-getting-started-hardening-2026-07`
**Status:** documentation hardening. Removes the last operator-era / certification-heavy wording from
three auxiliary documents. **No** protocol version, contract, conformance-vector, OpenAPI, schema,
service, runtime, VM or secrets change.

## Objective

7S made the primary public documents institutional; 7T closed the broken relative links. Opening the
three auxiliary files during 7T revealed remaining operator-era residues. This phase corrects **only
those residues** in:

- `docs/governance/README.md`
- `docs/reference/getting-started.md`
- `spec/README.md`

aligning them with the already-hardened `README.md`, `SECURITY.md`,
`docs/governance/REPOSITORY_STRUCTURE.md`, `docs/reference/en/complete.md`,
`docs/reference/pt/completa.md`, `conformance/README.md`, `contracts/README.md`, `spec/overview.md`.
It does **not** change the protocol, contracts, conformance vectors, APIs or runtime; it does **not**
activate M2; it does **not** create an operator or certificate.

## Corrections by file

### docs/governance/README.md
- **Reference-operator-as-current-entity removed.** The Operator Independence bullets now read "not
  owned/governed by **any operator**", "**No operator implementation** controls the conformance or
  certification-governance framework", and "**This repository does not contain a reference
  operator**"; the Operators section drops "certified implementation" → "independent implementation"
  and reframes "The reference operator implements …" → "Any operator implements the same public
  protocol contracts as any other".
- **Certification → conformance/governance:** "certification framework/suite/vector" →
  "conformance and certification-governance framework" / "Conformance suite" / "conformance vector";
  neutrality list "Certification levels (L0–L4)" → "Conformance levels and certification-governance
  framework (L0–L4)".
- **Ecosystem-boundaries table de-operator-ized:** header "infrastructure layer" → "**protocol
  specification layer**"; "protocol modules: ledger, wallets, routing, … settlement" → "Protocol
  specification domains: ledger, wallet/account model, routing semantics, acquiring, **settlement
  boundary**, QR"; "Provider trait definitions" → "Provider interface definitions (operator-neutral
  abstractions)"; "Reference implementations: … sandbox operator" → "**Illustrative examples** …
  **no reference operator and no sandbox operator ship from this repository**"; "Certification
  suite" → "Conformance suite … technical evidence, not certification".
- **"Any operator may build on it"** → "**Candidate operator implementations may build on the public
  protocol materials, subject to applicable legal, regulatory, banking, KYC/KYB and governance
  requirements**".
- **Header** "Banza Governance" → "**BANZA Protocol Governance**"; all bare "Banza" → "BANZA".
- **Added a top pre-production boundary note:** these governance documents do not certify operators,
  do not approve production deployment, and do not replace legal/regulatory/banking/KYC-KYB/AML-CFT
  obligations; currently no certified operator and no active production certificate; production
  certification/federation depend on M2/M3.

### docs/reference/getting-started.md
- Title/intro "how to **become a certified operator**" → "prepare a candidate implementation for
  BANZA conformance evidence and future governance review"; "certified payment operators" →
  "independently operated implementations".
- Added a **pre-production guide note** at the top (does not certify / approve production / replace
  legal obligations; no certified operator today; M2/M3).
- Step 6 "**Apply for certification**" → "**Prepare conformance evidence for governance review**";
  the `POST …/certification/apply` example is now explicitly "**illustrative, not a live endpoint**"
  and gated on "**When production certification opens**"; "the BANZA CA issues a signed certificate …
  joins the public registry" → "**If production certification opens, the BANZA CA may issue a
  certificate through the applicable governance process; if approved … may be listed in the
  applicable public registry. No operator is certified today.**".
- "Certification path" → "**Conformance & certification path (pre-production)** … future production
  certification flow … not a live onboarding flow"; "instant settlement" → "instant (T+0)
  settlement"; "External payment network integration" → "External-rail integration"; "certification
  blocker" → "conformance blocker"; resource label "Certification framework" → "Conformance &
  certification governance".

### spec/README.md
- "Certification framework (L0–L4)" → "Conformance & certification-governance framework (L0–L4)".
- Canonical operation "**Consumer Wallet ──▶ Merchant Wallet**" → "**Payer account/wallet ──▶ Payee
  account/wallet**"; "canonical UX: SCAN QR → CONFIRM → **INSTANT SETTLEMENT**" → "canonical protocol
  flow: SCAN QR → CONFIRM → **SETTLEMENT (T+0 finality invariant)**", with the note "**This is a
  protocol-level model. BANZA does not operate wallets, move funds, execute settlement, or provide
  operational latency; those are operator responsibilities.**".

## Sweeps

- **Per-file sweep (3 files):** 4 remaining hits, all OK — two negations ("does not contain a
  reference operator", "no reference operator and no sandbox operator ship from this repository"),
  one identity-guard replacement-vocabulary entry (OK_CANONICAL), and the same-line sandbox negation.
  **0 NEEDS_FIX / 0 MANUAL_REVIEW.**
- **Repo-wide regression sweep:** 3 pre-existing "certification framework" descriptive labels in
  `README.md:154` + `docs/reference/en/complete.md` L31/L157 — **not** introduced by 7U, not
  current-tense operator claims, not P0/P1 → FOLLOW_UP, left unchanged to keep 7U scoped (do not
  reopen 7S/README beyond necessity).
- **Old-path sweep:** 0 in the changed files.

## Broken links

Fence-aware checker (self-test: 259 links tested, 18 positive controls) → **0 broken relative links**
repo-wide, before and after.

## Website snapshots

None required. No `website/content` snapshot exists for any of the three files; the website reference
only *names* `docs/governance/README.md` in a reading list (does not embed its content). **No website
deploy.**

## Checks

`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` · JSON/YAML/OpenAPI valid · website build ·
broken relative links = 0.

## Deploy plan

No website-consumed file changed → **no container rebuild/redeploy**. VM repo fast-forwarded to
`main` for consistency (inert `git pull`, no rebuild), preserving all container uptime.

## Remaining risk

None in the three target documents. One optional out-of-scope follow-up (the "certification
framework" descriptive label in README/EN reference), flagged, not fixed here.

## Verdict

`docs/governance/README.md`, `docs/reference/getting-started.md` and `spec/README.md` no longer carry
operator-era or certification-heavy language in a current tense; all use candidate implementation,
conformance evidence, future governance, pre-production and protocol-boundary framing. Broken links
remain 0; protocol remains v1.0 / `VERSION=1.0.0`; no public regression.
