# M2.19G — Forbidden-Terms Compliance

**The full retired-vocabulary list, each with its enforcing guard and verified-absent status on the public surface**

**Status:** COMPLETE · Supporting report to `M2_19G_PUBLIC_SURFACE_RECONSTRUCTION_REPORT.md`

M2.19G's correctness rests on the retired vocabulary being gone from the *live* public surface
(`website/app/**`, `website/components/**`, `website/content/**`, `website/lib/**`) while it may legitimately
survive in three places: `docs/reports/**` and governance history that **document the removals**, ADR files
that name a retired concept as a **superseded record**, and lines that name a term inside a **negation,
absence marker or guillemet quotation** (naming the boundary is not asserting the term). Each forbidden
framing below is bound to the guard that keeps it out of live copy.

Status legend: **ABSENT** = no live public source/content hit; **QUALIFIED** = replaced by the correct
current phrasing; **SCOPE-ONLY** = the token survives only in its still-valid technical meaning.

---

## Forbidden framing → enforcing guard → status

| # | Forbidden framing (retired) | Enforcing guard(s) | Live public status |
|---|---|---|---|
| 1 | `BanzAI Web` (product brand) | `check-website-public-copy-current.sh` (`RETIRED_CASE`), `check-banzai-single-interface.sh` | **ABSENT** — survives only in removal reports. |
| 2 | standalone `Validation Workbench` / `workbench de validação` | `check-website-public-copy-current.sh` (`RETIRED_ANY` `\bWorkbench\b`), `check-banzai-single-interface.sh` | **ABSENT** — the only residue is the non-user-visible `workbenchDeepLinkAbsolute` identifier in `banzaiValidation.ts`. |
| 3 | `/banzai/validar` route | `check-banzai-single-interface.sh` | **ABSENT** — 404, no redirect/rewrite/alias/sitemap/SW entry (M2.19E/F.2). |
| 4 | `BanzAI Agent` / `Assistente` (retired identity nouns) | `check-website-public-copy-current.sh` (`RETIRED_CASE`) | **ABSENT** — "BanzAI — agente do protocolo" is the current form. |
| 5 | L0–L4 as public certification **levels / tiers** | `check-public-surface-clean.sh`, SVG guards (`svg-visual-system-check`), reference IA guard | **SCOPE-ONLY** — L0–L4 kept only as conformance **scope** (ADR-021 `scope_levels`); the levels/tiers framing removed from reference ch.7/8 and the SVGs. |
| 6 | Operador Zero as **simulador** (executing) | `check-operator-zero-public-hardening.sh`, `check-operator-zero-realistic-journey.sh`, `check-public-surface-clean.sh` | **ABSENT** as current copy — read-only reference model (ADR-067). ADR-052 file/title keeps "simulator" as a superseded archival record. |
| 7 | interactive / mutable Operador Zero **ledger** | `check-operator-zero-public-hardening.sh`, boundary doc + `operator-zero-check` | **ABSENT** — read-only, non-mutable "exemplo de ledger". |
| 8 | `100/100` score / `score` field | `check-operator-zero-public-hardening.sh`, `check-public-surface-clean.sh` | **ABSENT** — `score` deleted from the status JSON; a read-only reference produces no score. |
| 9 | `PASS demo` as a status | `check-operator-zero-public-hardening.sh`, `check-website-public-copy-current.sh` | **ABSENT** — replaced by "evidência técnica local". |
| 10 | old **7-step** operator journey | `check-operator-zero-realistic-journey.sh`, `check-banzai-single-interface.sh` | **ABSENT** — the canonical 9-step BanzAI journey. (The "sete passos" developer-flow SVG is a different, legitimate concept.) |
| 11 | BanzAI **as a layer** ("camada oficial") | `check-public-surface-clean.sh`, `check-reference-information-architecture.sh` | **ABSENT** — BanzAI is transversal, not a layer (ADR-059 D-059-04). ADR-002/041 keep the old wording only as superseded records. |
| 12 | entity/operator **certificate** ("operador certificado", "certificado de operador") as an active claim | `check-website-public-copy-current.sh` (`OPERATOR_CERT` + `OPERATOR_CERT_OK`), `check-public-surface-clean.sh` (entity form + guillemet clearing) | **ABSENT** as an active claim — survives only in negation / absence / guillemet mentions ("sem operador certificado em produção"; registry-is-NOT-this). L2 certifies implementations, not entities. |
| 13 | central **certificate authority** / `BANZA CA` / `autoridade certificadora` | `check-website-public-copy-current.sh` (`RETIRED_CASE` `BANZA CA`, `Certificate Authority`), identity/trust guards | **ABSENT** — only negations ("ausência de autoridade certificadora", "trust model without CA"). No public page presents a BANZA CA. |
| 14 | `/certificates` route language | `check-public-surface-clean.sh`, reference/registry copy | **ABSENT** — replaced by the Technical Registry (ADR-065); `postgresql-service-access` SVG no longer shows `/certificates`; root README's status row rewritten. |
| 15 | absolute **"sem acordos bilaterais"** hero | home guards (`check-homepage-final-*`), `check-website-public-copy-current.sh` | **QUALIFIED** — "sem reconstruir integrações técnicas bilaterais entre cada par" on `layout.tsx`, `page.tsx` and the reference. Remaining bare "acordos bilaterais" occurrences are the Pix/UPI *rationale* (the term as subject of the argument), not an absolute product claim. |
| 16 | **four / five layers** (canonical is three) | SVG guards, `check-public-surface-clean.sh` | **ABSENT** — three-layer canonical everywhere; `banza-trust` `<desc>` corrected ("cinco níveis", not layers). ADR-056 keeps a historical mention as a superseded record. |
| 17 | `mock provider` / `modo demonstração` / `llm_calls = 0` / `default blocked` / `Qwen preview` | `check-website-public-copy-current.sh` (`RETIRED_ANY`) | **ABSENT** — none on the live surface. |
| 18 | `bancos/fintechs integradas`, `autorizado/aprovado/reconhecido pelo BNA`, `rede em directo` | `check-regulatory-state-claim-check` (Rust) family + `check-public-surface-clean.sh` | **ABSENT** — 0 live hits (regulatory-state is `REGULATORY_AUTHORIZATION_IN_PROGRESS`, real money off). |

---

## Cross-cutting enforcement (M2.19G new guards)

Beyond the per-term guards above, M2.19G adds the capstone
**`check-m2-19g-public-surface-canonical.sh`** — a negation-aware aggregate sweep over the whole rendered
public surface (`website/app/**/page.tsx`, `components/**`, `BANZA_REFERENCIA.md`,
`lib/{site,reference,decisions}.ts`) that asserts **zero positive claims** of the retired-framing list
(items 1–16 above), that the three-layer vocabulary is present, and that the hero is the qualified form
(item 15). The three owner-page guards (`check-certification-page.sh`, `check-technical-registry-page.sh`,
`check-glossary-page.sh`) additionally lock the retired-framing absence and the canonical content of each
new page. See `M2_19G_GUARD_CONVERGENCE.md`.

## Where retired terms legitimately survive

- **`docs/reports/**`** — this report set and the M2.19E/F.2 / naming-canonicalization / route-removal
  reports quote retired literals to document their own removal. Commit `3dc0c44` explicitly exempts
  `docs/reports` from the `banzai-single-interface` brand scan for exactly this reason.
- **ADR files** — ADR-002/041 (BanzAI framing), ADR-052 (Operador Zero simulator), ADR-038/039/057/058
  (INV-TRUST removal), ADR-056 (four/five layers) name retired concepts as **superseded records**; the
  guards clear a term on a line carrying a deprecation/negation marker.
- **Stable archival identifiers** — the ADR-052 *filename*
  (`ADR-052-operador-zero-reference-payment-operator-simulator.md`) keeps "simulator" as a stable id; the
  `workbenchDeepLinkAbsolute` code identifier is non-user-visible.
- **`artifacts/m2-19g/**`** — the Gate-0 audit records quote the retired live-surface strings they found
  (that was their job); allowlisted in the Rust identity guard as evidence records.

## Verdict

Every retired framing is bound to at least one enforcing guard and is absent (or correctly scope-only /
qualified) on the live public surface. The only survivals are removal-documentation, superseded ADR
records, stable archival identifiers and the Gate-0 audit — each explicitly accounted for by a guard
clearing rule or an identity-allowlist entry.
