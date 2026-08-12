# M2.7M — License, Notice, Trademark and Open Governance Attribution Audit

- **Date:** 2026-07-19
- **Scope:** align the repository's license, attribution, notices, trademarks and governance with the
  actual institutional and architectural reality: BANZA is an **open financial protocol**, originally
  created by **BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.**, and governed **today** through the public GitHub
  repository.

## Files audited

| File | State | Action |
|---|---|---|
| `LICENSE` | Apache License 2.0, canonical (201 lines, unmodified template) | **Keep as-is** (no institutional narrative inside the license body) |
| `NOTICE` | Exists — "Copyright 2024 BANZA Protocol Contributors" (generic, no Banzami attribution) | **Update** — Banzami as original creator + open-protocol + trademark carve-out |
| `COPYRIGHT` | Absent | Not required (attribution lives in `NOTICE`) |
| `README.md` | Exists; describes open protocol; **no Banzami origin**, no explicit "governance is open today", no trademark note | **Update** — origin, open governance, Banzami role, Apache-2.0, trademark note, links |
| `GOVERNANCE.md` | **Absent** | **Create** — open governance through GitHub, origin, mechanisms, who decides |
| `CONTRIBUTING.md` | Exists (122 lines) | **Update** — contribution licensing + open-governance sections |
| `MAINTAINERS.md` | **Absent** | **Create** — institutional origin, active maintainers, become/remove, Banzami role |
| `TRADEMARKS.md` | **Absent** | **Create** — separates open-source license from trademark use |
| `SECURITY.md` | Exists | No change needed |
| `CODE_OF_CONDUCT.md` | Exists | No change needed |
| `docs/governance/licensing.md` | Exists — descriptive licensing record (Apache-2.0 code + CC BY 4.0 docs) | Cross-reference from new docs; no change required |
| Website footer / pages | No `/governanca`, `/licenca` public pages; footer lacks License/Governance/Trademarks links | **Add** governance + license pages + footer links |
| Reference (Governança chapter, FAQ) | No origin/maintenance/open-governance section; no Banzami/trademark FAQ | **Add** section + 7 FAQ Q&A |
| SPDX headers | Not used as a repo-wide convention | Document policy in CONTRIBUTING; do not mass-add |

## Answers to the audit questions

1. **Current license?** Apache License 2.0 (canonical) for code/contracts/spec; docs stated as CC BY 4.0.
2. **NOTICE exists?** Yes, but generic (no Banzami attribution). → updated.
3. **Trademark policy?** No. → `TRADEMARKS.md` created.
4. **Public governance doc?** No standalone `GOVERNANCE.md`. → created.
5. **Maintainers doc?** No. → `MAINTAINERS.md` created.
6. **README explains Banzami origin?** No. → added.
7. **README explains governance is already open via GitHub?** Not explicitly. → added.
8. **Website explains BANZA/Banzami without closing the protocol?** No. → `/governanca` + `/licenca` added.
9. **Language suggesting permanent private control?** None found. Guard added to prevent it.
10. **Language suggesting free trademark use?** None found. `TRADEMARKS.md` makes the boundary explicit.
11. **Language confusing open-source license with trademark use?** None found; made explicit anyway.
12. **Language contradicting "open financial protocol"?** None found; the phase reinforces it.

## Changes / decisions

- Keep Apache-2.0 **canonical and unmodified**; institutional attribution stays in `NOTICE`, trademark
  policy in `TRADEMARKS.md`, governance in `GOVERNANCE.md` — three separate concerns, never mixed.
- Attribution: **Copyright © 2026 BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.**; Banzami is the **original
  creator and initial institutional maintainer**; **governance is open today** through the public GitHub
  repository — not a future promise.
- The Apache-2.0 license grants no rights to the **BANZA**, **BanzAI** or **Banzami** names/logos/marks.
- New guard `make license-notice-governance-check` enforces presence + the open-governance/trademark
  wording and blocks closed-control / future-promise / trademark-in-license phrasings.

## Risks

- Over-attribution could read as private control → mitigated by explicit "open governance today" +
  "public repository processes" wording and guard-blocked phrases.
- Trademark protection could read as blocking interoperability → mitigated by an explicit permitted-use
  list ("Implements/Compatible with the BANZA protocol", forks, nominative reference).
- Touching the Apache-2.0 body → avoided entirely; license stays canonical.
