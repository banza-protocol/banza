# Phase 7L — GitHub License Chip Restoration (2026-07)

**Base:** `main` `70c53a1` · **Branch:** `fix/phase-7l-license-chip-restoration-2026-07`
**Status:** non-normative record. Repo/licensing only — **no** protocol, `VERSION`, contract,
conformance, OpenAPI, schema, service, website-runtime, VM or deploy change.

## Objective (F-05)

Make GitHub detect the repository license as **Apache-2.0**, without changing the project's
legal intent. 7K deferred this as P3 and hypothesised the `LICENSE` was a valid Apache-2.0 whose
only defect was a filled-in application notice after `END OF TERMS AND CONDITIONS`.

## Diagnosis (the defect was larger than hypothesised)

Auditing the old `LICENSE` against two independent, pristine Apache-2.0 templates
(`node_modules/**/LICENSE`) showed the file was **not** a verbatim Apache-2.0:

- The header, section numbering and `END OF TERMS AND CONDITIONS` were present, **but the body
  text of sections 1–9 was paraphrased/modified throughout** — e.g. a shortened "Contribution"
  definition, a reworded §7 Disclaimer of Warranty (lower-case "title, non-infringement,
  merchantability" instead of the standard "TITLE, NON-INFRINGEMENT, MERCHANTABILITY…"), and a
  §9 that **omitted the standard indemnification clause** ("You may act only on Your own behalf
  and on Your sole responsibility…").
- After `END OF TERMS AND CONDITIONS` it carried a **filled-in** notice
  (`Copyright 2024 BANZA Protocol Contributors` + the "Licensed under the Apache License…"
  boilerplate) instead of the standard `APPENDIX: How to apply…` with the `[yyyy] [name of
  copyright owner]` placeholder. 178 lines vs the standard 201.
- No CC BY 4.0 text and no dual-license prose inside `LICENSE`.

That paraphrased body — not just the appendix — is why GitHub `licensee` did not match the
template. It was also a latent **legal** issue: a modified text under the Apache-2.0 name is not
the Apache-2.0 license.

## Decision applied

Replaced `LICENSE` with the **verbatim standard Apache License 2.0 template** (201 lines: full
unmodified body + `END OF TERMS AND CONDITIONS` + `APPENDIX` with the `[yyyy] [name of copyright
owner]` placeholder). Source: a pristine, unmodified Apache-2.0 template already present in the
tree (`node_modules`), cross-verified byte-for-byte against a second independent template; the
restored file contains the standard §7 disclaimer and §9 indemnification clauses that the old one
lacked, and **no** project-specific copyright, CC BY prose or institutional text.

- **`NOTICE`** (new) carries the project copyright moved out of `LICENSE`:
  `BANZA Protocol` / `Copyright 2024 BANZA Protocol Contributors` / a one-line attribution.
- **`docs/governance/licensing.md`** (new) records the policy: code/contracts/spec under
  Apache-2.0 (`LICENSE` + `NOTICE`); public documentation under CC BY 4.0 **as already stated in
  the README** (formal per-file marking is a governance follow-up — not invented here).
- **`README`** now has a `## License` section pointing to `LICENSE`, `NOTICE` and `licensing.md`.

## License detection

`licensee` is not installed locally, so detection was validated **structurally**: the new
`LICENSE` is byte-identical to a known-pristine Apache-2.0 template, contains only the standard
template (no custom text), and `NOTICE` holds the copyright. GitHub's `licensee` reliably detects
this exact template. Post-merge, `gh repo view banza-protocol/banza --json licenseInfo` is used to
confirm; if GitHub has not re-indexed yet, this is reported as **pending GitHub license cache**
(the file is standard).

## Files changed

`LICENSE` (restored to standard) · `NOTICE` (new) · `README.md` (License section) ·
`docs/governance/licensing.md` (new) · `docs/governance/PHASE_7K1_…md` (fixed one latent
broken-link quote) · this report. **No** `contracts/`, `conformance/`, `spec/`, `decisions/`,
`services/`, `infra/`, `website/`, `VERSION`, `.env` or secrets change.

## Confirmations

No protocol semantics changed. `VERSION=1.0.0` · protocol **v1.0**. `/operators=[]` and
`production_certificates=false` are conceptually unchanged (not touched). BanzAI mock untouched.
No runtime change, **no deploy**, no VM/DNS/Cloudflare/TLS/secrets change. No M2, operator or
certificate.

## Remaining risks / recommendations

- The **actual license grant changed** relative to the previous file — but in the correct
  direction: the repository now carries the **true** Apache-2.0 text instead of a modified
  paraphrase. Maintainers should be aware the prior file was non-standard.
- Optional future: formalise the documentation CC BY 4.0 policy (a docs license file or per-file
  SPDX markers) through governance.
- If the GitHub chip does not appear immediately, allow for licensee re-index / cache before any
  further change.
